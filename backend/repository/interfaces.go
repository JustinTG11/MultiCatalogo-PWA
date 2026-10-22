package repository

import (
	"context"
	"time"

	"multicatalogo-backend/models"
)

// Interfaces pequeñas, una por responsabilidad. Los controladores y servicios dependen de ESTAS
// interfaces y no de PostgreSQL: así se pueden cambiar o simular (mocks en pruebas) sin tocar su código.

// UsuarioRepository: autenticación y registro.
type UsuarioRepository interface {
	FindUsuario(email, password string) (models.Usuario, bool, error)
	FindUsuarioPorEmail(email string) (models.Usuario, bool, error)
	CrearUsuario(req models.RegisterRequest) (models.Usuario, error)
	ReferidoPorCodigo(codigo string) (int, bool, error)
	GetUsuarios(q string, page, limit int) ([]models.UsuarioResumen, int, error)
}

// ProductoRepository: catálogo.
type ProductoRepository interface {
	GetProductos() ([]models.Producto, error)
	GetProductoByID(id int) (models.Producto, bool, error)
	GetProductosAdmin(q string, page, limit int) ([]models.Producto, int, error)
	CrearProducto(req models.CrearProductoRequest) (models.Producto, error)
	ActualizarProducto(id int, req models.ActualizarProductoRequest) (models.Producto, bool, error)
	EliminarProducto(id int) error
	BuscarProductos(query string) ([]models.Producto, error)
}

// RedRepository: árbol multinivel de referidos.
type RedRepository interface {
	GetRed(email string) (models.Referido, error)
	GetRedMia(referidoID int) (models.Referido, error)
}

// ComisionRepository: ledger de comisiones.
type ComisionRepository interface {
	GetComisionesMias(referidoID int) ([]models.Comision, models.ComisionesResumen, error)
}

// LiquidacionRepository: pagos a distribuidores.
type LiquidacionRepository interface {
	Liquidar(referidoID int) (models.Liquidacion, error)
	GetLiquidaciones(referidoID int) ([]models.Liquidacion, error)
	GetLiquidacionesAdmin() ([]models.Liquidacion, error)
}

// ReportesRepository: consultas de agregación.
type ReportesRepository interface {
	GetResumen(desde, hasta string) (models.ReporteResumen, error)
	GetTopProductos(limit int) ([]models.TopProducto, error)
	GetTopReferidos(limit int) ([]models.TopReferido, error)
	GetComisionesPendientes() ([]models.TopReferido, error)
}

// PedidoRepository: compras (transacciones ACID) y pago de comisiones.
type PedidoRepository interface {
	// CrearPedido guarda pedido, detalle y descuenta stock en UNA transacción: todo o nada.
	CrearPedido(ctx context.Context, usuario models.Usuario, req models.CheckoutRequest) (models.PedidoConfirmado, error)
	// ProcesarComisiones acredita la venta y las comisiones a los ascendentes (niveles 1, 2 y 3). Es idempotente.
	ProcesarComisiones(ctx context.Context, pedidoID, referidoID int) error
	// GetPedidosMios devuelve los pedidos del usuario (paginado).
	GetPedidosMios(usuarioID int, page, limit int) ([]models.PedidoDetalle, int, error)
	// GetPedidosAdmin devuelve todos los pedidos (paginado, opcionalmente filtrado por estado).
	GetPedidosAdmin(estado string, page, limit int) ([]models.PedidoDetalle, int, error)
	// GetPedidoPorID devuelve un pedido con sus items.
	GetPedidoPorID(pedidoID int) (models.PedidoDetalle, bool, error)
	// ActualizarEstadoPedido cambia el estado de un pedido (admin).
	ActualizarEstadoPedido(pedidoID int, nuevoEstado string) error
}

// Cache abstrae el sistema de caché (patrón Cache-Aside). La implementación real usa Redis.
type Cache interface {
	// Get devuelve true solo en Cache Hit (y deja el valor deserializado en dest).
	Get(key string, dest any) bool
	// Set guarda value (serializado a JSON) con un tiempo de expiración.
	Set(key string, value any, ttl time.Duration)
	// DeleteByPattern elimina todas las claves que coincidan con el patrón (ej. "red:tree:*").
	DeleteByPattern(pattern string)
}
