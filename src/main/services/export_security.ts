const FORMULA_PREFIX_RE = /^[\t\r\n ]*[=+\-@]/;

export function sanitizeSpreadsheetValue(value: any): any {
  if (typeof value !== "string") return value;
  return FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
}

export function sanitizeSpreadsheetData(data: any): any {
  if (Array.isArray(data)) return data.map(sanitizeSpreadsheetData);
  if (data && typeof data === "object" && Object.getPrototypeOf(data) === Object.prototype) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sanitizeSpreadsheetData(value)]));
  }
  return sanitizeSpreadsheetValue(data);
}

export function sanitizeExportFilename(value: unknown, fallback = "Reporte.xlsx") {
  const clean = String(value || fallback)
    // This intentionally rejects control characters in exported filenames.
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  const base = clean || fallback;
  return /\.xlsx$/i.test(base) ? base : `${base.replace(/\.[^.]+$/, "")}.xlsx`;
}

export function sanitizeSheetName(value: unknown, fallback = "Reporte") {
  const clean = String(value || fallback)
    // Escapes are retained to make the forbidden filename characters clear in this character class.
    // eslint-disable-next-line no-control-regex, no-useless-escape
    .replace(/[\x00-\x1F\\/\?\*\[\]\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^'+|'+$/g, "");
  return (clean || fallback).slice(0, 31);
}
