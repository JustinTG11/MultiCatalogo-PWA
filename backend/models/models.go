// Paquete models: estructuras de datos y contratos JSON de la API.
package models

import "time"

// ---------- Peticiones ----------

// LoginRequest es el cuerpo esperado en POST /api/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest es el cuerpo esperado en POST /api/register.
type RegisterRequest struct {
	Nombre   string `json:"nombre"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Referido string `json:"ref,omitempty"` // código de referido opcional
}

// CheckoutRequest es el cuerpo de POST /api/checkout. Los precios y el total NO viajan en la petición:
// el servidor los toma de la base de datos para que nadie pueda manipularlos desde el navegador.
type CheckoutRequest struct {
	Cliente    ClienteCheckout `json:"cliente"`
	MetodoPago string          `json:"metodoPago"`
	Items      []ItemCheckout  `json:"items"`
}

// ClienteCheckout son los datos de envío del formulario de Checkout.tsx.
type ClienteCheckout struct {
	Nombre    string `json:"nombre"`
	Email     string `json:"email"` // se ignora: el comprador es SIEMPRE el del token (ver CrearPedido)
	Direccion string `json:"direccion"`
	Ciudad    string `json:"ciudad"`
	Telefono  string `json:"telefono"`
}

// ItemCheckout es una línea del carrito: qué producto y cuántas unidades.
type ItemCheckout struct {
	ProductoID int `json:"productoId"`
	Cantidad   int `json:"cantidad"`
}

// ---------- Respuestas ----------

// LoginResponse es la respuesta exitosa de POST /api/login (misma forma que ya consume el frontend).
type LoginResponse struct {
	Token string `json:"token"`
	Email string `json:"email"`
	Rol   string `json:"rol"`
}

// Producto es un artículo del catálogo. Los campos originales (id, nombre, precio, img) se
// mantienen; descripcion, categoria y galeria se agregan para que React pueda dejar sus datos mock.
type Producto struct {
	ID          int      `json:"id"`
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion"`
	Precio      float64  `json:"precio"`
	Categoria   string   `json:"categoria"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria"`
	Stock       int      `json:"stock"`
	Activo      bool     `json:"activo"`
}

// CrearProductoRequest es el cuerpo para POST /api/productos (admin).
type CrearProductoRequest struct {
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion"`
	Precio      float64  `json:"precio"`
	Categoria   string   `json:"categoria"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria"`
	Stock       int      `json:"stock"`
}

// ActualizarProductoRequest es el cuerpo para PUT /api/productos/:id (admin).
type ActualizarProductoRequest struct {
	Nombre      *string   `json:"nombre,omitempty"`
	Descripcion *string   `json:"descripcion,omitempty"`
	Precio      *float64  `json:"precio,omitempty"`
	Categoria   *string   `json:"categoria,omitempty"`
	Img         *string   `json:"img,omitempty"`
	Galeria     *[]string `json:"galeria,omitempty"`
	Stock       *int      `json:"stock,omitempty"`
	Activo      *bool     `json:"activo,omitempty"`
}

// Referido es un nodo del árbol de la red multinivel (/api/red).
type Referido struct {
	ID     int     `json:"id"`
	Nombre string  `json:"nombre"`
	Nivel  int     `json:"nivel"`
	Ventas float64 `json:"ventas"`
	// Comisiones es el saldo acumulado que el referido ganó por las compras de su red.
	Comisiones float64    `json:"comisiones"`
	Codigo     string     `json:"codigo,omitempty"` // código de invitación (solo se llena en /api/red/mia)
	Hijos      []Referido `json:"hijos,omitempty"`
}

// PedidoConfirmado es la respuesta de POST /api/checkout (201). Tiene la misma forma
// que ya usa la pantalla Confirmacion.tsx: numero, items, total, cliente y fecha.
type PedidoConfirmado struct {
	ID         int           `json:"id"`
	Numero     string        `json:"numero"`
	Items      []ItemPedido  `json:"items"`
	Total      float64       `json:"total"`
	Cliente    ClientePedido `json:"cliente"`
	MetodoPago string        `json:"metodoPago"`
	Fecha      time.Time     `json:"fecha"`
}

// ItemPedido es una línea del pedido ya confirmado (con el precio vigente en la BD).
type ItemPedido struct {
	Nombre   string  `json:"nombre"`
	Cantidad int     `json:"cantidad"`
	Precio   float64 `json:"precio"`
}

