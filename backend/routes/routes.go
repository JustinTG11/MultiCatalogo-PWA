// Paquete routes: única responsabilidad, registrar los endpoints de la API.
package routes

import (
	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/controllers"
)

// Dependencias son los controladores ya construidos (con sus repositorios inyectados) que
// main.go entrega a las rutas. routes no crea nada: solo conecta URLs con handlers.
type Dependencias struct {
	Auth          *controllers.AuthController
	Register      *controllers.RegisterController
	Health        *controllers.HealthController
	Productos     *controllers.ProductoController
	Red           *controllers.RedController
	Checkout      *controllers.CheckoutController
	Pedidos       *controllers.PedidosController
	Comisiones    *controllers.ComisionesController
	Liquidaciones *controllers.LiquidacionesController
	Reportes      *controllers.ReportesController
	Usuarios      *controllers.UsuariosController
	RequireAuth   fiber.Handler // middleware que exige sesión válida
	RequireAdmin  fiber.Handler // middleware que exige rol admin
}

// SetupRoutes registra todas las rutas sobre la aplicación Fiber.
func SetupRoutes(app *fiber.App, d Dependencias) {
	app.Get("/api/health", d.Health.Health)

	// Rutas públicas
	app.Post("/api/login", d.Auth.Login)
	app.Post("/api/register", d.Register.Register)

	app.Get("/api/productos", d.Productos.GetProductos)
	app.Get("/api/productos/buscar", d.Productos.BuscarProductos) // Búsqueda server-side
	app.Get("/api/productos/:id", d.Productos.GetProductoPorID)

	// Rutas protegidas: exigen autenticación con JWT.
	// La red completa es solo para administradores (igual que Dashboard/MiRed en el frontend): 401 sin token, 403 si no es admin.
	app.Get("/api/red", d.RequireAuth, d.RequireAdmin, d.Red.GetRed)

	// Ruta protegida: primero el middleware de autenticación, luego el handler.
	app.Post("/api/checkout", d.RequireAuth, d.Checkout.Checkout)

	// Rutas admin de productos (requieren auth + admin)
	app.Get("/api/admin/productos", d.RequireAuth, d.RequireAdmin, d.Productos.GetProductosAdmin)
	app.Post("/api/admin/productos", d.RequireAuth, d.RequireAdmin, d.Productos.CrearProducto)
	app.Put("/api/admin/productos/:id", d.RequireAuth, d.RequireAdmin, d.Productos.ActualizarProducto)
	app.Delete("/api/admin/productos/:id", d.RequireAuth, d.RequireAdmin, d.Productos.EliminarProducto)

	// Alias con las rutas EXACTAS del plan (el frontend usa las /api/admin/...; ambas apuntan al mismo handler)
	app.Post("/api/productos", d.RequireAuth, d.RequireAdmin, d.Productos.CrearProducto)
	app.Put("/api/productos/:id", d.RequireAuth, d.RequireAdmin, d.Productos.ActualizarProducto)
	app.Delete("/api/productos/:id", d.RequireAuth, d.RequireAdmin, d.Productos.EliminarProducto)
	app.Get("/api/pedidos", d.RequireAuth, d.RequireAdmin, d.Pedidos.GetPedidosAdmin)
	app.Patch("/api/pedidos/:id/estado", d.RequireAuth, d.RequireAdmin, d.Pedidos.ActualizarEstadoPedido)
	app.Post("/api/liquidaciones", d.RequireAuth, d.RequireAdmin, d.Liquidaciones.Liquidar)
	app.Get("/api/liquidaciones", d.RequireAuth, d.RequireAdmin, d.Liquidaciones.GetLiquidacionesAdmin)

	// Usuarios (solo admin), paginado
	app.Get("/api/admin/usuarios", d.RequireAuth, d.RequireAdmin, d.Usuarios.GetUsuarios)
	app.Put("/api/admin/usuarios/:id/referente", d.RequireAuth, d.RequireAdmin, d.Usuarios.AsignarReferente)

	// Rutas de pedidos del usuario
	app.Get("/api/pedidos/mios", d.RequireAuth, d.Pedidos.GetPedidosMios)
	app.Get("/api/pedidos/:id", d.RequireAuth, d.Pedidos.GetPedidoPorID)

	// Rutas admin de pedidos
	app.Get("/api/admin/pedidos", d.RequireAuth, d.RequireAdmin, d.Pedidos.GetPedidosAdmin)
	app.Patch("/api/admin/pedidos/:id/estado", d.RequireAuth, d.RequireAdmin, d.Pedidos.ActualizarEstadoPedido)

	// Rutas de comisiones y red propia del usuario
	app.Get("/api/comisiones/mias", d.RequireAuth, d.Comisiones.GetComisionesMias)
	app.Get("/api/red/mia", d.RequireAuth, d.Comisiones.GetRedMia)

	// Rutas de liquidaciones
	app.Post("/api/admin/liquidaciones", d.RequireAuth, d.RequireAdmin, d.Liquidaciones.Liquidar)
	app.Get("/api/admin/liquidaciones", d.RequireAuth, d.RequireAdmin, d.Liquidaciones.GetLiquidacionesAdmin)
	app.Get("/api/liquidaciones/mias", d.RequireAuth, d.Liquidaciones.GetLiquidacionesMias)

	// Rutas de reportes (solo admin)
	app.Get("/api/reportes/resumen", d.RequireAuth, d.RequireAdmin, d.Reportes.GetResumen)
	app.Get("/api/reportes/top-productos", d.RequireAuth, d.RequireAdmin, d.Reportes.GetTopProductos)
	app.Get("/api/reportes/top-referidos", d.RequireAuth, d.RequireAdmin, d.Reportes.GetTopReferidos)
	app.Get("/api/reportes/comisiones-pendientes", d.RequireAuth, d.RequireAdmin, d.Reportes.GetComisionesPendientes)
}
