// src/components/AdminPedidos.tsx
// Gestión de pedidos (solo admin): filtro por estado, paginación y cambio de estado.
// Solo se ofrecen las transiciones válidas; cancelar devuelve el stock y revierte comisiones (lo hace el servidor).
import { useCallback, useEffect, useState } from "react";
import {
  cambiarEstadoPedido,
  getPedidosAdmin,
  SIGUIENTES,
  type EstadoPedido,
  type Pedido,
} from "../services/pedidosService";
import EstadoBadge from "./EstadoBadge";
import Paginacion from "./Paginacion";

const LIMIT = 10;
const ESTADOS: EstadoPedido[] = ["pendiente", "preparando", "enviado", "entregado", "cancelado"];

const AdminPedidos = () => {
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    getPedidosAdmin(estado, page, LIMIT)
      .then((r) => {
        setPedidos(r.data);
        setTotal(r.total);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => setLoading(false));
  }, [estado, page]);

  useEffect(cargar, [cargar]);

  const mover = async (p: Pedido, nuevo: EstadoPedido) => {
    const aviso = nuevo === "cancelado" ? " Se devolverá el stock y se revertirán las comisiones." : "";
    if (!window.confirm(`¿Pasar ${p.numero} a "${nuevo}"?${aviso}`)) return;
    try {
      await cambiarEstadoPedido(p.id, nuevo);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    }
  };

  const Acciones = ({ p }: { p: Pedido }) => (
    <div className="flex flex-wrap gap-2">
      {SIGUIENTES[p.estado].length === 0 ? (
        <span className="text-xs text-slate-400">Sin acciones</span>
      ) : (
        SIGUIENTES[p.estado].map((s) => (
          <button
            key={s}
            onClick={() => mover(p, s)}
            className={`min-h-[44px] px-3 text-sm font-semibold rounded-lg border capitalize ${
              s === "cancelado" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            {s === "cancelado" ? "Cancelar" : `→ ${s}`}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white capitalize"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando pedidos...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl border border-slate-200 text-slate-500">No hay pedidos para mostrar.</div>
      ) : (
        <>
          {/* Móvil: tarjetas */}
          <div className="md:hidden space-y-3">
            {pedidos.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{p.numero}</p>
                  <EstadoBadge estado={p.estado} />
                </div>
                <p className="text-sm text-slate-500">{p.cliente.nombre} · {p.cliente.ciudad}</p>
                <p className="text-sm font-bold text-slate-700">${p.total.toFixed(2)} · {new Date(p.fecha).toLocaleDateString()}</p>
                <Acciones p={p} />
              </div>
            ))}
          </div>

          {/* Escritorio: tabla */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-800">{p.numero}</td>
                    <td className="p-3 text-slate-600">{p.cliente.nombre}<br /><span className="text-xs text-slate-400">{p.cliente.email}</span></td>
                    <td className="p-3 text-slate-600">{new Date(p.fecha).toLocaleDateString()}</td>
                    <td className="p-3 text-right">${p.total.toFixed(2)}</td>
                    <td className="p-3"><EstadoBadge estado={p.estado} /></td>
                    <td className="p-3"><Acciones p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminPedidos;
