/**
 * One cell of a CSV file. Spreadsheet apps run a cell that starts with = + - or @
 * as a formula, so text typed by someone else (a passenger name, say) could execute
 * when the file is opened. A leading apostrophe makes the app treat it as plain text.
 */
export function csvCell(value: unknown): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
