// src/services/usuariosService.ts
// Listado de usuarios para el administrador (GET /api/admin/usuarios). Exige JWT con rol admin.
// La API nunca devuelve contraseñas: solo indica si la cuenta ya tiene una creada.

import { apiFetch } from "./http";
import type { Pagina } from "./pedidosService";

export interface UsuarioAdmin {
  id: number;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
  activo: boolean;
  referido_id: number | null;
  creado_en: string;
  tiene_password: boolean;
  codigo_referido: string;
  referido_por_nombre: string;
  referido_por_email: string;
  referido_por_codigo: string;
}

export const getUsuariosAdmin = (q: string, page: number, limit: number): Promise<Pagina<UsuarioAdmin>> =>
  apiFetch<Pagina<UsuarioAdmin>>(
    `/api/admin/usuarios?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`
  );

export interface AsignarReferenteResultado {
  ok: boolean;
  comisiones_generadas: number;
}

// Cambia quién invitó al usuario (PUT /api/admin/usuarios/:id/referente). Código vacío = sin referente.
// retroactivo: genera las comisiones pendientes de sus pedidos anteriores que aún no tengan.
export const asignarReferente = (usuarioId: number, codigo: string, retroactivo: boolean) =>
  apiFetch<AsignarReferenteResultado>(`/api/admin/usuarios/${usuarioId}/referente`, {
    method: "PUT",
    body: { codigo_referido: codigo.trim(), retroactivo },
  });
