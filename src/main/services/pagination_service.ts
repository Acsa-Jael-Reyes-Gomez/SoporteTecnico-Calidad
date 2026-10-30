import type { DbConnection } from "../db/db";

export type Pagination = { page: number; pageSize: number; offset: number };
type PaginationDefaults = { pageSize: number; maxPageSize: number };
type CountRow = { total?: number | string | null };

const DEFAULT_PAGINATION: PaginationDefaults = { pageSize: 25, maxPageSize: 100 };

export function normalizePagination(input: unknown, defaults: PaginationDefaults = DEFAULT_PAGINATION): Pagination {
  const values = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawPage = Number(values.page);
  const rawPageSize = Number(values.pageSize);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const requestedSize = Number.isFinite(rawPageSize) ? Math.trunc(rawPageSize) : defaults.pageSize;
  const pageSize = Math.min(defaults.maxPageSize, Math.max(5, requestedSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export async function countRows(conn: DbConnection, fromSql: string, whereSql: string, params: unknown[]) {
  const [rows] = await conn.execute<CountRow[]>(`SELECT COUNT(*) AS total ${fromSql} ${whereSql}`, params);
  return Number(rows?.[0]?.total || 0);
}

/** Mantiene LIMIT/OFFSET dentro de rangos seguros para SQLite. */
export function buildPaginationClause(pageSize: number, offset: number) {
  const safePageSize = Math.min(100, Math.max(5, Math.trunc(Number(pageSize) || 25)));
  const safeOffset = Math.max(0, Math.trunc(Number(offset) || 0));
  return `LIMIT ${safePageSize} OFFSET ${safeOffset}`;
}
