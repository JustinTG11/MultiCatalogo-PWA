// src/context/AuthContext.tsx
// Provider de autenticación. La sesión (usuario + JWT) se persiste en localStorage
// (clave "multicatalogo_sesion") para sobrevivir a recargas de página.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type Usuario } from "./auth";
import { borrarSesion, guardarSesion, leerSesion, SESION_EXPIRADA } from "../services/http";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Se restaura la sesión guardada (si el JWT no ha vencido).
  const [user, setUser] = useState<Usuario | null>(() => leerSesion());

  const login = useCallback((usuario: Usuario) => {
    guardarSesion(usuario);
    setUser(usuario);
  }, []);

  const logout = useCallback(() => {
    borrarSesion();
    setUser(null);
  }, []);

  // apiFetch avisa con este evento cuando el servidor rechaza el token (401).
  useEffect(() => {
    const alExpirar = () => setUser(null);
    window.addEventListener(SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(SESION_EXPIRADA, alExpirar);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: user !== null, user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
