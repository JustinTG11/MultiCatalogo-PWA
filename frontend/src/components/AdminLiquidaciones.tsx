// src/components/AdminLiquidaciones.tsx
// Cierra el ciclo del dinero: deuda de comisiones por distribuidor + botón "Liquidar" + historial de pagos.
import { useCallback, useEffect, useState } from "react";
import {
  getDeudas,
  getLiquidacionesAdmin,
  liquidar,
  type Deuda,
  type Liquidacion,
} from "../services/liquidacionesService";
import Paginacion from "./Paginacion";

const LIMIT = 10;

const AdminLiquidaciones = () => {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(() => {
    Promise.all([getDeudas(), getLiquidacionesAdmin()])
      .then(([d, h]) => {
        setDeudas(d);
        setHistorial(h);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(cargar, [cargar]);

  const pagar = async (d: Deuda) => {
    if (!window.confirm(`¿Liquidar $${d.ventas.toFixed(2)} a ${d.nombre}? Las comisiones pasarán a "pagada".`)) return;
    setProcesando(d.id);
    try {
      await liquidar(d.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo liquidar");
    } finally {
      setProcesando(null);
    }
  };

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Cargando liquidaciones...</p>;

  const totalDeuda = deudas.reduce((s, d) => s + d.ventas, 0);
  const pagina = historial.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Liquidaciones</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{error}</div>}

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Deuda por distribuidor</h2>
          <span className="text-sm font-semibold text-amber-600">Total: ${totalDeuda.toFixed(2)}</span>
        </div>
        {deudas.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay comisiones pendientes. 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {deudas.map((d) => (
              <li key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{d.nombre}</p>
                  <p className="text-sm text-amber-600 font-semibold">${d.ventas.toFixed(2)} pendientes</p>
                </div>
                <button
                  onClick={() => pagar(d)}
                  disabled={procesando === d.id}
                  className="min-h-[44px] px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {procesando === d.id ? "Liquidando..." : "Liquidar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Historial de pagos</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aún no se ha liquidado nada.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Distribuidor</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="p-2">{l.id}</td>
                      <td className="p-2">{l.referido_nombre ?? `#${l.referido_id}`}</td>
                      <td className="p-2">{new Date(l.creado_en).toLocaleDateString()}</td>
                      <td className="p-2 text-right font-semibold">${l.total.toFixed(2)}</td>
                      <td className="p-2 capitalize">{l.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion page={page} limit={LIMIT} total={historial.length} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
};

export default AdminLiquidaciones;
