export type OpenClosedState = "ABIERTO" | "CERRADO" | null;

export function normalizeCatalogKey(value: unknown) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

export function normalizeOpenClosedState(value: unknown): OpenClosedState {
  const state = String(value || "").trim().toUpperCase();
  return state === "ABIERTO" || state === "CERRADO" ? state : null;
}

export function monthlyRangeMysql(baseDate: Date | string = new Date()) {
  const date = new Date(baseDate);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = validDate.getFullYear();
  const month = validDate.getMonth();
  const start = validDate.getDate() >= 26
    ? new Date(year, month, 26, 0, 0, 0)
    : new Date(year, month - 1, 26, 0, 0, 0);
  const end = validDate.getDate() >= 26
    ? new Date(year, month + 1, 25, 23, 59, 59)
    : new Date(year, month, 25, 23, 59, 59);
  const pad = (number: number) => String(number).padStart(2, "0");
  const toMysql = (value: Date) =>
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  return { start: toMysql(start), end: toMysql(end) };
}
