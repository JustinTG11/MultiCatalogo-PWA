// Paquete config: configuración de la aplicación (variables de entorno y conexiones).
// Aquí NO hay variables globales: cada función devuelve el recurso y main lo inyecta donde se necesita.
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// LoadEnv carga el archivo .env (si existe). Las variables ya definidas en el sistema tienen prioridad.
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("config: no se encontró archivo .env, usando variables del sistema/valores por defecto")
	}
}

// Getenv devuelve la variable de entorno o un valor por defecto si no está definida.
func Getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
