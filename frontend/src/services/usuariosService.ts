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
