/**
 * Exporta un reporte a PDF vía diálogo de impresión del navegador.
 * Usa Blob URL (más fiable que window.open + document.write).
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

  const tbody =
    filas.length === 0
      ? `<tr><td colspan="${columnas.length}" style="padding:16px;color:#64748b;">No hay datos para mostrar.</td></tr>`
      : filas
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
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escaparHtml(titulo)}</title>
  <style>
    @page { margin: 14mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #9333ea);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    h1 { margin: 0; font-size: 20px; color: #0f172a; }
    .meta { color: #64748b; font-size: 12px; margin: 4px 0 18px; }
    table { width: 100%; border-collapse: collapse; }
    .foot { margin-top: 16px; font-size: 11px; color: #94a3b8; }
    .actions { margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap; }
    .btn {
      padding: 10px 16px; border: 0; border-radius: 8px;
      font-weight: 600; cursor: pointer; font-size: 14px;
    }
    .btn-primary { background: #4f46e5; color: #fff; }
    .btn-secondary { background: #e2e8f0; color: #0f172a; }
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
      <div class="meta">${escaparHtml(subtitulo ?? "MultiCatálogo")} · Generado: ${escaparHtml(fecha)}</div>
    </div>
  </div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <p class="foot">${filas.length} registro(s)</p>
  <div class="actions no-print">
    <button class="btn btn-primary" type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
    <button class="btn btn-secondary" type="button" onclick="window.close()">Cerrar</button>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");

  if (!w) {
    // Pop-up bloqueado: descarga el HTML para que el usuario lo abra
    const a = document.createElement("a");
    a.href = url;
    a.download = (opts.nombreArchivo ?? titulo.replace(/\s+/g, "_").toLowerCase()) + ".html";
    a.click();
    alert(
      "El navegador bloqueó la ventana emergente. Se descargó un HTML: ábrelo y usa Ctrl+P → Guardar como PDF."
    );
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  // Liberar el blob cuando se cierre la pestaña (o a los 2 min)
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
