// src/components/EstadoBadge.tsx
const ESTILOS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  preparando: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  enviado: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  entregado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pagada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  revertida: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const EstadoBadge = ({ estado }: { estado: string }) => (
  <span
    className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
      ESTILOS[estado] ?? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
    }`}
  >
    {estado}
  </span>
);

export default EstadoBadge;
