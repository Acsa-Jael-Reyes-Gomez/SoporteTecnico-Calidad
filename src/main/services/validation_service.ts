import type { DbConnection } from "../db/db";

const MYSQL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;

export function parseDateValue(value: unknown, fieldName: string): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!MYSQL_DATETIME_RE.test(text)) throw new Error(`${fieldName} no tiene un formato válido.`);
  const [datePart, timePart = "00:00:00"] = text.replace(" ", "T").split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds = 0] = timePart.split(":").map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes ||
    parsed.getSeconds() !== seconds
  ) {
    throw new Error(`${fieldName} no es una fecha válida.`);
  }
  return parsed;
}

export function assertDateRange(desde: unknown, hasta: unknown) {
  const start = parseDateValue(desde, "La fecha desde");
  const end = parseDateValue(hasta, "La fecha hasta");
  if (start && end && start.getTime() > end.getTime()) {
    throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");
  }
}

export function assertChronologicalDates(
  startValue: unknown,
  endValue: unknown,
  startLabel = "La fecha de apertura",
  endLabel = "La fecha de cierre"
) {
  const start = parseDateValue(startValue, startLabel);
  const end = parseDateValue(endValue, endLabel);
  if (start && end && end.getTime() < start.getTime()) {
    throw new Error(`${endLabel} no puede ser anterior a ${startLabel.toLowerCase()}.`);
  }
}

const SAFE_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function assertActiveReference(
  conn: DbConnection,
  table: string,
  idColumn: string,
  value: unknown,
  label: string,
  activeColumn = "activo"
) {
  if (![table, idColumn, activeColumn].every((item) => SAFE_IDENTIFIER_RE.test(item))) {
    throw new Error("Configuración interna de referencia inválida.");
  }
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  const [rows]: any = await conn.execute(
    `SELECT 1 FROM \`${table}\` WHERE \`${idColumn}\`=? AND \`${activeColumn}\`=1 LIMIT 1`,
    [id]
  );
  if (!rows?.length) throw new Error(`${label} no existe o está inactivo.`);
  return id;
}

export function uniquePositiveIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
}
