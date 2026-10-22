// src/services/redService.ts
// Consume GET /api/red (ruta protegida y solo admin: apiFetch envía el JWT automáticamente).
// La identidad sale del token, por eso ya no se envía ningún email en la URL.

import type { Referido } from "../data/red";
import { apiFetch } from "./http";

export const getRed = (): Promise<Referido> => apiFetch<Referido>("/api/red");

// GET /api/red/mia: SOLO el subárbol del usuario del token (él = nivel 0, hasta 3 niveles) + su código de invitación.
export const getRedMia = (): Promise<Referido> => apiFetch<Referido>("/api/red/mia");
