// src/components/AdminProductos.tsx — Admin productos con preview de imagen y UI renovada
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  getProductosAdmin,
  type ProductoAdmin,
  type ProductoForm,
} from "../services/adminProductosService";
import { useToast } from "../context/ToastContext";
import Paginacion from "./Paginacion";

const LIMIT = 10;
const FORM_VACIO: ProductoForm = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoria: "",
  img: "",
  stock: 0,
};

const AdminProductos = () => {
  const { success, error: toastError } = useToast();
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [editando, setEditando] = useState<{ id?: number } | null>(null);
  const [form, setForm] = useState<ProductoForm>(FORM_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [imgError, setImgError] = useState(false);

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
    setImgError(false);
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
    setImgError(false);
    setEditando({ id: p.id });
  };

  const validar = () => {
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
      if (editando?.id) {
        await actualizarProducto(editando.id, payload);
        success("Producto actualizado");
      } else {
        await crearProducto(payload);
        success("Producto creado");
      }
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
      success(`Producto ${p.activo ? "desactivado" : "reactivado"}`);
      cargar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "No se pudo actualizar");
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  };

  const Estado = ({ activo }: { activo: boolean }) => (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        activo
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle mt-0.5">Gestiona el catálogo (solo administradores)</p>
        </div>
        <button type="button" onClick={abrirCrear} className="btn-primary whitespace-nowrap">
          + Nuevo producto
        </button>
      </div>

      <div className="card p-4 mb-5">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o categoría..."
          className="input-field"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No hay productos{q ? " con ese criterio" : ""}.</p>
          <button type="button" onClick={abrirCrear} className="btn-primary mt-4">
            Crear el primero
          </button>
        </div>
      ) : (
        <>
          {/* Tabla escritorio */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left text-slate-500 dark:text-slate-400">
                  <th className="p-3 font-medium">Producto</th>
                  <th className="p-3 font-medium">Categoría</th>
                  <th className="p-3 font-medium">Precio</th>
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.img || "https://picsum.photos/seed/placeholder/80"}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                        />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{p.nombre}</p>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-[220px]">{p.descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{p.categoria}</td>
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                      ${p.precio.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          p.stock <= 5
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-slate-700 dark:text-slate-200"
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <Estado activo={p.activo} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(p)}
                          className="min-h-[40px] px-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarActivo(p)}
                          className={`min-h-[40px] px-3 text-sm font-semibold rounded-lg ${
                            p.activo
                              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                              : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                        >
                          {p.activo ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="md:hidden space-y-3">
            {productos.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex gap-3">
                  <img
                    src={p.img || "https://picsum.photos/seed/placeholder/80"}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{p.nombre}</h3>
                      <Estado activo={p.activo} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{p.categoria}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1">${p.precio.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Stock: {p.stock}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => abrirEditar(p)} className="btn-secondary flex-1 !min-h-[40px] text-sm">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarActivo(p)}
                    className={`flex-1 !min-h-[40px] text-sm font-semibold rounded-xl ${
                      p.activo ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {p.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Paginacion page={page} total={total} limit={LIMIT} onChange={setPage} />
          </div>
        </>
      )}

      {/* Modal crear/editar */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <div className="relative card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {editando.id ? "Editar producto" : "Nuevo producto"}
            </h2>

            {errorForm && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
                {errorForm}
              </div>
            )}

            <form onSubmit={guardar} className="space-y-4">
              {/* Preview imagen */}
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                  {form.img && !imgError ? (
                    <img
                      src={form.img}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                      onLoad={() => setImgError(false)}
                    />
                  ) : (
                    <span className="text-xs text-slate-400 text-center px-2">Sin imagen</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    URL de imagen
                  </label>
                  <input
                    className="input-field"
                    value={form.img}
                    onChange={(e) => {
                      setForm({ ...form, img: e.target.value });
                      setImgError(false);
                    }}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-slate-400 mt-1">Pega una URL pública. El preview se actualiza al instante.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  className="input-field"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                  <input
                    className="input-field"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  />
                  {errores.categoria && <p className="text-xs text-red-600 mt-1">{errores.categoria}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className="input-field"
                    value={form.precio || ""}
                    onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                  />
                  {errores.precio && <p className="text-xs text-red-600 mt-1">{errores.precio}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    className="input-field"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  />
                  {errores.stock && <p className="text-xs text-red-600 mt-1">{errores.stock}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1">
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductos;
