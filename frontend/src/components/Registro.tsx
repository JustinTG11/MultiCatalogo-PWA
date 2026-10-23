// src/components/Registro.tsx
// Vista pública de registro. Si la URL trae ?ref=CODIGO el campo se rellena solo:
// así el nuevo usuario queda colgado del referente en la red.
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import { ApiError, apiFetch } from "../services/http";

interface LoginResponse {
  token: string;
  email: string;
  rol: string;
}

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition";

const Registro = () => {
  const [searchParams] = useSearchParams();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ref, setRef] = useState(searchParams.get("ref") ?? "");
  const [error, setError] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setCampos({});

    // Validación rápida en el cliente (el servidor vuelve a validar todo)
    const problemas: Record<string, string> = {};
    if (!nombre.trim()) problemas.nombre = "El nombre es obligatorio";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) problemas.email = "Ingresa un correo válido";
    if (password.length < 6) problemas.password = "Mínimo 6 caracteres";
    if (Object.keys(problemas).length > 0) {
      setCampos(problemas);
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/register", {
        method: "POST",
        body: {
          nombre: nombre.trim(),
          email: email.trim(),
          password,
          ...(ref.trim() ? { ref: ref.trim() } : {}),
        },
      });

      // Login automático con las mismas credenciales y a la tienda
      const data = await apiFetch<LoginResponse>("/api/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      login({ email: data.email, rol: data.rol === "admin" ? "admin" : "cliente", token: data.token });
      navigate("/tienda");
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        setCampos(err.details as Record<string, string>);
      }
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Crear cuenta</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Únete a MultiCatálogo</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nombre completo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} autoComplete="name" />
            {campos.nombre && <p className="text-xs text-red-600 mt-1">{campos.nombre}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />
            {campos.email && <p className="text-xs text-red-600 mt-1">{campos.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
            {campos.password && <p className="text-xs text-red-600 mt-1">{campos.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Código de referido <span className="text-slate-400">(opcional)</span>
            </label>
            <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="Ej. LUIS" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Registro;
