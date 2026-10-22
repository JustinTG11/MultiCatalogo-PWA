// src/services/checkoutService.ts
// Consume POST /api/checkout (ruta protegida: exige el token del login).
// Los errores del backend llegan con formato { status, message, details } y se propagan como ApiError.

import { apiFetch } from "./http";

// Lo que envía el frontend: SOLO ids y cantidades. Los precios y el total los calcula el servidor.
export interface CheckoutPayload {
  cliente: {
    nombre: string;
    email: string;
    direccion: string;
    ciudad: string;
    telefono: string;
  };
  metodoPago: string;
  items: { productoId: number; cantidad: number }[];
}

// Pedido confirmado que devuelve la API (201)
export interface PedidoRespuesta {
  id: number;
  numero: string;
  items: { nombre: string; cantidad: number; precio: number }[];
  total: number;
  cliente: { nombre: string; email: string; ciudad: string };
  metodoPago: string;
  fecha: string; // ISO 8601
}

// El token lo adjunta apiFetch desde la sesión guardada.
export const crearPedido = (payload: CheckoutPayload): Promise<PedidoRespuesta> =>
  apiFetch<PedidoRespuesta>("/api/checkout", { method: "POST", body: payload });
