// src/components/ClienteHome.tsx — Inicio del cliente: comisiones, pedidos, link de invitación
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useToast } from "../context/ToastContext";
import { getMisComisiones, type ComisionesRespuesta } from "../services/comisionesService";
import { getMisPedidos, type Pedido } from "../services/pedidosService";
import { getRedMia } from "../services/redService";
import type { Referido } from "../data/red";
import { contarRed } from "../data/red";
import EstadoBadge from "./EstadoBadge";

const dinero = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ClienteHome = () => {
  const { user } = useAuth();
  const { success } = useToast();
  const [comis, setComis] = useState<ComisionesRespuesta | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [red, setRed] = useState<Referido | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([getMisComisiones(), getMisPedidos(1, 5), getRedMia()])
      .then(([c, p, r]) => {
        if (!activo) return;
        setComis(c);
        setPedidos(p.data);
        setRed(r);
      })
      .catch((e: unknown) =>
        activo && setError(e instanceof Error ? e.message : "No se pudo cargar el inicio")
      )
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  // Comisiones del mes actual (por fecha de creación)
  const comisionesMes = useMemo(() => {
    if (!comis) return { monto: 0, cantidad: 0 };
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = ahora.getMonth();
    const delMes = comis.comisiones.filter((c) => {
      const d = new Date(c.creado_en);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    return {
      monto: delMes.reduce((s, c) => s + c.monto, 0),
      cantidad: delMes.length,
    };
  }, [comis]);

  const link = red?.codigo
    ? `${window.location.origin}/registro?ref=${red.codigo}`
    : "";

  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      success("Link copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia tu link:", link);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
        <div className="skeleton h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900">
        {error}
      </div>
    );
  }

  const nombreMes = new Date().toLocaleDateString("es", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="page-title">Hola{user?.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
        <p className="page-subtitle mt-1">Resumen de tu actividad en MultiCatálogo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Comisiones · {nombreMes}
          </p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {dinero(comisionesMes.monto)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{comisionesMes.cantidad} registro(s)</p>
        </div>
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pendientes
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {dinero(comis?.resumen.pendiente ?? 0)}
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pagadas
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {dinero(comis?.resumen.pagada ?? 0)}
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Referidos
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
            {red ? contarRed(red) : 0}
          </p>
          <Link to="/mi-red" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Ver mi red →
          </Link>
        </div>
      </div>

      {/* Link de invitación resumido */}
      {link && (
        <div className="card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Tu link de invitación</p>
              <code className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300 break-all block mt-1">
                {link}
              </code>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={copiar} className="btn-primary !min-h-[40px] text-sm">
                {copiado ? "¡Copiado!" : "Copiar"}
              </button>
              <Link to="/mi-red" className="btn-secondary !min-h-[40px] text-sm">
                Mi red
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Pedidos recientes */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Pedidos recientes</h2>
          <Link to="/mis-pedidos" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Ver todos →
          </Link>
        </div>
        {pedidos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Aún no tienes pedidos.</p>
            <Link to="/catalogo" className="btn-primary inline-flex">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pedidos.map((p) => (
              <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{p.numero}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(p.fecha).toLocaleDateString("es", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <EstadoBadge estado={p.estado} />
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {dinero(p.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/catalogo" className="card p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition text-center">
          <span className="text-2xl">🛍️</span>
          <p className="font-semibold text-slate-800 dark:text-white mt-1">Catálogo</p>
        </Link>
        <Link to="/mi-red" className="card p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition text-center">
          <span className="text-2xl">🌳</span>
          <p className="font-semibold text-slate-800 dark:text-white mt-1">Mi red</p>
        </Link>
        <Link to="/carrito" className="card p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition text-center">
          <span className="text-2xl">🛒</span>
          <p className="font-semibold text-slate-800 dark:text-white mt-1">Carrito</p>
        </Link>
      </div>
    </div>
  );
};

export default ClienteHome;
