// src/services/productosService.ts
// Capa de servicios del catálogo: consume la API Go/Fiber (GET /api/productos y /api/productos/:id).

import type { Producto } from "../data/productos";
import { apiFetch } from "./http";

// GET /api/productos (lista completa)
export const getProductos = (): Promise<Producto[]> => apiFetch<Producto[]>("/api/productos");

// GET /api/productos/:id (detalle). La validación (400 si no es numérico, 404 si no existe) la hace el backend.
export const getProductoById = (id: string): Promise<Producto> =>
  apiFetch<Producto>(`/api/productos/${encodeURIComponent(id)}`);
