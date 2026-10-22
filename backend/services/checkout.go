// Paquete services: lógica de negocio que coordina varios repositorios. Los controladores
// solo hablan HTTP; el repository solo habla SQL; la orquestación vive aquí.
package services

import (
	"context"
	"log"
	"sync"
	"time"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// CheckoutService procesa compras: transacción ACID + comisiones asíncronas + invalidación de caché.
type CheckoutService struct {
	pedidos repository.PedidoRepository
	cache   repository.Cache
	wg      sync.WaitGroup // cuenta las goroutines de comisiones en vuelo (para el apagado ordenado)
}

// NewCheckoutService recibe sus dependencias como interfaces (inyección de dependencias).
func NewCheckoutService(pedidos repository.PedidoRepository, cache repository.Cache) *CheckoutService {
	return &CheckoutService{pedidos: pedidos, cache: cache}
}

// Procesar guarda el pedido de forma transaccional y, solo si el COMMIT fue exitoso,
// lanza el cálculo de comisiones en segundo plano para no hacer esperar al cliente.
func (s *CheckoutService) Procesar(usuario models.Usuario, req models.CheckoutRequest) (models.PedidoConfirmado, error) {
	// Contexto propio (no el de la petición HTTP): la compra debe terminar de forma consistente.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pedido, err := s.pedidos.CrearPedido(ctx, usuario, req)
	if err != nil {
		return models.PedidoConfirmado{}, err // ya se hizo ROLLBACK: no hay comisiones ni pedido fantasma
	}

	// La compra ya está confirmada (COMMIT): el stock cambió, así que el catálogo cacheado (productos:all)
	// queda viejo. Se invalida de inmediato (es una sola clave, no hace esperar al cliente).
	// Los árboles red:tree:* se invalidan después, cuando terminan las comisiones.
	s.cache.DeleteByPattern(repository.ClaveCacheProductos)

	// El usuario debe estar representado en la red para que sus ascendentes cobren comisión.
	if usuario.ReferidoID != nil {
		s.wg.Add(1)
		go s.calcularComisiones(pedido.ID, *usuario.ReferidoID)
	}
	return pedido, nil
}

// calcularComisiones corre en una goroutine: acredita ventas y comisiones en PostgreSQL y luego
// invalida la caché del árbol para que el Dashboard muestre los KPIs actualizados.
func (s *CheckoutService) calcularComisiones(pedidoID, referidoID int) {
	defer s.wg.Done()

	const intentos = 3
	for intento := 1; intento <= intentos; intento++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err := s.pedidos.ProcesarComisiones(ctx, pedidoID, referidoID)
		cancel()

		if err == nil {
			// Todos los árboles cacheados (red:tree:*) contienen ahora datos viejos: se eliminan.
			s.cache.DeleteByPattern(repository.PatronCacheRed)
			log.Printf("comisiones: pedido %d procesado en segundo plano", pedidoID)
			return
		}
		log.Printf("comisiones: intento %d/%d del pedido %d falló: %v", intento, intentos, pedidoID, err)
		time.Sleep(time.Duration(intento) * 500 * time.Millisecond)
	}
	// Queda pedidos.comisiones_procesadas = FALSE, así que se puede reprocesar después sin pagar doble.
	log.Printf("comisiones: ERROR, el pedido %d quedó con comisiones pendientes", pedidoID)
}

// Esperar bloquea hasta que terminen las goroutines de comisiones en curso (o hasta el timeout).
// Se llama al apagar el servidor para no perder comisiones de compras ya confirmadas.
func (s *CheckoutService) Esperar(timeout time.Duration) {
	terminado := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(terminado)
	}()
	select {
	case <-terminado:
	case <-time.After(timeout):
		log.Println("comisiones: se agotó el tiempo esperando tareas en segundo plano")
	}
}
