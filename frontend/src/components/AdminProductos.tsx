// src/components/AdminProductos.tsx
// Administración del catálogo (solo admin): tabla en escritorio, tarjetas en móvil,
// formulario crear/editar en modal y activar/desactivar con confirmación.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  getProductosAdmin,
  type ProductoAdmin,
  type ProductoForm,
} from "../services/adminProductosService";
import Paginacion from "./Paginacion";

const LIMIT = 10;

const FORM_VACIO: ProductoForm = { nombre: "", descripcion: "", precio: 0, categoria: "", img: "", stock: 0 };

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none";

const AdminProductos = () => {
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState(""); // término ya "estabilizado" (debounce) que viaja al servidor
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // null = modal cerrado; { id: undefined } = crear; { id } = editar
  const [editando, setEditando] = useState<{ id?: number } | null>(null);
  const [form, setForm] = useState<ProductoForm>(FORM_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    getProductosAdmin(q, page, LIMIT)
      .then((r) => {
        setProductos(r.data);
        setTotal(r.total);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => setLoading(false));
  }, [q, page]);

  useEffect(cargar, [cargar]);

  // Debounce: espera 350 ms tras la última tecla antes de pedir al servidor
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(busqueda.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setErrores({});
    setErrorForm("");
    setEditando({});
  };

  const abrirEditar = (p: ProductoAdmin) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      img: p.img,
      stock: p.stock,
    });
    setErrores({});
    setErrorForm("");
    setEditando({ id: p.id });
  };

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Obligatorio";
    if (!form.categoria.trim()) e.categoria = "Obligatoria";
    if (!(form.precio > 0)) e.precio = "Debe ser mayor que 0";
    if (!Number.isInteger(form.stock) || form.stock < 0) e.stock = "Entero ≥ 0";
    return e;
  };

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    setErrorForm("");
    try {
      const payload = { ...form, nombre: form.nombre.trim(), categoria: form.categoria.trim() };
      if (editando?.id) await actualizarProducto(editando.id, payload);
      else await crearProducto(payload);
      setEditando(null);
      cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (p: ProductoAdmin) => {
    const accion = p.activo ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Seguro que quieres ${accion} "${p.nombre}"?`)) return;
    try {
      if (p.activo) await desactivarProducto(p.id);
      else await actualizarProducto(p.id, { activo: true });
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  };

  const filtrados = productos; // el filtrado ya lo hizo el servidor

  const Estado = ({ activo }: { activo: boolean }) => (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );

  const Acciones = ({ p }: { p: ProductoAdmin }) => (
    <div className="flex gap-2">
      <button onClick={() => abrirEditar(p)} className="min-h-[44px] px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg">
        Editar
      </button>
      <button
        onClick={() => alternarActivo(p)}
        className={`min-h-[44px] px-3 text-sm font-semibold rounded-lg ${p.activo ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}
      >
        {p.activo ? "Desactivar" : "Reactivar"}
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
        <div className="flex gap-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className={`${inputClass} sm:w-56`}
          />
          <button onClick={abrirCrear} className="min-h-[44px] px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 whitespace-nowrap">
            + Nuevo
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando productos...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-200">No hay productos para mostrar.</div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <div className="md:hidden space-y-3">
            {filtrados.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                <img src={p.img} alt={p.nombre} className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{p.nombre}</p>
                    <Estado activo={p.activo} />
                  </div>
                  <p className="text-sm text-slate-500">{p.categoria} · Stock {p.stock}</p>
                  <p className="text-sm font-semibold text-slate-700">${p.precio.toFixed(2)}</p>
                  <Acciones p={p} />
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio: tabla */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="p-3">Img</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3"><img src={p.img} alt={p.nombre} className="w-10 h-10 rounded object-cover bg-slate-100" /></td>
                    <td className="p-3 font-medium text-slate-800">{p.nombre}</td>
                    <td className="p-3 text-slate-600">{p.categoria}</td>
                    <td className="p-3 text-right">${p.precio.toFixed(2)}</td>
                    <td className="p-3 text-right">{p.stock}</td>
                    <td className="p-3"><Estado activo={p.activo} /></td>
                    <td className="p-3"><Acciones p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      {/* Modal crear / editar */}
      {editando && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditando(null)}>
          <form
            onSubmit={guardar}
            noValidate
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4"
          >
            <h2 className="text-xl font-bold text-slate-800">{editando.id ? "Editar producto" : "Nuevo producto"}</h2>
            {errorForm && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{errorForm}</div>}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input className={inputClass} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea className={inputClass} rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input className={inputClass} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                {errores.categoria && <p className="text-xs text-red-600 mt-1">{errores.categoria}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($)</label>
                <input type="number" step="0.01" min="0" inputMode="decimal" className={inputClass} value={form.precio || ""} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
                {errores.precio && <p className="text-xs text-red-600 mt-1">{errores.precio}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                <input type="number" step="1" min="0" inputMode="numeric" className={inputClass} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                {errores.stock && <p className="text-xs text-red-600 mt-1">{errores.stock}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL de imagen</label>
                <input className={inputClass} value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditando(null)} className="flex-1 min-h-[44px] rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 min-h-[44px] rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProductos;
