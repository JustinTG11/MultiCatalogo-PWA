// src/config.ts
// URL base de la API (backend Go/Fiber). Se define en .env con VITE_API_URL.
// Si no existe, usa el mismo host desde el que se abre el frontend (puerto 3000), así funciona
// en localhost y también desde otra máquina de la red (ej. la IP del aula).
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3000`;
