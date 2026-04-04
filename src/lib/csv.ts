// Manual CSV generation — no dependencies

function escapeField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const BOM = "\uFEFF"; // Excel compatibility
  const headerLine = headers.map(escapeField).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(row[h])).join(",")
  );
  return BOM + headerLine + "\n" + dataLines.join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
