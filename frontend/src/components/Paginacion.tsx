// src/components/Paginacion.tsx
// Controles Anterior / Siguiente para listados paginados.
interface Props {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

const Paginacion = ({ page, limit, total, onChange }: Props) => {
  const paginas = Math.max(1, Math.ceil(total / limit));
  if (paginas <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="min-h-[44px] px-4 rounded-lg border border-slate-300 font-semibold disabled:opacity-40">
        ← Anterior
      </button>
      <span>Página {page} de {paginas}</span>
      <button disabled={page >= paginas} onClick={() => onChange(page + 1)} className="min-h-[44px] px-4 rounded-lg border border-slate-300 font-semibold disabled:opacity-40">
        Siguiente →
      </button>
    </div>
  );
};

export default Paginacion;
