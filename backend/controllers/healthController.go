package controllers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Pinger es lo único que Health necesita saber de Postgres y Redis.
type Pinger interface {
	Ping(ctx context.Context) error
}

// PingFunc adapta una función a Pinger (go-redis devuelve un *StatusCmd, no un error).
type PingFunc func(ctx context.Context) error

func (f PingFunc) Ping(ctx context.Context) error { return f(ctx) }

type HealthController struct {
	db    Pinger
	redis Pinger // puede ser nil si Redis no se pudo configurar
}

func NewHealthController(db, redis Pinger) *HealthController {
	return &HealthController{db: db, redis: redis}
}

// Health responde:
//
//	200 {"status":"ok"}        -> Postgres y Redis responden
//	200 {"status":"degraded"}  -> Postgres ok, Redis caído (la API sigue sin caché)
//	503 {"status":"down"}      -> Postgres caído
func (h *HealthController) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	postgres, redis := "up", "up"
	if h.db == nil || h.db.Ping(ctx) != nil {
		postgres = "down"
	}
	if h.redis == nil || h.redis.Ping(ctx) != nil {
		redis = "down"
	}

	status, code := "ok", fiber.StatusOK
	switch {
	case postgres == "down":
		status, code = "down", fiber.StatusServiceUnavailable
	case redis == "down":
		status = "degraded"
	}

	return c.Status(code).JSON(fiber.Map{
		"status":   status,
		"postgres": postgres,
		"redis":    redis,
	})
}
