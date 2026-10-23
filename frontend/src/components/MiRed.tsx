// src/components/MiRed.tsx — Red multinivel con soporte dark mode
import { useEffect, useState } from "react";
import { contarRed, sumarVentasRed, TASA_COMISION, type Referido } from "../data/red";
import { getRedMia } from "../services/redService";
import { getMisComisiones, type ComisionesRespuesta } from "../services/comisionesService";
import { getMisLiquidaciones, type Liquidacion } from "../services/liquidacionesService";
import { useToast } from "../context/ToastContext";
import EstadoBadge from "./EstadoBadge";

const NIVEL_ESTILO: Record<number, { badge: string; border: string; tasa: string }> = {
  1: {
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
    tasa: "10 %",
  },
  2: {
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    tasa: "5 %",
  },
  3: {
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
    tasa: "2 %",
  },
};

const NodoReferido = ({ nodo }: { nodo: Referido }) => {
  const estilo = NIVEL_ESTILO[nodo.nivel] ?? NIVEL_ESTILO[1];
  return (
    <li>
      <div
        className={`card p-4 flex flex-wrap items-center justify-between gap-3 border ${estilo.border}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200">
            {nodo.nombre.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{nodo.nombre}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estilo.badge}`}>
              Nivel {nodo.nivel} · {estilo.tasa} comisión
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500 dark:text-slate-400">Ventas</p>
          <p className="font-bold text-slate-800 dark:text-white">${nodo.ventas.toLocaleString()}</p>
        </div>
      </div>

      {nodo.hijos && nodo.hijos.length > 0 && (
        <ul className="mt-3 ml-4 sm:ml-6 space-y-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3 sm:pl-4">
          {nodo.hijos.map((hijo) => (
            <NodoReferido key={hijo.id} nodo={hijo} />
          ))}
        </ul>
      )}
    </li>
  );
};

const MiRed = () => {
  const { success } = useToast();
  const [red, setRed] = useState<Referido | null>(null);
  const [comis, setComis] = useState<ComisionesRespuesta | null>(null);
  const [cobros, setCobros] = useState<Liquidacion[]>([]);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([getRedMia(), getMisComisiones(), getMisLiquidaciones()])
      .then(([r, c, l]) => {
        if (!activo) return;
        setRed(r);
        setComis(c);
        setCobros(l);
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : "No se pudo cargar la red"));
    return () => {
      activo = false;
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900">
        {error}
      </div>
    );
  }
  if (!red || !comis) {
    return <p className="text-slate-500 dark:text-slate-400">Cargando tu red...</p>;
  }

  const link = `${window.location.origin}/registro?ref=${red.codigo ?? ""}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      success("Link copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia tu link:", link);
    }
  };

  const resumen = [
    { etiqueta: "Referidos", valor: contarRed(red).toString(), color: "text-indigo-600 dark:text-indigo-400" },
    {
      etiqueta: "Ventas de la Red",
      valor: `$${sumarVentasRed(red).toLocaleString()}`,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      etiqueta: "Comisiones Pendientes",
      valor: `$${comis.resumen.pendiente.toFixed(2)}`,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      etiqueta: "Comisiones Pagadas",
      valor: `$${comis.resumen.pagada.toFixed(2)}`,
      color: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="page-title">Mi Red de Referidos</h1>
        <p className="page-subtitle mt-1">
          Gana el {TASA_COMISION[1] * 100} % de nivel 1, {TASA_COMISION[2] * 100} % de nivel 2 y{" "}
          {TASA_COMISION[3] * 100} % de nivel 3.
        </p>
      </div>

      {/* Link de invitación */}
      <div className="card p-4 sm:p-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Tu link de invitación</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="input-field font-mono text-sm" />
          <button type="button" onClick={copiar} className="btn-primary shrink-0 sm:min-w-[110px]">
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {resumen.map((item) => (
          <div key={item.etiqueta} className="card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.etiqueta}
            </p>
            <p className={`text-2xl sm:text-3xl font-bold mt-1 ${item.color}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Jerarquía */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Jerarquía de tu Red</h2>

        {/* Nodo raíz (tú) */}
        <div className="mb-4 rounded-xl bg-slate-900 dark:bg-indigo-950 border border-slate-700 dark:border-indigo-800 px-4 py-3 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">
            {red.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{red.nombre || "Tú"}</p>
            <p className="text-xs text-slate-300">Tú · raíz de la red</p>
          </div>
        </div>

        {red.hijos && red.hijos.length > 0 ? (
          <ul className="space-y-3">
            {red.hijos.map((hijo) => (
              <NodoReferido key={hijo.id} nodo={hijo} />
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aún no tienes referidos. ¡Comparte tu link!</p>
        )}
      </div>

      {/* Ledger */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Mis comisiones</h2>
        {comis.comisiones.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Todavía no has generado comisiones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="p-2.5 font-medium">Fecha</th>
                  <th className="p-2.5 font-medium">Pedido</th>
                  <th className="p-2.5 font-medium">Nivel</th>
                  <th className="p-2.5 font-medium text-right">Monto</th>
                  <th className="p-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {comis.comisiones.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-2.5">{new Date(c.creado_en).toLocaleDateString()}</td>
                    <td className="p-2.5">MC-{String(c.pedido_id).padStart(6, "0")}</td>
                    <td className="p-2.5">
                      {c.nivel} · {c.porcentaje} %
                    </td>
                    <td className="p-2.5 text-right font-semibold">${c.monto.toFixed(2)}</td>
                    <td className="p-2.5">
                      <EstadoBadge estado={c.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cobros recibidos */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Mis cobros</h2>
        {cobros.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aún no has recibido pagos.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cobros.map((l) => (
              <li key={l.id} className="py-3 flex justify-between text-sm text-slate-700 dark:text-slate-200">
                <span>
                  {new Date(l.creado_en).toLocaleDateString()} · Liquidación #{l.id}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ${l.total.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MiRed;
