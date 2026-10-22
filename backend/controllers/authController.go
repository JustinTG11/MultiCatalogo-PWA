// Paquete controllers: lógica HTTP (request/response). No contiene datos, los pide al repository.
package controllers

import (
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
	"multicatalogo-backend/services"
)

// AuthController agrupa los endpoints de autenticación. Recibe su repositorio por inyección.
type AuthController struct {
	repo repository.UsuarioRepository
	jwt  *services.JWTService
}

// NewAuthController es el constructor: la dependencia entra como interfaz, no como variable global.
func NewAuthController(repo repository.UsuarioRepository, jwt *services.JWTService) *AuthController {
	return &AuthController{repo: repo, jwt: jwt}
}

// Login valida la entrada y autentica contra el repositorio.
//
//	400 -> JSON inválido o campos vacíos / email mal formado
//	401 -> credenciales incorrectas
//	200 -> {token, email, rol}
func (a *AuthController) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", "Se esperaba un JSON con email y password")
	}

	req.Email = strings.TrimSpace(req.Email)

	// Validación explícita de campos, acumulando todos los problemas encontrados.
	problemas := map[string]string{}
	if req.Email == "" {
		problemas["email"] = "El email es obligatorio"
	} else if _, err := mail.ParseAddress(req.Email); err != nil {
		problemas["email"] = "El formato del email no es válido"
	}
	if req.Password == "" {
		problemas["password"] = "La contraseña es obligatoria"
	}
	if len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos de inicio de sesión inválidos", problemas)
	}

	usuario, ok, err := a.repo.FindUsuario(req.Email, req.Password)
	if err != nil {
		return err // error de base de datos -> 500 estandarizado por el ErrorHandler
	}
	if !ok {
		return SendError(c, fiber.StatusUnauthorized, "Credenciales incorrectas", nil)
	}

	if !usuario.Activo {
		return SendError(c, fiber.StatusForbidden, "Cuenta desactivada", nil)
	}

	// Generar JWT real
	token, err := a.jwt.GenerarToken(usuario.ID, usuario.Email, usuario.Rol)
	if err != nil {
		return SendError(c, fiber.StatusInternalServerError, "Error al generar token de sesión", nil)
	}

	return c.JSON(models.LoginResponse{Token: token, Email: usuario.Email, Rol: usuario.Rol})
}
