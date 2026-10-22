// src/hooks/useRed.ts
// Hook que carga el árbol de referidos desde la API cada vez que se monta el componente.
import { useEffect, useState } from "react";
import type { Referido } from "../data/red";
import { getRed } from "../services/redService";

export function useRed(email: string | undefined) {
  const [red, setRed] = useState<Referido | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!email) return;
    let activo = true; // evita actualizar el estado si el componente ya se desmontó

    getRed()
      .then((datos) => {
        if (!activo) return;
        setRed(datos);
        setError("");
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la red");
      });

    return () => {
      activo = false;
    };
  }, [email]);

  return { red, error, cargando: red === null && error === "" };
}
