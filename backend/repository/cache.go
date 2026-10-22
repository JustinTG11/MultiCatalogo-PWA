package repository

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// Claves y TTL de la caché.
const (
	keyProductos = "productos:all"
	ttlProductos = 5 * time.Minute
	ttlRed       = 10 * time.Minute

	// ClaveCacheProductos es la clave exportada del catálogo, para que otras capas (p. ej. el servicio
	// de checkout) puedan invalidarla tras una compra.
	ClaveCacheProductos = keyProductos

	// PatronCacheRed engloba las claves red:tree:{email} de todos los usuarios.
	PatronCacheRed = "red:tree:*"
)

// keyRed devuelve la clave del árbol de referidos de un usuario: red:tree:{email}.
func keyRed(email string) string { return "red:tree:" + email }

// ---------- Implementación con Redis ----------

// RedisCache implementa Cache sobre Redis. Cualquier fallo cuenta como Cache Miss:
// la caché nunca debe tumbar la API.
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache recibe el cliente ya creado (inyección de dependencias).
func NewRedisCache(client *redis.Client) *RedisCache { return &RedisCache{client: client} }

func (c *RedisCache) Get(key string, dest any) bool {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	data, err := c.client.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		log.Printf("cache MISS  %s -> consultando PostgreSQL", key)
		return false
	}
	if err != nil {
		log.Printf("cache ERROR %s: %v -> consultando PostgreSQL", key, err)
		return false
	}
	if err := json.Unmarshal(data, dest); err != nil {
		log.Printf("cache ERROR %s: JSON inválido (%v) -> consultando PostgreSQL", key, err)
		return false
	}
	log.Printf("cache HIT   %s", key)
	return true
}

func (c *RedisCache) Set(key string, value any, ttl time.Duration) {
	data, err := json.Marshal(value)
	if err != nil {
		log.Printf("cache ERROR %s: no se pudo serializar (%v)", key, err)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		log.Printf("cache ERROR %s: no se pudo guardar (%v)", key, err)
	}
}

func (c *RedisCache) DeleteByPattern(pattern string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// SCAN recorre las claves por lotes (a diferencia de KEYS, no bloquea Redis).
	var claves []string
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		claves = append(claves, iter.Val())
	}
	if err := iter.Err(); err != nil {
		log.Printf("cache ERROR invalidando %s: %v", pattern, err)
		return
	}
	if len(claves) == 0 {
		return
	}
	if err := c.client.Del(ctx, claves...).Err(); err != nil {
		log.Printf("cache ERROR invalidando %s: %v", pattern, err)
		return
	}
	log.Printf("cache INVALIDADA %s (%d claves)", pattern, len(claves))
}

// ---------- Implementación nula ----------

// NoCache no guarda nada: se inyecta cuando Redis está deshabilitado y la API funciona solo con PostgreSQL.
type NoCache struct{}

func (NoCache) Get(string, any) bool           { return false }
func (NoCache) Set(string, any, time.Duration) {}
func (NoCache) DeleteByPattern(string)         {}
