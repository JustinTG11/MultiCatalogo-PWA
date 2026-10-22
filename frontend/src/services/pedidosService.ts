// src/services/pedidosService.ts
// Consulta y gestión de pedidos. El token lo adjunta apiFetch.
import { apiFetch } from "./http";

export type EstadoPedido = "pendiente" | "preparando" | "enviado" | "entregado" | "cancelado";

export interface PedidoItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: number;
  numero: string;
  total: number;
  estado: EstadoPedido;
  cliente: { nombre: string; email: string; ciudad: string };
  fecha: string; // ISO 8601
  items: PedidoItem[] | null; // solo viene en el detalle
}

// Respuesta paginada estándar de la API
export interface Pagina<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// Siguientes estados permitidos (espejo de las transiciones válidas del servidor)
export const SIGUIENTES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ["preparando", "cancelado"],
  preparando: ["enviado", "cancelado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

export const getMisPedidos = (page = 1, limit = 10) =>
  apiFetch<Pagina<Pedido>>(`/api/pedidos/mios?page=${page}&limit=${limit}`);

// Detalle con items (solo el dueño o un admin)
export const getPedido = (id: number) => apiFetch<Pedido>(`/api/pedidos/${id}`);

export const getPedidosAdmin = (estado: string, page = 1, limit = 10) =>
  apiFetch<Pagina<Pedido>>(
    `/api/admin/pedidos?page=${page}&limit=${limit}${estado ? `&estado=${encodeURIComponent(estado)}` : ""}`
  );

export const cambiarEstadoPedido = (id: number, estado: EstadoPedido) =>
  apiFetch<{ message: string }>(`/api/admin/pedidos/${id}/estado`, { method: "PATCH", body: { estado } });
