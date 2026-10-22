// src/services/reportesService.ts
// Reportes del negocio (solo admin). desde/hasta son fechas YYYY-MM-DD, ambas inclusivas y opcionales.
import { apiFetch } from "./http";

export interface Resumen {
  total_vendido: number;
  num_pedidos: number;
  ticket_promedio: number;
  comisiones_total: number; // devengadas (pendientes + pagadas)
}
export interface TopProducto {
  id: number;
  nombre: string;
  cantidad: number;
  total: number;
}
export interface TopReferido {
  id: number;
  nombre: string;
  ventas: number;
}

export const getResumen = (desde: string, hasta: string) => {
  const qs = new URLSearchParams();
  if (desde) qs.set("desde", desde);
  if (hasta) qs.set("hasta", hasta);
  const s = qs.toString();
  return apiFetch<Resumen>(`/api/reportes/resumen${s ? `?${s}` : ""}`);
};
export const getTopProductos = () => apiFetch<TopProducto[]>("/api/reportes/top-productos?limit=5");
export const getTopReferidos = () => apiFetch<TopReferido[]>("/api/reportes/top-referidos?limit=5");
