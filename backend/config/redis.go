package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedis crea el cliente de Redis leyendo REDIS_URL (si existe) o REDIS_HOST/REDIS_PORT/REDIS_PASSWORD.
// Solo devuelve error si la configuración es inválida. Si Redis simplemente no está levantado se
// avisa en el log y se devuelve el cliente igual: la caché empezará a funcionar apenas Redis responda.
// Quien lo recibe es responsable de llamar a client.Close() al terminar.
func NewRedis() (*redis.Client, error) {
	var opts *redis.Options
	if uri := os.Getenv("REDIS_URL"); uri != "" {
		o, err := redis.ParseURL(uri)
		if err != nil {
			return nil, fmt.Errorf("REDIS_URL inválida: %w", err)
		}
		opts = o
	} else {
		opts = &redis.Options{
			Addr:     fmt.Sprintf("%s:%s", Getenv("REDIS_HOST", "localhost"), Getenv("REDIS_PORT", "6379")),
			Password: os.Getenv("REDIS_PASSWORD"),
		}
	}

	// Tiempos cortos: si Redis se cae, la petición no se queda esperando; cae directo a PostgreSQL.
	opts.DialTimeout = 2 * time.Second
	opts.ReadTimeout = time.Second
	opts.WriteTimeout = time.Second

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("config: Redis no responde todavía (%v); se usará PostgreSQL directamente", err)
	} else {
		log.Println("config: conexión a Redis establecida")
	}
	return client, nil
}
