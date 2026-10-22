// src/context/auth.ts
// Tipos, contexto y hook de autenticación (separados del Provider para Fast Refresh).
import { createContext, useContext } from "react";

export type Rol = "admin" | "cliente";

// Usuario autenticado: correo + rol + JWT (los entrega la API en /api/login).
export interface Usuario {
  email: string;
  rol: Rol;
  token: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: Usuario | null;
  login: (usuario: Usuario) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  return context;
};
