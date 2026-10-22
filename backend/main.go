// Paquete main: punto de entrada del servidor y "raíz de composición": es el ÚNICO lugar donde
// se crean las dependencias concretas y se inyectan unas en otras.
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"multicatalogo-backend/config"
	"multicatalogo-backend/controllers"
	"multicatalogo-backend/repository"
	"multicatalogo-backend/routes"
	"multicatalogo-backend/services"
)

func main() {
	config.LoadEnv()

	// ---- Infraestructura ----
	pool, err := config.NewPostgres()
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	// Redis es opcional: si no está disponible la API funciona igual, solo que sin caché (NoCache).
	var cache repository.Cache = repository.NoCache{}
	redisClient, err := config.NewRedis()
	if err != nil {
		log.Printf("Redis deshabilitado, la API funcionará sin caché: %v", err)
	} else {
		defer redisClient.Close()
		cache = repository.NewRedisCache(redisClient)
	}

	// ---- Repositorio (un solo objeto implementa todas las interfaces) ----
	// CHECKOUT_FALLA_SIMULADA = "items" | "pausa" sirve para demostrar el ROLLBACK en clase.
	repo := repository.NewPostgresRepository(pool, cache, repository.Opciones{
		FallaSimulada: config.Getenv("CHECKOUT_FALLA_SIMULADA", ""),
	})

	// ---- Servicios y controladores (cada uno recibe solo lo que necesita) ----
	appEnv := config.Getenv("APP_ENV", "prod") // "dev" habilita "details" en los errores; cualquier otro valor los oculta
	jwtSecret := config.Getenv("JWT_SECRET", "")
	if jwtSecret == "" {
		if appEnv != "dev" {
			log.Fatal("JWT_SECRET no está definido: es obligatorio fuera de APP_ENV=dev")
		}
		log.Println("AVISO: JWT_SECRET vacío, usando un secreto de desarrollo (solo APP_ENV=dev)")
		jwtSecret = "secreto-solo-para-desarrollo"
	}
	jwtService := services.NewJWTService(jwtSecret)

	checkoutService := services.NewCheckoutService(repo, cache)

	var redisPing controllers.Pinger
	if redisClient != nil {
		redisPing = controllers.PingFunc(func(ctx context.Context) error {
			return redisClient.Ping(ctx).Err()
		})
	}

	deps := routes.Dependencias{
		Auth:          controllers.NewAuthController(repo, jwtService),
		Register:      controllers.NewRegisterController(repo),
		Productos:     controllers.NewProductoController(repo),
		Red:           controllers.NewRedController(repo),
		Checkout:      controllers.NewCheckoutController(checkoutService),
		Pedidos:       controllers.NewPedidosController(repo),
		Comisiones:    controllers.NewComisionesController(repo, repo, repo),
		Liquidaciones: controllers.NewLiquidacionesController(repo),
		Reportes:      controllers.NewReportesController(repo),
		Usuarios:      controllers.NewUsuariosController(repo),
		RequireAuth:   controllers.RequireAuth(repo, jwtService),
		RequireAdmin:  controllers.RequireAdmin,
		Health:        controllers.NewHealthController(pool, redisPing),
	}

	// ---- Servidor HTTP ----
	// ErrorHandler global: todo error sale con el JSON estandarizado APIError.
	app := fiber.New(fiber.Config{ErrorHandler: controllers.ErrorHandler})

	// recover evita que un panic tumbe el servidor (lo convierte en un 500 estandarizado).
	app.Use(recover.New())
	app.Use(controllers.ExponerDetalles(appEnv == "dev"))

	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173, http://127.0.0.1:5173, http://192.168.110.84:5173",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	routes.SetupRoutes(app, deps)

	// El servidor corre en una goroutine para poder esperar Ctrl+C / SIGTERM y cerrar ordenadamente.
	go func() {
		if err := app.Listen(":" + config.Getenv("PORT", "3000")); err != nil {
			log.Printf("servidor detenido: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("apagando servidor...")
	_ = app.Shutdown()
	// Antes de cerrar la BD, se espera a que terminen las comisiones de compras ya confirmadas.
	checkoutService.Esperar(15 * time.Second)
}
