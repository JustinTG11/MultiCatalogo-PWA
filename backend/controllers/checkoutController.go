package controllers

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// metodosPago son los mismos que ofrece el formulario de Checkout.tsx.
var metodosPago = map[string]bool{
	"Tarjeta de crédito":      true,
	"Transferencia bancaria":  true,
	"Efectivo contra entrega": true,
}

const (
	maxLineasCarrito   = 50
	maxCantidadPorItem = 100
)

// CheckoutProcessor es lo único que el controlador necesita saber del servicio de compras.
type CheckoutProcessor interface {
	Procesar(usuario models.Usuario, req models.CheckoutRequest) (models.PedidoConfirmado, error)
}

// CheckoutController agrupa el endpoint de compra.
type CheckoutController struct {
	service CheckoutProcessor
}

// NewCheckoutController inyecta el servicio de compras.
func NewCheckoutController(service CheckoutProcessor) *CheckoutController {
	return &CheckoutController{service: service}
}

// Checkout procesa una compra (requiere el middleware RequireAuth).
//
//	400 -> JSON inválido, datos incompletos, cantidad <= 0 o producto inexistente
//	401 -> sin sesión (lo responde el middleware)
//	409 -> stock insuficiente
//	500 -> fallo interno: la transacción se revirtió y no se guardó nada
//	201 -> pedido confirmado
func (h *CheckoutController) Checkout(c *fiber.Ctx) error {
	usuario, ok := c.Locals(usuarioLocalKey).(models.Usuario)
	if !ok {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión para realizar esta acción", nil)
	}

	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido",
			"Se esperaba un JSON con cliente, metodoPago e items")
	}
	if problemas := validarCheckout(&req); len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos de compra inválidos", problemas)
	}

	pedido, err := h.service.Procesar(usuario, req)
	if err != nil {
		var noExiste *repository.ErrProductoNoExiste
		var sinStock *repository.ErrStockInsuficiente
		switch {
		case errors.Is(err, repository.ErrCantidadInvalida):
			return SendError(c, fiber.StatusBadRequest, repository.ErrCantidadInvalida.Error(), nil)
		case errors.As(err, &noExiste):
			return SendError(c, fiber.StatusBadRequest, fmt.Sprintf("El producto con id %d no existe", noExiste.ID),
				map[string]int{"productoId": noExiste.ID})
		case errors.As(err, &sinStock):
			return SendError(c, fiber.StatusConflict,
				fmt.Sprintf("Stock insuficiente de %s: quedan %d unidades", sinStock.Nombre, sinStock.Disponible),
				map[string]int{"productoId": sinStock.ID, "disponible": sinStock.Disponible, "solicitado": sinStock.Solicitado})
		default:
			// El detalle técnico va al log; el cliente solo ve un mensaje seguro.
			log.Printf("checkout: error procesando pedido: %v", err)
			return SendError(c, fiber.StatusInternalServerError,
				"No se pudo procesar el pedido. No se realizó ningún cambio, intenta nuevamente.", nil)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(pedido)
}

// validarCheckout normaliza los textos y acumula TODOS los problemas encontrados.
func validarCheckout(req *models.CheckoutRequest) map[string]string {
	problemas := map[string]string{}

	req.Cliente.Nombre = strings.TrimSpace(req.Cliente.Nombre)
	req.Cliente.Direccion = strings.TrimSpace(req.Cliente.Direccion)
	req.Cliente.Ciudad = strings.TrimSpace(req.Cliente.Ciudad)
	req.Cliente.Telefono = strings.TrimSpace(req.Cliente.Telefono)

	obligatorio := map[string]string{
		"cliente.nombre":    req.Cliente.Nombre,
		"cliente.direccion": req.Cliente.Direccion,
		"cliente.ciudad":    req.Cliente.Ciudad,
		"cliente.telefono":  req.Cliente.Telefono,
	}
	for campo, valor := range obligatorio {
		if valor == "" {
			problemas[campo] = "Este campo es obligatorio"
		}
	}

	if !metodosPago[req.MetodoPago] {
		problemas["metodoPago"] = "Método de pago no permitido"
	}

	if len(req.Items) == 0 {
		problemas["items"] = "El carrito está vacío"
	} else if len(req.Items) > maxLineasCarrito {
		problemas["items"] = fmt.Sprintf("El carrito admite como máximo %d productos distintos", maxLineasCarrito)
	}
	for i, it := range req.Items {
		if it.ProductoID <= 0 {
			problemas[fmt.Sprintf("items[%d].productoId", i)] = "El id del producto debe ser un entero positivo"
		}
		if it.Cantidad <= 0 {
			problemas[fmt.Sprintf("items[%d].cantidad", i)] = repository.ErrCantidadInvalida.Error()
		} else if it.Cantidad > maxCantidadPorItem {
			problemas[fmt.Sprintf("items[%d].cantidad", i)] =
				fmt.Sprintf("La cantidad máxima por producto es %d", maxCantidadPorItem)
		}
	}
	return problemas
}
