import * as XLSX from "xlsx";

export interface ExportSheet {
  name: string;
  rows: Record<string, string | number | null>[];
}

/** Downloads a multi-sheet .xlsx workbook built from arrays of plain row objects. */
export function downloadWorkbook(sheets: ExportSheet[], filename: string) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    // Sheet names are capped at 31 chars and can't contain: \ / ? * [ ]
    const safeName = sheet.name.replace(/[\\/?*[\]]/g, "").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Downloads a flat CSV file built from an array of plain row objects. */
export function downloadCsv(rows: Record<string, string | number | null>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
