package controllers

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// LiquidacionesController maneja los pagos a distribuidores.
type LiquidacionesController struct {
	repo repository.LiquidacionRepository
}

// NewLiquidacionesController crea el controlador de liquidaciones.
func NewLiquidacionesController(repo repository.LiquidacionRepository) *LiquidacionesController {
	return &LiquidacionesController{repo: repo}
}

// Liquidar crea una liquidación para un referido (solo admin).
func (l *LiquidacionesController) Liquidar(c *fiber.Ctx) error {
	var req models.LiquidarRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}

	if req.ReferidoID == nil || *req.ReferidoID < 0 {
		return SendError(c, fiber.StatusBadRequest, "El referido_id es obligatorio", nil)
	}

	liquidacion, err := l.repo.Liquidar(*req.ReferidoID)
	if err != nil {
		if errors.Is(err, repository.ErrSinComisiones) {
			return SendError(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(liquidacion)
}

// GetLiquidacionesAdmin devuelve todas las liquidaciones (solo admin).
func (l *LiquidacionesController) GetLiquidacionesAdmin(c *fiber.Ctx) error {
	liquidaciones, err := l.repo.GetLiquidacionesAdmin()
	if err != nil {
		return err
	}
	return c.JSON(liquidaciones)
}

// GetLiquidacionesMias devuelve las liquidaciones del usuario autenticado.
func (l *LiquidacionesController) GetLiquidacionesMias(c *fiber.Ctx) error {
	usuario := c.Locals(usuarioLocalKey)
	if usuario == nil {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
	}

	u, ok := usuario.(models.Usuario)
	if !ok {
		return SendError(c, fiber.StatusInternalServerError, "Error interno al obtener usuario", nil)
	}

	if u.ReferidoID == nil {
		return SendError(c, fiber.StatusBadRequest, "El usuario no tiene referido asociado", nil)
	}

	liquidaciones, err := l.repo.GetLiquidaciones(*u.ReferidoID)
	if err != nil {
		return err
	}
	return c.JSON(liquidaciones)
}
