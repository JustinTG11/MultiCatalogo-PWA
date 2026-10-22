package controllers

import (
	"log"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
)

// exponerDetallesKey: clave de c.Locals con la que ExponerDetalles activa el campo "details".
const exponerDetallesKey = "exponerDetalles"

// ExponerDetalles es un middleware de configuración: con dev=true (APP_ENV=dev) las respuestas de error
// incluyen "details"; en cualquier otro entorno se omiten para no filtrar información interna.
// Sin este middleware el comportamiento por defecto es el seguro (sin details). Se decide por petición,
// así que no hace falta ninguna variable global.
func ExponerDetalles(dev bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals(exponerDetallesKey, dev)
		return c.Next()
	}
}

// SendError responde con el formato estandarizado models.APIError.
// "details" solo se envía cuando el entorno es dev (ver ExponerDetalles).
func SendError(c *fiber.Ctx, status int, message string, details interface{}) error {
	if dev, _ := c.Locals(exponerDetallesKey).(bool); !dev {
		details = nil
	}
	return c.Status(status).JSON(models.APIError{Status: status, Message: message, Details: details})
}

// ErrorHandler es el manejador global de errores de Fiber: cualquier error no controlado
// (ruta inexistente 404, método no permitido 405, panic recuperado, etc.) sale con el mismo JSON.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	message := "Error interno del servidor"

	switch e := err.(type) {
	case *models.APIError:
		status, message = e.Status, e.Message
	case *fiber.Error:
		status, message = e.Code, e.Message
	default:
		// Error inesperado (p. ej. fallo de BD): el detalle va al log, nunca al cliente.
		log.Printf("error interno: %v", err)
	}
	return SendError(c, status, message, nil)
}
