package controllers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// RedController agrupa los endpoints de la red multinivel.
type RedController struct {
	repo repository.RedRepository
}

// NewRedController inyecta el repositorio de la red.
func NewRedController(repo repository.RedRepository) *RedController {
	return &RedController{repo: repo}
}

// GetRed devuelve el árbol multinivel de referidos (200).
//
// Ruta solo para administradores (RequireAuth + RequireAdmin). El árbol se cachea por usuario
// (red:tree:{email}) usando el email del TOKEN: el query param ?email= se ignora, así ningún
// cliente puede pedir ni envenenar la caché de otra cuenta.
//
//	401 -> sin sesión, 403 -> no es admin (los responden los middlewares)
//	404 -> no hay datos de red
func (h *RedController) GetRed(c *fiber.Ctx) error {
	usuario, ok := c.Locals(usuarioLocalKey).(models.Usuario)
	if !ok {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión para realizar esta acción", nil)
	}

	red, err := h.repo.GetRed(strings.ToLower(usuario.Email))
	if errors.Is(err, repository.ErrRedVacia) {
		return SendError(c, fiber.StatusNotFound, "La red de referidos no tiene datos", nil)
	}
	if err != nil {
		return err
	}
	return c.JSON(red)
}
