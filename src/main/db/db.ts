import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteConnection } from "./sqlite_connection";

export interface DbConnection {
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<[T, unknown]> | [T, unknown];
  beginTransaction(): Promise<void> | void;
  commit(): Promise<void> | void;
  rollback(): Promise<void> | void;
}

let database: DatabaseSync | null = null;
let connection: SqliteConnection | null = null;
let operationTail: Promise<void> = Promise.resolve();

async function acquireDatabaseTurn(): Promise<() => void> {
  const previousTurn = operationTail;
  let releaseTurn!: () => void;
  operationTail = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });
  await previousTurn;
  return releaseTurn;
}

function registerSqliteFunctions(db: DatabaseSync) {
  db.function("NOW", () => {
    const now = new Date();
    const part = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}:${part(now.getSeconds())}`;
  });
  db.function("DATEDIFF", (left: unknown, right: unknown) => {
    if (!left || !right) return null;
    const leftDay = new Date(`${String(left).slice(0, 10)}T00:00:00Z`).getTime();
    const rightDay = new Date(`${String(right).slice(0, 10)}T00:00:00Z`).getTime();
    return Number.isFinite(leftDay) && Number.isFinite(rightDay) ? Math.trunc((leftDay - rightDay) / 86400000) : null;
  });
  db.function("CONCAT", (...values: unknown[]) =>
    values.includes(null) ? null : values.map(String).join("")
  );
  db.function("LPAD", (value: unknown, width: unknown, fill: unknown) =>
    String(value).padStart(Number(width), String(fill || " ").slice(0, 1))
  );
}

async function openDatabase(): Promise<SqliteConnection> {
  if (connection) return connection;

  const electron = await import("electron");
  const configuredPath = String(process.env.SOPORTE_DATABASE_PATH || "").trim();
  const databasePath = configuredPath || path.join(electron.app.getPath("userData"), "soporte_tecnico.db");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  if (!fs.existsSync(databasePath)) {
    const appPath = electron.app.getAppPath();
    const packagedAssets = process.resourcesPath || "";
    const seedPath = [
      path.join(appPath, "assets", "database", "seed.db"),
      path.join(packagedAssets, "assets", "database", "seed.db")
    ].find((candidate) => candidate && fs.existsSync(candidate));

    if (seedPath) {
      fs.copyFileSync(seedPath, databasePath);
    } else {
      const schemaPath = [
        path.join(appPath, "assets", "database", "schema.sqlite.sql"),
        path.join(packagedAssets, "assets", "database", "schema.sqlite.sql")
      ].find((candidate) => candidate && fs.existsSync(candidate));
      if (!schemaPath) throw new Error("No se encontró el esquema SQLite de la aplicación.");
      const emptyDb = new DatabaseSync(databasePath);
      emptyDb.exec(fs.readFileSync(schemaPath, "utf8"));
      emptyDb.close();
    }
  }

  database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL;");
  registerSqliteFunctions(database);
  connection = new SqliteConnection(database);
  return connection;
}

export async function ensureAssignmentNotificationSchema(conn: DbConnection): Promise<void> {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notificacion_asignacion (
      idNotificacion INTEGER PRIMARY KEY AUTOINCREMENT,
      idUsuario INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      idReferencia INTEGER NOT NULL,
      idUnidad INTEGER,
      creadoPor INTEGER,
      createdAt TEXT NOT NULL
    )
  `);
  await conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_fecha ON notificacion_asignacion (idUsuario, createdAt, idNotificacion)"
  );
  await conn.execute("CREATE INDEX IF NOT EXISTS idx_notificacion_referencia ON notificacion_asignacion (tipo, idReferencia)");
}

export async function withConn<T>(fn: (conn: DbConnection) => Promise<T>): Promise<T> {
  const releaseTurn = await acquireDatabaseTurn();
  try {
    return await fn(await openDatabase());
  } finally {
    releaseTurn();
  }
}

export async function closePool(): Promise<void> {
  await operationTail;
  try {
    database?.close();
  } finally {
    database = null;
    connection = null;
  }
}
