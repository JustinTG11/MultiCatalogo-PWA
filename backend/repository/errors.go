package repository

import (
	"errors"
	"fmt"
)

// ErrRedVacia indica que la tabla referidos no tiene nodo raíz.
var ErrRedVacia = errors.New("la red de referidos no tiene datos")

// ErrFallaSimulada es el error que se inyecta a propósito para demostrar el ROLLBACK en clase.
var ErrFallaSimulada = errors.New("falla simulada: caída del sistema antes de procesar los items")

// ErrCantidadInvalida: una línea del carrito trae cantidad <= 0. Es un error de datos (400),
// distinto de ErrStockInsuficiente (409): aquí el problema es la petición, no el inventario.
var ErrCantidadInvalida = errors.New("cantidad debe ser mayor que cero")

// ErrProductoNoExiste: el carrito contiene un producto que no está en la tabla productos.
type ErrProductoNoExiste struct{ ID int }

func (e *ErrProductoNoExiste) Error() string {
	return fmt.Sprintf("el producto con id %d no existe", e.ID)
}

// ErrStockInsuficiente: se pidieron más unidades de las disponibles.
type ErrStockInsuficiente struct {
	ID         int
	Nombre     string
	Disponible int
	Solicitado int
}

func (e *ErrStockInsuficiente) Error() string {
	return fmt.Sprintf("stock insuficiente de %q: disponible %d, solicitado %d", e.Nombre, e.Disponible, e.Solicitado)
}

// Errores de negocio de pedidos y liquidaciones (los controladores los traducen a 400/404).
var (
	ErrPedidoNoEncontrado = errors.New("pedido no encontrado")
	ErrTransicionInvalida = errors.New("transición de estado inválida")
	ErrSinComisiones      = errors.New("no hay comisiones pendientes para liquidar")

	// Errores al asignar el referente de un usuario (los controladores los traducen a 400/404).
	ErrUsuarioNoEncontrado = errors.New("usuario no encontrado")
	ErrUsuarioSinNodo      = errors.New("el usuario no tiene un nodo en la red de referidos")
	ErrReferenteNoExiste   = errors.New("no existe ningún referente con ese código")
	ErrReferenteInvalido   = errors.New("un usuario no puede ser su propio referente ni se puede cambiar el referente de la raíz")
	ErrCicloReferido       = errors.New("ese referente pertenece a la red de este usuario: crearía un ciclo")
)
