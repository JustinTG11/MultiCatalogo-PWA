package controllers

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// UsuariosController: listado de usuarios para el administrador.
type UsuariosController struct {
	repo repository.UsuarioRepository
}

func NewUsuariosController(repo repository.UsuarioRepository) *UsuariosController {
	return &UsuariosController{repo: repo}
}

// GetUsuarios devuelve {data, page, limit, total}; ?q= busca por email o nombre (solo admin).
func (u *UsuariosController) GetUsuarios(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	usuarios, total, err := u.repo.GetUsuarios(strings.TrimSpace(c.Query("q")), page, limit)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"data": usuarios, "page": page, "limit": limit, "total": total})
}

// AsignarReferente cambia quién invitó a un usuario (solo admin): PUT /api/admin/usuarios/:id/referente.
// Cuerpo: {"codigo_referido": "U12", "retroactivo": true}. Un código vacío deja al usuario sin referente.
func (u *UsuariosController) AsignarReferente(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "ID de usuario inválido", nil)
	}

	var req models.AsignarReferenteRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}

	generadas, err := u.repo.AsignarReferente(id, req.Codigo, req.Retroactivo)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrUsuarioNoEncontrado):
			return SendError(c, fiber.StatusNotFound, err.Error(), nil)
		case errors.Is(err, repository.ErrUsuarioSinNodo),
			errors.Is(err, repository.ErrReferenteNoExiste),
			errors.Is(err, repository.ErrReferenteInvalido),
			errors.Is(err, repository.ErrCicloReferido):
			return SendError(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return err
	}
	return c.JSON(fiber.Map{"ok": true, "comisiones_generadas": generadas})
}
