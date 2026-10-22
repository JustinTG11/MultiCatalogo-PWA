// src/services/liquidacionesService.ts
import { apiFetch } from "./http";

export interface Liquidacion {
  id: number;
  referido_id: number;
  referido_nombre?: string; // solo en el historial de admin
  total: number;
  estado: string;
  creado_en: string;
  pagada_en?: string;
}

// Deuda por distribuidor: /api/reportes/comisiones-pendientes devuelve el monto pendiente en el campo "ventas".
export interface Deuda {
  id: number;
  nombre: string;
  ventas: number;
}

export const getDeudas = () => apiFetch<Deuda[]>("/api/reportes/comisiones-pendientes");
export const getLiquidacionesAdmin = () => apiFetch<Liquidacion[]>("/api/admin/liquidaciones");
export const getMisLiquidaciones = () => apiFetch<Liquidacion[]>("/api/liquidaciones/mias");
export const liquidar = (referidoId: number) =>
  apiFetch<Liquidacion>("/api/admin/liquidaciones", { method: "POST", body: { referido_id: referidoId } });
