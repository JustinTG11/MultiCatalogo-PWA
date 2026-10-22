// src/services/http.ts
// Cliente HTTP ÚNICO de la aplicación: todos los servicios pasan por apiFetch.
// - Antepone la URL base de la API (VITE_API_URL).
// - Adjunta automáticamente "Authorization: Bearer <token>" si hay sesión guardada.
// - Convierte los errores { status, message, details } del backend en ApiError.
// - Si el servidor responde 401 con un token enviado, la sesión venció: se limpia y se avisa a la app.

import { API_URL } from "../config";
import type { Usuario } from "../context/auth";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// ---------- Sesión persistida (usuario + JWT) ----------
export const SESSION_KEY = "multicatalogo_sesion";
export const SESION_EXPIRADA = "multicatalogo:sesion-expirada";

// Lee el campo "exp" (segundos) del payload del JWT sin verificar la firma (eso lo hace el servidor).
function jwtVencido(token: string): boolean {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true; // token ilegible = no se puede confiar en él
  }
}

export function leerSesion(): Usuario | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Usuario;
    if (!u?.email || !u?.token || jwtVencido(u.token)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

export function guardarSesion(usuario: Usuario): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
}

export function borrarSesion(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ---------- Cliente ----------
interface Opciones {
  method?: string;
  body?: unknown; // se serializa a JSON
}

export async function apiFetch<T>(path: string, { method = "GET", body }: Opciones = {}): Promise<T> {
  const token = leerSesion()?.token;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // 401 con token enviado = sesión vencida o adulterada
    if (response.status === 401 && token) {
      borrarSesion();
      window.dispatchEvent(new Event(SESION_EXPIRADA));
    }
    throw new ApiError(response.status, data?.message ?? "Error inesperado del servidor", data?.details);
  }
  return data as T;
}
