package config

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPostgres abre el pool de conexiones a PostgreSQL y verifica que responda.
// Quien lo recibe es responsable de llamar a pool.Close() al terminar.
func NewPostgres() (*pgxpool.Pool, error) {
	// url.URL escapa correctamente caracteres especiales en usuario y contraseña.
	dsn := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(Getenv("DB_USER", "postgres"), Getenv("DB_PASSWORD", "postgres")),
		Host:   fmt.Sprintf("%s:%s", Getenv("DB_HOST", "localhost"), Getenv("DB_PORT", "5432")),
		Path:   Getenv("DB_NAME", "multicatalogo"),
	}
	// Deshabilitar SSL para desarrollo (PostgreSQL local o contenedor sin certificados)
	query := dsn.Query()
	query.Set("sslmode", "disable")
	dsn.RawQuery = query.Encode()

	cfg, err := pgxpool.ParseConfig(dsn.String())
	if err != nil {
		return nil, fmt.Errorf("configuración de base de datos inválida: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("no se pudo crear el pool de conexiones: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("PostgreSQL no responde (¿está levantado el contenedor?): %w", err)
	}

	log.Println("config: conexión a PostgreSQL establecida")
	return pool, nil
}
