// src/components/Login.tsx — Login renovado: cuentas de prueba ocultas detrás de un botón
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type Rol } from "../context/auth";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../services/http";
import InstallButton from "./InstallButton";

interface LoginResponse {
  token: string;
  email: string;
  rol: string;
}

const CUENTAS_PRUEBA = {
  admin: { email: "admin@upse.edu.ec", password: "123456", label: "Administrador" },
  cliente: { email: "cliente@upse.edu.ec", password: "123456", label: "Cliente" },
} as const;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarPrueba, setMostrarPrueba] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    apiFetch<LoginResponse>("/api/login", { method: "POST", body: { email, password } })
      .then((data) => {
        const rol: Rol = data.rol === "admin" ? "admin" : "cliente";
        login({ email: data.email, rol, token: data.token });
        navigate("/");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error inesperado");
      })
      .finally(() => setLoading(false));
  };

  const usarCuenta = (tipo: keyof typeof CUENTAS_PRUEBA) => {
    const c = CUENTAS_PRUEBA[tipo];
    setEmail(c.email);
    setPassword(c.password);
    setError("");
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8 transition-colors">
      {/* Toggle tema */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30 mb-4">
              MC
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              MultiCatálogo
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-3 rounded-xl text-sm mb-5 text-center border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@correo.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validando...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Crear cuenta
            </Link>
          </p>

          {/* Cuentas de prueba — ocultas por defecto */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMostrarPrueba((v) => !v)}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <svg
                className={`w-4 h-4 transition-transform ${mostrarPrueba ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {mostrarPrueba ? "Ocultar cuentas de prueba" : "Cuentas de prueba"}
            </button>

            {mostrarPrueba && (
              <div className="mt-3 space-y-2 animate-slide-in">
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mb-2">
                  Rellena el formulario con una cuenta demo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => usarCuenta("admin")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition text-amber-800 dark:text-amber-200"
                  >
                    <span className="text-xl">👑</span>
                    <span className="text-sm font-semibold">Admin</span>
                    <span className="text-[10px] opacity-70 font-mono truncate max-w-full">admin@upse…</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => usarCuenta("cliente")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition text-indigo-800 dark:text-indigo-200"
                  >
                    <span className="text-xl">🛍️</span>
                    <span className="text-sm font-semibold">Cliente</span>
                    <span className="text-[10px] opacity-70 font-mono truncate max-w-full">cliente@upse…</span>
                  </button>
                </div>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                  Contraseña en ambos: <span className="font-mono">123456</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
          Justin Tomalá · MultiCatálogo
        </p>
      </div>

      <InstallButton className="fixed bottom-4 left-4 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </div>
  );
};

export default Login;
