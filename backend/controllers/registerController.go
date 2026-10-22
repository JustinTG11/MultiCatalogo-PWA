package controllers

import (
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// RegisterController maneja el registro de nuevos usuarios.
type RegisterController struct {
	repo repository.UsuarioRepository
}

// NewRegisterController crea el controlador de registro.
func NewRegisterController(repo repository.UsuarioRepository) *RegisterController {
	return &RegisterController{repo: repo}
}

// Register registra un nuevo usuario (público).
// 201 → usuario creado
// 400 → datos inválidos
// 409 → email ya existe
func (r *RegisterController) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", "Se esperaba un JSON con nombre, email, password y opcionalmente código de referido")
	}

	req.Email = strings.TrimSpace(req.Email)
	req.Nombre = strings.TrimSpace(req.Nombre)

	// Validación
	problemas := map[string]string{}
	if req.Nombre == "" {
		problemas["nombre"] = "El nombre es obligatorio"
	}
	if req.Email == "" {
		problemas["email"] = "El email es obligatorio"
	} else if _, err := mail.ParseAddress(req.Email); err != nil {
		problemas["email"] = "El formato del email no es válido"
	}
	if req.Password == "" {
		problemas["password"] = "La contraseña es obligatoria"
	} else if len(req.Password) < 6 {
		problemas["password"] = "La contraseña debe tener al menos 6 caracteres"
	}
	if len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos de registro inválidos", problemas)
	}

	// Crear usuario
	usuario, err := r.repo.CrearUsuario(req)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "ya existe") {
			return SendError(c, fiber.StatusConflict, "El email ya está registrado", nil)
		}
		if strings.Contains(err.Error(), "código de referido inválido") {
			return SendError(c, fiber.StatusBadRequest, "Código de referido inválido", nil)
		}
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Usuario registrado exitosamente",
		"email":   usuario.Email,
		"rol":     usuario.Rol,
	})
}
