import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function cellVal(row, col, index) {
  if (col.key === "sno") return index + 1;
  const v = row[col.key];
  return v == null ? "" : v;
}

function toExportRows(data, columns) {
  return data.map((row, i) =>
    Object.fromEntries(columns.map((col) => [col.label, cellVal(row, col, i)]))
  );
}

export function exportCSV(data, columns, filename = "export") {
  if (!data?.length) return;
  const rows = toExportRows(data, columns);
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${filename}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExcel(data, columns, filename = "export") {
  if (!data?.length) return;
  const rows = toExportRows(data, columns);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF(data, columns, title = "Report", filename = "export") {
  if (!data?.length) return;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total records: ${data.length}`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.label)],
    body: data.map((row, i) => columns.map((col) => cellVal(row, col, i))),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(`${filename}.pdf`);
}

export function exportPrint(data, columns, title = "Report") {
  if (!data?.length) return;
  const th = columns.map((c) => `<th>${c.label}</th>`).join("");
  const tbody = data
    .map(
      (row, i) =>
        `<tr>${columns
          .map((col) => `<td>${cellVal(row, col, i)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 0; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { font-size: 17px; font-weight: 800; margin: 0; }
  .header .meta { font-size: 10px; color: #64748b; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: .04em; text-align: left; padding: 7px 5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 5px; border-bottom: 1px solid #e2e8f0; word-break: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <div class="meta">Records: ${data.length}</div>
</div>
<table>
  <thead><tr>${th}</tr></thead>
  <tbody>${tbody}</tbody>
</table>
</body>
</html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
}