// ClientePedido es el resumen del cliente que muestra la confirmación.
type ClientePedido struct {
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
	Ciudad string `json:"ciudad"`
}

// PedidoDetalle es un pedido con sus items para visualización.
type PedidoDetalle struct {
	ID      int           `json:"id"`
	Numero  string        `json:"numero"`
	Total   float64       `json:"total"`
	Estado  string        `json:"estado"`
	Cliente ClientePedido `json:"cliente"`
	Fecha   time.Time     `json:"fecha"`
	Items   []ItemPedido  `json:"items"`
	// UsuarioID es el dueño del pedido; se usa para autorizar la consulta y no se serializa.
	UsuarioID int `json:"-"`
}

// ActualizarEstadoRequest es el cuerpo para PATCH /api/pedidos/:id/estado (admin).
type ActualizarEstadoRequest struct {
	Estado string `json:"estado"`
}

// Comision es una entrada del ledger de comisiones.
type Comision struct {
	ID         int       `json:"id"`
	PedidoID   int       `json:"pedido_id"`
	ReferidoID int       `json:"referido_id"`
	Nivel      int       `json:"nivel"`
	Porcentaje int       `json:"porcentaje"`
	Monto      float64   `json:"monto"`
	Estado     string    `json:"estado"`
	CreadoEn   time.Time `json:"creado_en"`
}

// ComisionesResumen es el resumen de comisiones de un usuario.
type ComisionesResumen struct {
	Pendiente float64 `json:"pendiente"`
	Pagada    float64 `json:"pagada"`
	Total     float64 `json:"total"`
}

// Liquidacion es un pago a un distribuidor.
type Liquidacion struct {
	ID         int `json:"id"`
	ReferidoID int `json:"referido_id"`
	// ReferidoNombre solo se llena en el historial de admin (JOIN con referidos).
	ReferidoNombre string     `json:"referido_nombre,omitempty"`
	Total          float64    `json:"total"`
	Estado         string     `json:"estado"`
	CreadoEn       time.Time  `json:"creado_en"`
	PagadaEn       *time.Time `json:"pagada_en,omitempty"`
}

// LiquidarRequest es el cuerpo para POST /api/liquidaciones (admin).
type LiquidarRequest struct {
	ReferidoID *int `json:"referido_id"` // puntero: el nodo raíz "Tú" tiene id 0
}

// ReporteResumen es el resumen de ventas.
type ReporteResumen struct {
	TotalVendido    float64 `json:"total_vendido"`
	NumPedidos      int     `json:"num_pedidos"`
	TicketPromedio  float64 `json:"ticket_promedio"`
	ComisionesTotal float64 `json:"comisiones_total"`
}

// TopProducto es un producto en el ranking de ventas.
type TopProducto struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Cantidad int     `json:"cantidad"`
	Total    float64 `json:"total"`
}

// TopReferido es un referido en el ranking de ventas.
type TopReferido struct {
	ID     int     `json:"id"`
	Nombre string  `json:"nombre"`
	Ventas float64 `json:"ventas"`
}

// Usuario representa un usuario almacenado en el repositorio (uso interno, no se serializa).
type Usuario struct {
	ID       int
	Email    string
	Password string
	Rol      string
	Token    string
	// ReferidoID es el nodo del árbol de referidos que representa a este usuario (nil si no tiene).
	ReferidoID *int
	// Activo=false bloquea el login (cuenta desactivada).
	Activo bool
}

// ---------- Errores estandarizados ----------

// APIError es el formato ÚNICO de error de toda la API.
//
//	{"status": 400, "message": "...", "details": {...}}
type APIError struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Error implementa la interfaz error, de modo que un *APIError también puede
// devolverse desde un handler y ser procesado por el ErrorHandler global.
func (e *APIError) Error() string { return e.Message }

// UsuarioResumen es la fila del listado de usuarios para el admin (sin password ni token).
type UsuarioResumen struct {
	ID         int       `json:"id"`
	Email      string    `json:"email"`
	Nombre     string    `json:"nombre"`
	Rol        string    `json:"rol"`
	Activo     bool      `json:"activo"`
	ReferidoID *int      `json:"referido_id"`
	CreadoEn   time.Time `json:"creado_en"`
}
