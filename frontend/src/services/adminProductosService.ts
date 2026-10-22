// src/services/adminProductosService.ts
// CRUD de productos para el administrador. Todas las rutas exigen JWT con rol admin
// (apiFetch adjunta el token). El borrado es LÓGICO: el producto pasa a activo=false.

import { apiFetch } from "./http";
import type { Pagina } from "./pedidosService";

export interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  galeria: string[];
  stock: number;
  activo: boolean;
}

// Campos editables en el formulario (crear / editar)
export interface ProductoForm {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  stock: number;
}

// GET /api/admin/productos?q=&page=&limit= (incluye inactivos; búsqueda ILIKE en el servidor)
export const getProductosAdmin = (q: string, page: number, limit: number): Promise<Pagina<ProductoAdmin>> =>
  apiFetch<Pagina<ProductoAdmin>>(
    `/api/admin/productos?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`
  );

// POST /api/admin/productos -> 201
export const crearProducto = (data: ProductoForm): Promise<ProductoAdmin> =>
  apiFetch<ProductoAdmin>("/api/admin/productos", { method: "POST", body: data });

// PUT /api/admin/productos/:id (edición parcial)
export const actualizarProducto = (
  id: number,
  data: Partial<ProductoForm & { activo: boolean }>
): Promise<ProductoAdmin> =>
  apiFetch<ProductoAdmin>(`/api/admin/productos/${id}`, { method: "PUT", body: data });

// DELETE /api/admin/productos/:id -> 204 (activo=false, la fila se conserva)
export const desactivarProducto = (id: number): Promise<null> =>
  apiFetch<null>(`/api/admin/productos/${id}`, { method: "DELETE" });
