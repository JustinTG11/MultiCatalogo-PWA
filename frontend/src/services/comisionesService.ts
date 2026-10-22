// src/services/comisionesService.ts
// Ledger de comisiones del usuario autenticado (GET /api/comisiones/mias).
import { apiFetch } from "./http";

export interface Comision {
  id: number;
  pedido_id: number;
  referido_id: number;
  nivel: number;
  porcentaje: number;
  monto: number;
  estado: "pendiente" | "pagada" | "revertida";
  creado_en: string;
}

export interface ComisionesRespuesta {
  comisiones: Comision[];
  resumen: { pendiente: number; pagada: number; total: number };
}

export const getMisComisiones = () => apiFetch<ComisionesRespuesta>("/api/comisiones/mias");
