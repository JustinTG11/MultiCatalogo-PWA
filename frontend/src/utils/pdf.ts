/**
 * Exporta un reporte a PDF usando la impresión del navegador
 * (Sin dependencias: el usuario elige "Guardar como PDF" en el diálogo).
 */

export interface ColumnaPDF {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

function escaparHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportarPDF(opts: {
  titulo: string;
  subtitulo?: string;
  columnas: ColumnaPDF[];
  filas: Record<string, unknown>[];
  nombreArchivo?: string;
}) {
  const { titulo, subtitulo, columnas, filas } = opts;
  const fecha = new Date().toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const thead = columnas
    .map(
      (c) =>
        `<th style="text-align:${c.align ?? "left"};padding:8px 10px;border-bottom:2px solid #312e81;background:#eef2ff;color:#312e81;font-size:12px;">${escaparHtml(c.label)}</th>`
    )
    .join("");

  const tbody = filas
    .map((f, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = columnas
        .map(
          (c) =>
            `<td style="text-align:${c.align ?? "left"};padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#1e293b;">${escaparHtml(f[c.key])}</td>`
        )
        .join("");
      return `<tr style="background:${bg}">${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>${escaparHtml(titulo)}</title>
  <style>
    @page { margin: 16mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
    .brand { display:flex; align-items:center; gap:12px; margin-bottom: 8px; }
    .logo { width:36px; height:36px; border-radius:10px; background: linear-gradient(135deg,#6366f1,#9333ea); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
    h1 { margin: 0; font-size: 20px; }
    .meta { color:#64748b; font-size:12px; margin: 4px 0 18px; }
    table { width:100%; border-collapse:collapse; }
    .foot { margin-top: 18px; font-size:11px; color:#94a3b8; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="brand">
    <div class="logo">MC</div>
    <div>
      <h1>${escaparHtml(titulo)}</h1>
      <div class="meta">${escaparHtml(subtitulo ?? "")} · Generado: ${escaparHtml(fecha)} · MultiCatálogo</div>
    </div>
  </div>
  ${
    filas.length === 0
      ? `<p style="color:#64748b">No hay datos para mostrar.</p>`
      : `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
         <p class="foot">${filas.length} registro(s)</p>`
  }
  <p class="no-print" style="margin-top:24px">
    <button onclick="window.print()" style="padding:10px 16px;background:#4f46e5;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">
      Imprimir / Guardar como PDF
    </button>
    <button onclick="window.close()" style="padding:10px 16px;margin-left:8px;background:#e2e8f0;border:0;border-radius:8px;cursor:pointer">
      Cerrar
    </button>
  </p>
  <script>
    // Abre el diálogo de impresión al cargar (el usuario puede elegir "Guardar como PDF")
    setTimeout(function(){ window.print(); }, 300);
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) {
    alert("Permite ventanas emergentes para exportar el PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
