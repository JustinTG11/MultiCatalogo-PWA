package controllers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
	"multicatalogo-backend/services"
)

// usuarioLocalKey es la clave con la que el middleware deja al usuario autenticado en el contexto.
const usuarioLocalKey = "usuario"

// RequireAuth protege una ruta: exige "Authorization: Bearer <token>" con el JWT que entregó
// POST /api/login, valida el JWT con el secreto y deja al usuario identificado en el contexto.
// El comprador SIEMPRE se identifica por el token (servidor), nunca por un dato que mande el cliente.
//
//	401 -> sin token o token inválido
func RequireAuth(repo repository.UsuarioRepository, jwt *services.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión para realizar esta acción", nil)
		}
		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))

		// Validar JWT
		claims, err := jwt.ValidarToken(token)
		if err != nil {
			return SendError(c, fiber.StatusUnauthorized, "Sesión no válida, vuelve a iniciar sesión", nil)
		}

		// Buscar usuario por email del claim (para obtener ID y referido_id)
		usuario, ok, err := repo.FindUsuarioPorEmail(claims.Email)
		if err != nil {
			return err
		}
		if !ok {
			return SendError(c, fiber.StatusUnauthorized, "Usuario no encontrado", nil)
		}

		// El claim sub (id del usuario) debe coincidir con el usuario hallado por email.
		if claims.Subject != strconv.Itoa(usuario.ID) {
			return SendError(c, fiber.StatusUnauthorized, "Sesión no válida, vuelve a iniciar sesión", nil)
		}

		if !usuario.Activo {
			return SendError(c, fiber.StatusForbidden, "Cuenta desactivada", nil)
		}

		c.Locals(usuarioLocalKey, usuario)
		return c.Next()
	}
}

// RequireAdmin es un middleware que solo permite acceso a usuarios con rol 'admin'.
// Debe usarse después de RequireAuth (que ya dejó el usuario en el contexto).
//
//	403 -> usuario autenticado pero no es admin
func RequireAdmin(c *fiber.Ctx) error {
	usuario := c.Locals(usuarioLocalKey)
	if usuario == nil {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
	}

	u, ok := usuario.(models.Usuario)
	if !ok {
		return SendError(c, fiber.StatusInternalServerError, "Error interno al verificar rol", nil)
	}

	if u.Rol != "admin" {
		return SendError(c, fiber.StatusForbidden, "Solo administradores pueden acceder a esta ruta", nil)
	}

	return c.Next()
}
