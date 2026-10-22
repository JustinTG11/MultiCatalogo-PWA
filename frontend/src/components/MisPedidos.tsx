// src/components/MisPedidos.tsx
// Historial de compras del usuario: número, fecha, total y estado, con detalle expandible.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMisPedidos, getPedido, type Pedido } from "../services/pedidosService";
import EstadoBadge from "./EstadoBadge";
import Paginacion from "./Paginacion";

const LIMIT = 10;

const MisPedidos = () => {
  const [page, setPage] = useState(1);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Record<number, Pedido>>({});

  useEffect(() => {
    let activo = true;
    getMisPedidos(page, LIMIT)
      .then((r) => {
        if (!activo) return;
        setPedidos(r.data);
        setTotal(r.total);
        setError("");
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => activo && setLoading(false));
    return () => {
      activo = false;
    };
  }, [page]);

  const cambiarPagina = (p: number) => {
    setLoading(true);
    setAbierto(null);
    setPage(p);
  };

  const alternar = async (id: number) => {
    if (abierto === id) return setAbierto(null);
    setAbierto(id);
    if (!detalle[id]) {
      try {
        const d = await getPedido(id);
        setDetalle((prev) => ({ ...prev, [id]: d }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el detalle");
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mis pedidos</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando pedidos...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl border border-slate-200 text-slate-500">
          Aún no tienes pedidos.{" "}
          <Link to="/tienda" className="text-indigo-600 font-semibold hover:underline">Ir a la tienda</Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {pedidos.map((p) => (
              <li key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => alternar(p.id)} className="w-full min-h-[44px] p-4 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">{p.numero}</p>
                    <p className="text-sm text-slate-500">{new Date(p.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <EstadoBadge estado={p.estado} />
                    <span className="font-bold text-slate-800">${p.total.toFixed(2)}</span>
                  </div>
                </button>

                {abierto === p.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 text-sm">
                    {!detalle[p.id] ? (
                      <p className="text-slate-500">Cargando detalle...</p>
                    ) : (
                      <ul className="space-y-1">
                        {detalle[p.id].items?.map((it, i) => (
                          <li key={i} className="flex justify-between">
                            <span>{it.cantidad} × {it.nombre}</span>
                            <span>${(it.cantidad * it.precio).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Paginacion page={page} limit={LIMIT} total={total} onChange={cambiarPagina} />
        </>
      )}
    </div>
  );
};

export default MisPedidos;
