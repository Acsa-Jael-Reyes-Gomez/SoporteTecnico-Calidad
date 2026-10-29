// src/preload/preload.ts
import { contextBridge, ipcRenderer } from "electron";

type AnyObj = Record<string, unknown>;

const UNREADABLE_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/;

function countUnreadableMarkers(text: string) {
  const matches = String(text || "").match(/[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/g);
  return matches ? matches.length : 0;
}

function normalizeReadableText(value: unknown, fallback = "") {
  const baseValue = value === null || value === undefined || value === "" ? fallback : value;
  let text = fallback;
  if (typeof baseValue === "string") text = baseValue;
  else if (typeof baseValue === "number" || typeof baseValue === "bigint" || typeof baseValue === "boolean") {
    text = String(baseValue);
  }
  if (!UNREADABLE_TEXT_PATTERN.test(text)) return text;

  try {
    const bytes = Uint8Array.from(text, (char) => (char.codePointAt(0) ?? 0) & 0xff);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return countUnreadableMarkers(decoded) <= countUnreadableMarkers(text) ? decoded : text;
  } catch {
    return text;
  }
}

function translateCommonErrorMessage(message: string) {
  const lower = message.toLowerCase();
  const rules: Array<{ groups: string[][]; response: string }> = [
    { groups: [["sesion invalida", "sesiÃ³n invÃ¡lida", "invalid session", "session invalid"]], response: "La sesiÃ³n ya no es vÃ¡lida. Inicia sesiÃ³n nuevamente." },
    { groups: [["failed to fetch", "networkerror"]], response: "No se pudo completar la operaciÃ³n por un problema de conexiÃ³n." },
    { groups: [["econnrefused", "enotfound", "ehostunreach", "etimedout", "timed out", "timeout", "socket hang up", "connection refused"]], response: "No fue posible conectarse al sistema o a la base de datos." },
    { groups: [["cannot read properties", "cannot set properties"]], response: "OcurriÃ³ un error interno al procesar la informaciÃ³n." },
    { groups: [["unexpected token", "unexpected identifier", "unexpected end of input"]], response: "OcurriÃ³ un error interno al cargar un mÃ³dulo de la interfaz." },
    { groups: [["is not a function"]], response: "OcurriÃ³ un error interno porque una funciÃ³n requerida no estÃ¡ disponible." },
    { groups: [["sin permiso", "access denied", "permission denied"]], response: "No tienes permiso para realizar esta acciÃ³n." },
    { groups: [["duplicate entry"]], response: "Ya existe un registro con esos datos." },
    { groups: [["foreign key constraint", "cannot add or update a child row", "a foreign key constraint fails"]], response: "No se puede completar la operaciÃ³n porque hay registros relacionados." },
    { groups: [["sql syntax", "er_parse_error", "unknown column"]], response: "OcurriÃ³ un error interno al consultar la base de datos." },
    { groups: [["er_access_denied_error", "access denied for user"]], response: "No fue posible conectarse a la base de datos con la configuraciÃ³n actual." },
    { groups: [["unknown database", "er_bad_db_error"]], response: "No se encontrÃ³ la base de datos configurada." },
    { groups: [["enoent", "no such file or directory"]], response: "Falta un archivo requerido para completar la operaciÃ³n." },
    { groups: [["object has been destroyed", "browser has been closed"]], response: "La ventana de la aplicaciÃ³n ya no estaba disponible." },
    { groups: [["target page", "target browser"], ["closed"]], response: "La ventana de la aplicaciÃ³n ya se habÃ­a cerrado." },
    { groups: [["invalid url", "url vacia", "url invÃ¡lida"]], response: "El enlace proporcionado no es vÃ¡lido." }
  ];

  for (const rule of rules) {
    if (rule.groups.every((group) => group.some((needle) => lower.includes(needle)))) return normalizeReadableText(normalizeReadableText(rule.response));
  }
  if (lower.includes("falta api:")) {
    const apiName = message.split(":").slice(1).join(":").trim();
    return apiName
      ? `Falta una funciÃ³n interna requerida: ${apiName}.`
      : "Falta una funciÃ³n interna requerida para completar la acciÃ³n.";
  }
  return message || "No se pudo completar la operaciÃ³n. Intenta nuevamente.";
}
function normalizeErrorMessage(error: unknown, fallback = "Ocurrió un error interno al comunicarse con el sistema.") {
  let rawMessage: unknown = fallback;
  if (typeof error === "string") rawMessage = error;
  else if (error && typeof error === "object" && "message" in error) {
    rawMessage = (error as { message?: unknown }).message;
  }

  const message = normalizeReadableText(rawMessage, fallback).trim();
  return translateCommonErrorMessage(message || fallback);
}

function normalizeInvokeResult<T>(result: T): T {
  if (!result || typeof result !== "object") return result;

  const record = result as unknown as Record<string, unknown>;
  if ("message" in record && typeof record.message === "string") {
    record.message = normalizeErrorMessage(record.message);
  }

  return result;
}

async function invokeSafe(channel: string, ...args: unknown[]) {
  try {
    const result = await ipcRenderer.invoke(channel, ...args);
    return normalizeInvokeResult(result);
  } catch (error) {
    throw new Error(normalizeErrorMessage(error));
  }
}

contextBridge.exposeInMainWorld("api", {
  /* ===============================
      AUTH + SESIÓN
  =============================== */
  login: (user: string, pass: string) => invokeSafe("auth:login", user, pass),
  logout: () => invokeSafe("auth:logout"),
  revoke_user_sessions: (idUsuario: number) => invokeSafe("auth:revokeUserSessions", idUsuario),
  auth_health: () => invokeSafe("auth:health"),

  // ✅ Window controls aliases para AppShell (mínimo requerido)
  window_minimize: () => invokeSafe("window:minimize"),
  window_maximize: () => invokeSafe("window:maximize"),
  window_close: () => invokeSafe("window:close"),

  

  // ✅ Ya no debe fallar si existe handler en ipc_core.ts
  session_clear: () => invokeSafe("session:clear"),
  session_status: () => invokeSafe("session:status"),

  /* ===============================
      CATÁLOGOS
  =============================== */
  catalogos: (session: AnyObj) => invokeSafe("core:catalogos", session),
  version: () => invokeSafe("core:version"),

  /* ===============================
      TICKETS
  =============================== */
  tickets_list: (session: AnyObj, filtros: AnyObj) => invokeSafe("tickets:list", session, filtros),
  "tickets:list": (session: AnyObj, filtros: AnyObj) => invokeSafe("tickets:list", session, filtros),
  ticket_create: (session: AnyObj, data: AnyObj) => invokeSafe("tickets:create", session, data),
  ticket_update: (session: AnyObj, data: AnyObj) => invokeSafe("tickets:update", session, data),
  ticket_close: (session: AnyObj, idTicket: number, fechaCierre: string, solucion: string, tecnicos?: number[]) =>
    invokeSafe("tickets:close", session, idTicket, fechaCierre, solucion, tecnicos),
  ticket_reopen: (session: AnyObj, idTicket: number) => invokeSafe("tickets:reopen", session, idTicket),
  ticket_delete: (session: AnyObj, idTicket: number) => invokeSafe("tickets:delete", session, idTicket),
  "tickets:setClasificacion": (session: AnyObj, idTicket: number, idClasificacion: number) =>
    invokeSafe("tickets:setClasificacion", session, idTicket, idClasificacion),
  "tickets:calificar": (session: AnyObj, idTicket: number) =>
    invokeSafe("tickets:calificar", session, idTicket),
  "tickets:calificarAll": (session: AnyObj, filtros: AnyObj) =>
    invokeSafe("tickets:calificarAll", session, filtros),

  /* ===============================
      RUTAS
  =============================== */
  rutas_list: (session: AnyObj, filtros: AnyObj) => invokeSafe("rutas:list", session, filtros),
  "rutas:list": (session: AnyObj, filtros: AnyObj) => invokeSafe("rutas:list", session, filtros),
  rutas_create: (session: AnyObj, data: AnyObj) => invokeSafe("rutas:create", session, data),
  rutas_update: (session: AnyObj, data: AnyObj) => invokeSafe("rutas:update", session, data),
  rutas_close: (session: AnyObj, idRuta: number, fechaCierre: string, obs: string) =>
    invokeSafe("rutas:close", session, idRuta, fechaCierre, obs),
  rutas_reopen: (session: AnyObj, idRuta: number) => invokeSafe("rutas:reopen", session, idRuta),
  rutas_delete: (session: AnyObj, idRuta: number) => invokeSafe("rutas:delete", session, idRuta),

  // ✅ Alias singular (por compatibilidad, opcional)
  ruta_create: (session: AnyObj, data: AnyObj) => invokeSafe("rutas:create", session, data),
  ruta_update: (session: AnyObj, data: AnyObj) => invokeSafe("rutas:update", session, data),
  ruta_close: (session: AnyObj, idRuta: number, fechaCierre: string, obs: string) =>
    invokeSafe("rutas:close", session, idRuta, fechaCierre, obs),
  ruta_reopen: (session: AnyObj, idRuta: number) => invokeSafe("rutas:reopen", session, idRuta),
  ruta_delete: (session: AnyObj, idRuta: number) => invokeSafe("rutas:delete", session, idRuta),
  rutas_validar: (
    session: AnyObj,
    idRuta: number,
    nombreValidador: string,
    puestoValidador: string,
    observaciones?: string,
    fechaValidacion?: string,
    revisionEquipos?: AnyObj | null
  ) =>
    invokeSafe(
      "rutas:validar",
      session,
      idRuta,
      nombreValidador,
      puestoValidador,
      observaciones,
      fechaValidacion,
      revisionEquipos
    ),
  rutas_calificar: (session: AnyObj, idRuta: number) => invokeSafe("rutas:calificar", session, idRuta),
  rutas_calificarAll: (session: AnyObj, filtros: AnyObj) => invokeSafe("rutas:calificarAll", session, filtros),
  "rutas:calificar": (session: AnyObj, idRuta: number) => invokeSafe("rutas:calificar", session, idRuta),
  "rutas:calificarAll": (session: AnyObj, filtros: AnyObj) => invokeSafe("rutas:calificarAll", session, filtros),

  /* ===============================
      REPORTES
  =============================== */
  reports_build: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:build", session, filtros),
  reports_tickets: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:tickets", session, filtros),
  reports_rutas: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:rutas", session, filtros),
  reports_monthly: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:monthly", session, filtros),
  reports_tickets_summary: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:tickets_summary", session, filtros),
  reports_rutas_summary: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:rutas_summary", session, filtros),
  reports_proyectos_summary: (session: AnyObj, filtros: AnyObj) => invokeSafe("reports:proyectos_summary", session, filtros),
  reports_export_excel: (session: AnyObj, filename: string, data: AnyObj[], title: string) => 
    invokeSafe("reports:export_excel", session, filename, data, title),
  reports_export_excel_multi: (session: AnyObj, filename: string, sheets: AnyObj[]) =>
    invokeSafe("reports:export_excel_multi", session, filename, sheets),

  /* ===============================
      ENVIO EQUIPO
  =============================== */
  envio_equipo_list: (session: AnyObj, filtros: AnyObj) =>
    invokeSafe("envio_equipo:list", session, filtros),
  envio_equipo_notifications: (session: AnyObj, data: AnyObj) =>
    invokeSafe("envio_equipo:notifications", session, data),
  envio_equipo_create: (session: AnyObj, data: AnyObj) =>
    invokeSafe("envio_equipo:create", session, data),
  envio_equipo_ticketsDisponibles: (session: AnyObj, data: AnyObj) =>
    invokeSafe("envio_equipo:ticketsDisponibles", session, data),
  envio_equipo_assignTicket: (session: AnyObj, data: AnyObj) =>
    invokeSafe("envio_equipo:assignTicket", session, data),
  envio_equipo_updateEstado: (session: AnyObj, data: AnyObj) =>
    invokeSafe("envio_equipo:updateEstado", session, data),

  /* ===============================
      EQUIPOS
  =============================== */
  equipos_list: (session: AnyObj, filtros: AnyObj) => invokeSafe("equipos:list", session, filtros),
  equipos_ticketsAbiertos: (session: AnyObj) => invokeSafe("equipos:ticketsAbiertos", session),
  equipos_byTicket: (session: AnyObj, idTicket: number) => invokeSafe("equipos:byTicket", session, idTicket),
  equipos_checkActivoEnTaller: (session: AnyObj, idTicket: number) => invokeSafe("equipos:checkActivoEnTaller", session, idTicket),
  equipos_create: (session: AnyObj, data: AnyObj) => invokeSafe("equipos:create", session, data),
  equipos_update: (session: AnyObj, data: AnyObj) => invokeSafe("equipos:update", session, data),
  equipos_updateResultado: (session: AnyObj, data: AnyObj) => invokeSafe("equipos:updateResultado", session, data),
  equipos_entregar: (session: AnyObj, idEquipoControl: number, resultado: string) =>
    invokeSafe("equipos:entregar", session, idEquipoControl, resultado),
  equipos_cancelar: (session: AnyObj, idEquipoControl: number) => invokeSafe("equipos:cancelar", session, idEquipoControl),
  equipos_delete: (session: AnyObj, idEquipoControl: number) => invokeSafe("equipos:delete", session, idEquipoControl),

  /* ===============================
      DASHBOARD
  =============================== */
  dashboard_operacion_mensual: (session: AnyObj) => invokeSafe("dashboard:operacion_mensual", session),


  /* ===============================
      PROYECTOS ESPECIALES
  =============================== */
  proyectos_especiales_list: (session: AnyObj, filtros: AnyObj) =>
    invokeSafe("proyectos_especiales:list", session, filtros),

  proyectos_especiales_create: (session: AnyObj, data: AnyObj) =>
    invokeSafe("proyectos_especiales:create", session, data),

  proyectos_especiales_approve: (session: AnyObj, idProyectoEspecial: number) =>
    invokeSafe("proyectos_especiales:approve", session, idProyectoEspecial),

  open_external: (url: string) =>
    invokeSafe("utils:openExternal", url)
});
