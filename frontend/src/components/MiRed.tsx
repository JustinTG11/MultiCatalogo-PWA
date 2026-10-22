// src/components/MiRed.tsx
// Red multinivel del usuario autenticado (GET /api/red/mia): SU subárbol, no el global.
// - Link de invitación (/registro?ref=CODIGO) con botón copiar
// - KPIs: referidos, ventas de la red y comisiones reales del ledger (pendiente / pagada)
// - Árbol jerárquico y tabla "Mis comisiones"
import { useEffect, useState } from "react";
import { contarRed, sumarVentasRed, TASA_COMISION, type Referido } from "../data/red";
import { getRedMia } from "../services/redService";
import { getMisComisiones, type ComisionesRespuesta } from "../services/comisionesService";
import { getMisLiquidaciones, type Liquidacion } from "../services/liquidacionesService";
import EstadoBadge from "./EstadoBadge";

const NIVEL_ESTILO: Record<number, { badge: string; border: string; tasa: string }> = {
  1: { badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200", tasa: "10 %" },
  2: { badge: "bg-purple-100 text-purple-700", border: "border-purple-200", tasa: "5 %" },
  3: { badge: "bg-pink-100 text-pink-700", border: "border-pink-200", tasa: "2 %" },
};

// Componente recursivo (la prop se llama "nodo" porque "ref" está reservada en React 19)
const NodoReferido = ({ nodo }: { nodo: Referido }) => {
  const estilo = NIVEL_ESTILO[nodo.nivel] ?? NIVEL_ESTILO[1];
  return (
    <li>
      <div className={`bg-white rounded-lg border ${estilo.border} shadow-sm p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
            {nodo.nombre.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{nodo.nombre}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estilo.badge}`}>
              Nivel {nodo.nivel} · {estilo.tasa} comisión
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Ventas</p>
          <p className="font-bold text-slate-800">${nodo.ventas.toLocaleString()}</p>
        </div>
      </div>

      {nodo.hijos && nodo.hijos.length > 0 && (
        <ul className="mt-3 ml-4 sm:ml-6 space-y-3 border-l-2 border-slate-200 pl-3 sm:pl-4">
          {nodo.hijos.map((hijo) => (
            <NodoReferido key={hijo.id} nodo={hijo} />
          ))}
        </ul>
      )}
    </li>
  );
};

const MiRed = () => {
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

  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>;
  if (!red || !comis) return <p className="text-slate-500">Cargando tu red...</p>;

  const link = `${window.location.origin}/registro?ref=${red.codigo ?? ""}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia tu link:", link); // respaldo si el navegador bloquea el portapapeles
    }
  };

  const resumen = [
    { etiqueta: "Referidos", valor: contarRed(red).toString(), color: "text-indigo-600" },
    { etiqueta: "Ventas de la Red", valor: `$${sumarVentasRed(red).toLocaleString()}`, color: "text-indigo-600" },
    { etiqueta: "Comisiones Pendientes", valor: `$${comis.resumen.pendiente.toFixed(2)}`, color: "text-amber-600" },
    { etiqueta: "Comisiones Pagadas", valor: `$${comis.resumen.pagada.toFixed(2)}`, color: "text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Mi Red de Referidos</h1>
        <p className="text-slate-500">
          Gana el {TASA_COMISION[1] * 100} % de nivel 1, {TASA_COMISION[2] * 100} % de nivel 2 y {TASA_COMISION[3] * 100} % de nivel 3.
        </p>
      </div>

      {/* Link de invitación */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6">
        <p className="text-sm font-semibold text-slate-700 mb-2">Tu link de invitación</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm font-mono" onFocus={(e) => e.target.select()} />
          <button onClick={copiar} className="min-h-[44px] px-5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {resumen.map((item) => (
          <div key={item.etiqueta} className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 uppercase font-semibold">{item.etiqueta}</p>
            <p className={`text-3xl font-bold mt-2 ${item.color}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Árbol */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Jerarquía de tu Red</h2>
        <div className="bg-slate-900 text-white rounded-lg p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">{red.nombre.charAt(0)}</div>
          <p className="font-semibold">{red.nombre}</p>
        </div>
        {red.hijos && red.hijos.length > 0 ? (
          <ul className="space-y-3">
            {red.hijos.map((hijo) => (
              <NodoReferido key={hijo.id} nodo={hijo} />
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">Aún no tienes referidos. ¡Comparte tu link!</p>
        )}
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Mis comisiones</h2>
        {comis.comisiones.length === 0 ? (
          <p className="text-slate-500 text-sm">Todavía no has generado comisiones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600 bg-slate-50">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Pedido</th>
                  <th className="p-2">Nivel</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {comis.comisiones.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="p-2">{new Date(c.creado_en).toLocaleDateString()}</td>
                    <td className="p-2">MC-{String(c.pedido_id).padStart(6, "0")}</td>
                    <td className="p-2">{c.nivel} · {c.porcentaje} %</td>
                    <td className="p-2 text-right font-semibold">${c.monto.toFixed(2)}</td>
                    <td className="p-2"><EstadoBadge estado={c.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cobros recibidos */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Mis cobros</h2>
        {cobros.length === 0 ? (
          <p className="text-slate-500 text-sm">Aún no has recibido pagos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cobros.map((l) => (
              <li key={l.id} className="py-3 flex justify-between text-sm">
                <span>{new Date(l.creado_en).toLocaleDateString()} · Liquidación #{l.id}</span>
                <span className="font-semibold text-green-600">${l.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MiRed;
