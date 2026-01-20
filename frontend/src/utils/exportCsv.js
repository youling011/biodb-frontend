function escapeCsvValue(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * rows: Array<Object>
 * columns: Array<{ key: string, label: string }>
 */
export function exportObjectsToCsv(filename, rows, columns) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const body = (rows || [])
    .map((r) => columns.map((c) => escapeCsvValue(r?.[c.key])).join(","))
    .join("\n");
  downloadText(filename, header + "\n" + body + "\n", "text/csv;charset=utf-8;");
}
