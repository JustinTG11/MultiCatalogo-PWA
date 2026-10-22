package controllers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// PedidosController maneja la gestión de pedidos.
type PedidosController struct {
	repo repository.PedidoRepository
}

// NewPedidosController crea el controlador de pedidos.
func NewPedidosController(repo repository.PedidoRepository) *PedidosController {
	return &PedidosController{repo: repo}
}

// GetPedidosMios devuelve los pedidos del usuario autenticado.
func (p *PedidosController) GetPedidosMios(c *fiber.Ctx) error {
	usuario := c.Locals(usuarioLocalKey)
	if usuario == nil {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
	}

	u, ok := usuario.(models.Usuario)
	if !ok {
		return SendError(c, fiber.StatusInternalServerError, "Error interno al obtener usuario", nil)
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	pedidos, total, err := p.repo.GetPedidosMios(u.ID, page, limit)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"data":  pedidos,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

// GetPedidosAdmin devuelve todos los pedidos (solo admin).
func (p *PedidosController) GetPedidosAdmin(c *fiber.Ctx) error {
	estado := c.Query("estado", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	pedidos, total, err := p.repo.GetPedidosAdmin(estado, page, limit)
	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"data":  pedidos,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

// GetPedidoPorID devuelve un pedido con sus items.
func (p *PedidosController) GetPedidoPorID(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del pedido debe ser un número entero positivo", nil)
	}

	pedido, ok, err := p.repo.GetPedidoPorID(id)
	if err != nil {
		return err
	}
	if !ok {
		return SendError(c, fiber.StatusNotFound, "Pedido no encontrado", nil)
	}

	// Solo el dueño del pedido o un admin pueden verlo (404 para no revelar que existe).
	u, _ := c.Locals(usuarioLocalKey).(models.Usuario)
	if u.Rol != "admin" && u.ID != pedido.UsuarioID {
		return SendError(c, fiber.StatusNotFound, "Pedido no encontrado", nil)
	}

	return c.JSON(pedido)
}

// ActualizarEstadoPedido cambia el estado de un pedido (solo admin).
func (p *PedidosController) ActualizarEstadoPedido(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del pedido debe ser un número entero positivo", nil)
	}

	var req models.ActualizarEstadoRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}

	if req.Estado == "" {
		return SendError(c, fiber.StatusBadRequest, "El estado es obligatorio", nil)
	}

	if err := p.repo.ActualizarEstadoPedido(id, req.Estado); err != nil {
		if errors.Is(err, repository.ErrPedidoNoEncontrado) {
			return SendError(c, fiber.StatusNotFound, "Pedido no encontrado", nil)
		}
		if errors.Is(err, repository.ErrTransicionInvalida) {
			return SendError(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return err
	}

	return c.JSON(fiber.Map{"message": "Estado actualizado exitosamente"})
}
