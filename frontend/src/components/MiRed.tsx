// src/components/MiRed.tsx — Red con expand/collapse, búsqueda y export PDF
import { useEffect, useMemo, useState } from "react";
import { contarRed, sumarVentasRed, TASA_COMISION, type Referido } from "../data/red";
import { getRedMia } from "../services/redService";
import { getMisComisiones, type ComisionesRespuesta } from "../services/comisionesService";
import { getMisLiquidaciones, type Liquidacion } from "../services/liquidacionesService";
import { useToast } from "../context/ToastContext";
import { exportarPDF } from "../utils/pdf";
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

/** Recolecta todos los ids del árbol (excepto la raíz opcional). */
function todosIds(nodo: Referido, acc: number[] = []): number[] {
  acc.push(nodo.id);
  (nodo.hijos ?? []).forEach((h) => todosIds(h, acc));
  return acc;
}

/** ¿El nodo o algún descendiente coincide con la búsqueda? */
function coincideBusqueda(nodo: Referido, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  if ((nodo.nombre ?? "").toLowerCase().includes(t)) return true;
  return (nodo.hijos ?? []).some((h) => coincideBusqueda(h, q));
}

interface NodoProps {
  nodo: Referido;
  expanded: Set<number>;
  toggle: (id: number) => void;
  busqueda: string;
}

const NodoReferido = ({ nodo, expanded, toggle, busqueda }: NodoProps) => {
  const estilo = NIVEL_ESTILO[nodo.nivel] ?? NIVEL_ESTILO[1];
  const tieneHijos = (nodo.hijos?.length ?? 0) > 0;
  const abierto = expanded.has(nodo.id);
  const q = busqueda.trim();
  const hijosVisibles = (nodo.hijos ?? []).filter((h) => coincideBusqueda(h, q));
  const matchDirecto = !q || (nodo.nombre ?? "").toLowerCase().includes(q.toLowerCase());

  if (q && !coincideBusqueda(nodo, q)) return null;

  return (
    <li>
      <div
        className={`card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border ${estilo.border} ${
          matchDirecto && q ? "ring-2 ring-indigo-400/50" : ""
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {tieneHijos ? (
            <button
              type="button"
              onClick={() => toggle(nodo.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
              aria-label={abierto ? "Colapsar" : "Expandir"}
            >
              <svg
                className={`w-4 h-4 transition-transform ${abierto ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-8 h-8 shrink-0" />
          )}
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 shrink-0">
            {nodo.nombre.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-white truncate">{nodo.nombre}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estilo.badge}`}>
              Nivel {nodo.nivel} · {estilo.tasa} comisión
            </span>
          </div>
        </div>
        <div className="text-right pl-10 sm:pl-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">Ventas</p>
          <p className="font-bold text-slate-800 dark:text-white">${nodo.ventas.toLocaleString()}</p>
        </div>
      </div>

      {tieneHijos && (abierto || !!q) && hijosVisibles.length > 0 && (
        <ul className="mt-3 ml-4 sm:ml-6 space-y-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3 sm:pl-4">
          {hijosVisibles.map((hijo) => (
            <NodoReferido
              key={hijo.id}
              nodo={hijo}
              expanded={expanded}
              toggle={toggle}
              busqueda={busqueda}
            />
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
  const [busqueda, setBusqueda] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await getRedMia();
        if (!activo) return;
        setRed(r);
        const ids = new Set<number>();
        (r.hijos ?? []).forEach((h) => ids.add(h.id));
        setExpanded(ids);
      } catch (e: unknown) {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo cargar la red");
      }
      try {
        const c = await getMisComisiones();
        if (activo) setComis(c);
      } catch {
        if (activo) setComis({ comisiones: [], resumen: { pendiente: 0, pagada: 0, total: 0 } });
      }
      try {
        const l = await getMisLiquidaciones();
        if (activo) setCobros(l);
      } catch {
        if (activo) setCobros([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandirTodo = () => {
    if (!red) return;
    setExpanded(new Set(todosIds(red)));
  };

  const colapsarTodo = () => {
    setExpanded(new Set());
  };

  const filasComisiones = () =>
    (comis?.comisiones ?? []).map((c) => ({
      id: c.id,
      fecha: new Date(c.creado_en).toLocaleDateString("es"),
      pedido: `MC-${String(c.pedido_id).padStart(6, "0")}`,
      nivel: c.nivel,
      porcentaje: c.porcentaje,
      monto: c.monto.toFixed(2),
      estado: c.estado,
    }));

  const exportarComisionesPdf = () => {
    if (!comis || comis.comisiones.length === 0) {
      success("No hay comisiones para exportar");
      return;
    }
    exportarPDF({
      titulo: "Mis comisiones",
      subtitulo: "Red de referidos · MultiCatálogo",
      columnas: [
        { key: "fecha", label: "Fecha" },
        { key: "pedido", label: "Pedido" },
        { key: "nivel", label: "Nivel" },
        { key: "porcentaje", label: "%" },
        { key: "monto", label: "Monto", align: "right" },
        { key: "estado", label: "Estado" },
      ],
      filas: filasComisiones().map((f) => ({ ...f, monto: "$" + f.monto })),
    });
  };

  // Hooks siempre antes de cualquier return (reglas de React)
  const hijosFiltrados = useMemo(
    () => (red?.hijos ?? []).filter((h) => coincideBusqueda(h, busqueda.trim())),
    [red, busqueda]
  );

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Mi Red de Referidos</h1>
          <p className="page-subtitle mt-1">
            Gana el {TASA_COMISION[1] * 100} % de nivel 1, {TASA_COMISION[2] * 100} % de nivel 2 y{" "}
            {TASA_COMISION[3] * 100} % de nivel 3.
          </p>
        </div>
        <button type="button" onClick={exportarComisionesPdf} className="btn-primary text-sm shrink-0">
          Exportar PDF
        </button>
      </div>

      <div className="card p-4 sm:p-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Tu link de invitación</p>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-3 overflow-x-auto">
            <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all select-all">
              {link}
            </code>
          </div>
          <button type="button" onClick={copiar} className="btn-primary shrink-0 sm:min-w-[110px]">
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Jerarquía de tu Red</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={expandirTodo} className="btn-secondary !min-h-[36px] !px-3 text-xs">
              Expandir todo
            </button>
            <button type="button" onClick={colapsarTodo} className="btn-secondary !min-h-[36px] !px-3 text-xs">
              Colapsar
            </button>
          </div>
        </div>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar referido por nombre..."
          className="input-field mb-4"
        />

        <div className="mb-4 rounded-xl bg-slate-900 dark:bg-indigo-950 border border-slate-700 dark:border-indigo-800 px-4 py-3 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">
            {red.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{red.nombre || "Tú"}</p>
            <p className="text-xs text-slate-300">Tú · raíz de la red</p>
          </div>
        </div>

        {hijosFiltrados.length > 0 ? (
          <ul className="space-y-3">
            {hijosFiltrados.map((hijo) => (
              <NodoReferido
                key={hijo.id}
                nodo={hijo}
                expanded={expanded}
                toggle={toggle}
                busqueda={busqueda}
              />
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {busqueda.trim()
              ? "Ningún referido coincide con la búsqueda."
              : "Aún no tienes referidos. ¡Comparte tu link!"}
          </p>
        )}
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Mis comisiones</h2>
          <button type="button" onClick={exportarComisionesPdf} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            PDF
          </button>
        </div>
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
