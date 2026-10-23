/** Utilidades para exportar datos a CSV descargable en el navegador. */

function escaparCelda(valor: unknown): string {
  const s = valor == null ? "" : String(valor);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function aCSV(filas: Record<string, unknown>[], columnas?: string[]): string {
  if (filas.length === 0) return "";
  const cols = columnas ?? Object.keys(filas[0]);
  const header = cols.map(escaparCelda).join(",");
  const body = filas.map((f) => cols.map((c) => escaparCelda(f[c])).join(",")).join("\n");
  return "\uFEFF" + header + "\n" + body;
}

export function descargarCSV(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre.endsWith(".csv") ? nombre : `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
