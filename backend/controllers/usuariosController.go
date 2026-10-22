package controllers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

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
