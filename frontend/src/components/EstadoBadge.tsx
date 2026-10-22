// src/components/EstadoBadge.tsx
// Etiqueta de color para el estado de un pedido o una comisión.
const ESTILOS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  preparando: "bg-blue-100 text-blue-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregado: "bg-emerald-100 text-emerald-700",
  pagada: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
  revertida: "bg-red-100 text-red-700",
};

const EstadoBadge = ({ estado }: { estado: string }) => (
  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${ESTILOS[estado] ?? "bg-slate-200 text-slate-600"}`}>
    {estado}
  </span>
);

export default EstadoBadge;
