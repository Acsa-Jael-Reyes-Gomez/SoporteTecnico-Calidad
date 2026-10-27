import { assertDateRange } from "./validation_service";

export function validateReportFilters(filters: any) {
  assertDateRange(filters?.desde, filters?.hasta);
  return filters || {};
}

export function appendSearchFilter(
  where: string[],
  params: any[],
  value: unknown,
  columns: string[]
) {
  const search = String(value ?? "").trim();
  if (!search || !columns.length) return;
  if (!columns.every((column) => /^[A-Za-z_][A-Za-z0-9_.]*$/.test(column))) {
    throw new Error("Configuración interna de búsqueda inválida.");
  }
  where.push(`(${columns.map((column) => `${column} LIKE ?`).join(" OR ")})`);
  params.push(...columns.map(() => `%${search}%`));
}
