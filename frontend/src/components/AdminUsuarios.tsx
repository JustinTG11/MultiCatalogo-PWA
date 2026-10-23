// src/components/AdminUsuarios.tsx
// Solo admin: quién se registró, si ya creó su contraseña, su código de referido y quién lo invitó.
import { useEffect, useState } from "react";
import { getUsuariosAdmin, type UsuarioAdmin } from "../services/usuariosService";
import Paginacion from "./Paginacion";

const LIMIT = 10;

const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState(""); // término ya aplicado (con debounce)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce: espera 300 ms tras escribir y vuelve a la página 1
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    getUsuariosAdmin(q, page, LIMIT)
      .then((r) => {
        if (!activo) return;
        setUsuarios(r.data);
        setTotal(r.total);
        setError("");
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : "No se pudo cargar los usuarios"))
      .finally(() => activo && setLoading(false));
    return () => {
      activo = false;
    };
  }, [q, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <p className="text-sm text-slate-500">{total} usuario(s) registrado(s)</p>
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por correo, nombre o código de referido..."
        className="w-full min-h-[44px] px-4 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{error}</div>}

      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        {loading ? (
          <p className="text-slate-500">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-500">No se encontraron usuarios.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="p-2">Usuario</th>
                    <th className="p-2">Rol</th>
                    <th className="p-2">Contraseña</th>
                    <th className="p-2">Código de referido</th>
                    <th className="p-2">Invitado por</th>
                    <th className="p-2">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 align-top">
                      <td className="p-2">
                        <p className="font-semibold text-slate-800">{u.nombre || "—"}</p>
                        <p className="text-slate-500">{u.email}</p>
                        {!u.activo && <span className="text-xs font-semibold text-red-600">Cuenta desactivada</span>}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            u.rol === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td className="p-2">
                        {u.tiene_password ? (
                          <span className="text-green-700 font-semibold">✓ Creada</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Sin contraseña</span>
                        )}
                      </td>
                      <td className="p-2">
                        {u.codigo_referido ? (
                          <code className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            {u.codigo_referido}
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-2">
                        {u.referido_por_nombre || u.referido_por_email ? (
                          <>
                            <p className="text-slate-800">{u.referido_por_nombre || "—"}</p>
                            {u.referido_por_email && <p className="text-slate-500">{u.referido_por_email}</p>}
                            {u.referido_por_codigo && (
                              <code className="text-xs text-indigo-700">{u.referido_por_codigo}</code>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Sin referente</span>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap">{new Date(u.creado_en).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion page={page} limit={LIMIT} total={total} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
};

export default AdminUsuarios;
