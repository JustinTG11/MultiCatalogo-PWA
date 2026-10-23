// src/components/AdminUsuarios.tsx
// Solo admin: quién se registró, si ya creó su contraseña, su código de referido y quién lo invitó.
import { useEffect, useState } from "react";
import { asignarReferente, getUsuariosAdmin, type UsuarioAdmin } from "../services/usuariosService";
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
  const [recarga, setRecarga] = useState(0); // se incrementa para volver a pedir la lista
  const [mensaje, setMensaje] = useState("");

  // Edición del referente (modal)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [codigo, setCodigo] = useState("");
  const [retroactivo, setRetroactivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [candidatos, setCandidatos] = useState<UsuarioAdmin[]>([]); // sugerencias de códigos

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
  }, [q, page, recarga]);

  // Sugerencias de referentes: los usuarios con código de referido (hasta 100).
  useEffect(() => {
    getUsuariosAdmin("", 1, 100)
      .then((r) => setCandidatos(r.data.filter((u) => u.codigo_referido)))
      .catch(() => setCandidatos([]));
  }, [recarga]);

  const abrirEditor = (u: UsuarioAdmin) => {
    setEditando(u);
    setCodigo(u.referido_por_codigo ?? "");
    setRetroactivo(true);
    setErrorModal("");
  };

  const guardarReferente = async () => {
    if (!editando) return;
    setGuardando(true);
    setErrorModal("");
    try {
      const r = await asignarReferente(editando.id, codigo, retroactivo);
      setMensaje(
        codigo.trim()
          ? `Referente actualizado para ${editando.nombre || editando.email}.` +
              (r.comisiones_generadas > 0 ? ` Se generaron ${r.comisiones_generadas} comisión(es) pendiente(s): ya aparecen en Liquidaciones.` : "")
          : `${editando.nombre || editando.email} quedó sin referente.`
      );
      setEditando(null);
      setRecarga((n) => n + 1);
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "No se pudo guardar el referente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Usuarios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{total} usuario(s) registrado(s)</p>
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por correo, nombre o código de referido..."
        className="w-full min-h-[44px] px-4 border border-slate-300 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{error}</div>}
      {mensaje && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200 flex justify-between gap-3">
          <span>{mensaje}</span>
          <button onClick={() => setMensaje("")} className="font-semibold" aria-label="Cerrar mensaje">
            ✕
          </button>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron usuarios.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 dark:text-slate-300">
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
                        <p className="font-semibold text-slate-800 dark:text-white">{u.nombre || "—"}</p>
                        <p className="text-slate-500 dark:text-slate-400">{u.email}</p>
                        {!u.activo && <span className="text-xs font-semibold text-red-600">Cuenta desactivada</span>}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            u.rol === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700 dark:text-slate-200"
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
                            <p className="text-slate-800 dark:text-white">{u.referido_por_nombre || "—"}</p>
                            {u.referido_por_email && <p className="text-slate-500 dark:text-slate-400">{u.referido_por_email}</p>}
                            {u.referido_por_codigo && (
                              <code className="text-xs text-indigo-700">{u.referido_por_codigo}</code>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Sin referente</span>
                        )}
                        {u.rol !== "admin" && (
                          <button
                            onClick={() => abrirEditor(u)}
                            className="mt-1 block text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            {u.referido_por_codigo || u.referido_por_nombre ? "Cambiar referente" : "Asignar referente"}
                          </button>
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

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Referente de {editando.nombre || editando.email}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Escribe el código de quien lo invitó (ej. TU, U12). Déjalo vacío para quitar el referente.
              </p>
            </div>

            <input
              list="codigos-referente"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código de referido"
              autoFocus
              className="w-full min-h-[44px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="codigos-referente">
              {candidatos
                .filter((c) => c.id !== editando.id)
                .map((c) => (
                  <option key={c.id} value={c.codigo_referido}>
                    {c.nombre || c.email}
                  </option>
                ))}
            </datalist>

            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={retroactivo} onChange={(e) => setRetroactivo(e.target.checked)} className="mt-1" />
              <span>Generar comisiones de sus pedidos anteriores (para que el referente aparezca en Liquidaciones).</span>
            </label>

            {errorModal && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{errorModal}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditando(null)}
                disabled={guardando}
                className="min-h-[44px] px-4 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:bg-slate-800/50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarReferente}
                disabled={guardando}
                className="min-h-[44px] px-4 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
