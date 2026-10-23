// src/components/Dashboard.tsx
// Dashboard admin con datos REALES del negocio (/api/reportes/*): KPIs del periodo,
// top productos, top referidos y deuda de comisiones. Con estados de carga, error y vacío.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeudas, type Deuda } from "../services/liquidacionesService";
import {
  getResumen,
  getTopProductos,
  getTopReferidos,
  type Resumen,
  type TopProducto,
  type TopReferido,
} from "../services/reportesService";

const dinero = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Vacio = ({ texto }: { texto: string }) => <p className="text-sm text-slate-500 dark:text-slate-400">{texto}</p>;

const Dashboard = () => {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [productos, setProductos] = useState<TopProducto[]>([]);
  const [referidos, setReferidos] = useState<TopReferido[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Top productos / referidos / deuda no dependen del periodo: se cargan una vez
  useEffect(() => {
    Promise.all([getTopProductos(), getTopReferidos(), getDeudas()])
      .then(([p, r, d]) => {
        setProductos(p);
        setReferidos(r);
        setDeudas(d);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudieron cargar los reportes"));
  }, []);

  // El resumen sí se recalcula al cambiar el periodo
  useEffect(() => {
    let activo = true;
    getResumen(desde, hasta)
      .then((r) => {
        if (!activo) return;
        setResumen(r);
        setError("");
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : "No se pudo cargar el resumen"))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [desde, hasta]);

  if (cargando) return <p className="text-slate-500 dark:text-slate-400">Cargando resumen...</p>;

  const kpis = resumen
    ? [
        { etiqueta: "Total Vendido", valor: dinero(resumen.total_vendido), color: "text-indigo-600" },
        { etiqueta: "Pedidos", valor: resumen.num_pedidos.toString(), color: "text-indigo-600" },
        { etiqueta: "Ticket Promedio", valor: dinero(resumen.ticket_promedio), color: "text-amber-600" },
        { etiqueta: "Comisiones Devengadas", valor: dinero(resumen.comisiones_total), color: "text-green-600" },
      ]
    : [];
  const totalDeuda = deudas.reduce((s, d) => s + d.ventas, 0);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Resumen General</h1>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Desde
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600" />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Hasta
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600" />
          </label>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(""); setHasta(""); }} className="min-h-[44px] px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg">
              Todo el periodo
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.etiqueta} className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold">{k.etiqueta}</p>
            <p className={`text-3xl font-bold mt-2 ${k.color}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Top Productos</h2>
          {productos.length === 0 ? (
            <Vacio texto="Aún no hay ventas registradas." />
          ) : (
            <ul className="space-y-3">
              {productos.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.cantidad} unidades</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white">{dinero(p.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Top Referidos</h2>
          {referidos.length === 0 ? (
            <Vacio texto="Aún no hay referidos con ventas." />
          ) : (
            <ul className="space-y-3">
              {referidos.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="font-semibold text-slate-800 dark:text-white">{r.nombre}</p>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white">{dinero(r.ventas)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Comisiones por pagar</h2>
            <Link to="/admin/liquidaciones" className="text-sm font-semibold text-indigo-600 hover:underline">Ir a liquidar →</Link>
          </div>
          {deudas.length === 0 ? (
            <Vacio texto="No hay comisiones pendientes." />
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Deuda total: <span className="font-bold text-amber-600">{dinero(totalDeuda)}</span></p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deudas.map((d) => (
                  <li key={d.id} className="flex justify-between p-3 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-800 dark:text-white">{d.nombre}</span>
                    <span className="font-bold text-amber-600">{dinero(d.ventas)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
