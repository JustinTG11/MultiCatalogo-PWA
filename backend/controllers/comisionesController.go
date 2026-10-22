package controllers

import (
	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ComisionesController maneja el ledger de comisiones.
type ComisionesController struct {
	repo        repository.ComisionRepository
	redRepo     repository.RedRepository
	usuarioRepo repository.UsuarioRepository
}

// NewComisionesController crea el controlador de comisiones.
func NewComisionesController(repo repository.ComisionRepository, redRepo repository.RedRepository, usuarioRepo repository.UsuarioRepository) *ComisionesController {
	return &ComisionesController{
		repo:        repo,
		redRepo:     redRepo,
		usuarioRepo: usuarioRepo,
	}
}

// GetComisionesMias devuelve las comisiones del usuario autenticado.
func (c *ComisionesController) GetComisionesMias(ctx *fiber.Ctx) error {
	usuario := ctx.Locals(usuarioLocalKey)
	if usuario == nil {
		return SendError(ctx, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
	}

	u, ok := usuario.(models.Usuario)
	if !ok {
		return SendError(ctx, fiber.StatusInternalServerError, "Error interno al obtener usuario", nil)
	}

	if u.ReferidoID == nil {
		return SendError(ctx, fiber.StatusBadRequest, "El usuario no tiene referido asociado", nil)
	}

	comisiones, resumen, err := c.repo.GetComisionesMias(*u.ReferidoID)
	if err != nil {
		return err
	}

	return ctx.JSON(fiber.Map{
		"comisiones": comisiones,
		"resumen":    resumen,
	})
}

// GetRedMia devuelve la red del usuario autenticado (subárbol).
func (c *ComisionesController) GetRedMia(ctx *fiber.Ctx) error {
	usuario := ctx.Locals(usuarioLocalKey)
	if usuario == nil {
		return SendError(ctx, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
	}

	u, ok := usuario.(models.Usuario)
	if !ok {
		return SendError(ctx, fiber.StatusInternalServerError, "Error interno al obtener usuario", nil)
	}

	if u.ReferidoID == nil {
		return SendError(ctx, fiber.StatusBadRequest, "El usuario no tiene referido asociado", nil)
	}

	red, err := c.redRepo.GetRedMia(*u.ReferidoID)
	if err != nil {
		return err
	}

	return ctx.JSON(red)
}
