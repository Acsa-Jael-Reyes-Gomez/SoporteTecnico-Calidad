export type Pagination = { page: number; pageSize: number; offset: number };

export function normalizePagination(input: any, defaults = { pageSize: 25, maxPageSize: 100 }): Pagination {
  const rawPage = Number(input?.page);
  const rawPageSize = Number(input?.pageSize);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const requestedSize = Number.isFinite(rawPageSize) ? Math.trunc(rawPageSize) : defaults.pageSize;
  const pageSize = Math.min(defaults.maxPageSize, Math.max(5, requestedSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export async function countRows(conn: any, fromSql: string, whereSql: string, params: any[]) {
  const [rows]: any = await conn.execute(`SELECT COUNT(*) AS total ${fromSql} ${whereSql}`, params);
  return Number(rows?.[0]?.total || 0);
}

/** MySQL 5.1 vía ODBC 3.51 no admite parámetros enlazados en LIMIT/OFFSET. */
export function buildPaginationClause(pageSize: number, offset: number) {
  const safePageSize = Math.min(100, Math.max(5, Math.trunc(Number(pageSize) || 25)));
  const safeOffset = Math.max(0, Math.trunc(Number(offset) || 0));
  return `LIMIT ${safePageSize} OFFSET ${safeOffset}`;
}
