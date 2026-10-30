import type { DatabaseSync } from "node:sqlite";

type SqliteParameter = null | number | bigint | string | NodeJS.NonSharedArrayBufferView;

function toSqliteParameter(value: unknown): SqliteParameter {
  if (value === null || typeof value === "number" || typeof value === "bigint" || typeof value === "string") return value;
  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer) {
    return value as NodeJS.NonSharedArrayBufferView;
  }
  throw new TypeError("Tipo de parámetro no compatible con SQLite.");
}

function normalizeSql(source: string): string {
  const sql = source.trim();
  if (/^SET\s+NAMES\b/i.test(sql)) return "SELECT 1 WHERE 0";

  return sql
    .replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, "INSERT OR IGNORE INTO")
    .replace(/\bVALUES\s*\(\s*`?(\w+)`?\s*\)/gi, "excluded.$1")
    .replace(
      /GROUP_CONCAT\s*\(\s*DISTINCT\s+([^)]*)\s+ORDER\s+BY\s+[^)]*\s+SEPARATOR\s+'[^']*'\s*\)/gi,
      "GROUP_CONCAT(DISTINCT $1)"
    )
    .replace(/\bDATEDIFF\s*\(\s*CURRENT_TIMESTAMP\s*,\s*([^()]+)\)/gi, "DATEDIFF(CURRENT_TIMESTAMP, $1)")
    .replace(/\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/gi, "ON CONFLICT DO UPDATE SET");
}

export class SqliteConnection {
  constructor(private readonly db: DatabaseSync) {}

  execute<T = unknown>(source: string, params: unknown[] = []): [T, unknown] {
    const sql = normalizeSql(source);
    try {
      const boundParams = params.map(toSqliteParameter);
      const statement = this.db.prepare(sql);
      const columns = statement.columns();
      if (columns.length) return [statement.all(...boundParams) as T, columns];

      const result = statement.run(...boundParams);
      return [
        {
          affectedRows: Number(result.changes) || 0,
          insertId: Number(result.lastInsertRowid) || 0
        } as T,
        []
      ];
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : "Error ejecutando una consulta SQLite.");
    }
  }

  beginTransaction() {
    this.db.exec("BEGIN IMMEDIATE");
  }

  commit() {
    this.db.exec("COMMIT");
  }

  rollback() {
    this.db.exec("ROLLBACK");
  }
}
