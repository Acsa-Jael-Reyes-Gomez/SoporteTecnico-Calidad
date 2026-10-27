// src/preload/preload.ts
import { contextBridge, ipcRenderer } from "electron";

type AnyObj = Record<string, any>;

const UNREADABLE_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/;

function countUnreadableMarkers(text: string) {
  const matches = String(text || "").match(/[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/g);
  return matches ? matches.length : 0;
}

function normalizeReadableText(value: any, fallback = "") {
  const baseValue = value === null || value === undefined || value === "" ? fallback : value;
  const text = String(baseValue ?? fallback ?? "");
  if (!UNREADABLE_TEXT_PATTERN.test(text)) return text;

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return countUnreadableMarkers(decoded) <= countUnreadableMarkers(text) ? decoded : text;
  } catch {
    return text;
  }
}

function translateCommonErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("im002") ||
    lower.includes("data source name not found") ||
    lower.includes("dsn no encontrado") ||
    lower.includes("odbc driver manager")
  ) {
    return "No se encontró la conexión ODBC configurada. Verifica que el DSN Tickets_IT exista en Windows.";
  }

  if (
    lower.includes("sesion invalida") ||
    lower.includes("sesión inválida") ||
    lower.includes("invalid session") ||
    lower.includes("session invalid")
  ) {
    return "La sesión ya no es válida. Inicia sesión nuevamente.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "No se pudo completar la operación por un problema de conexión.";
  }
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("ehostunreach") ||
    lower.includes("etimedout") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("socket hang up") ||
    lower.includes("can't connect to mysql server") ||
    lower.includes("can not connect to mysql server") ||
    lower.includes("connection refused")
  ) {
    return "No fue posible conectarse al sistema o a la base de datos.";
  }
  if (lower.includes("cannot read properties") || lower.includes("cannot set properties")) {
    return "Ocurrió un error interno al procesar la información.";
  }
  if (
    lower.includes("unexpected token") ||
    lower.includes("unexpected identifier") ||
    lower.includes("unexpected end of input")
  ) {
    return "Ocurrió un error interno al cargar un módulo de la interfaz.";
  }
  if (lower.includes("is not a function")) {
    return "Ocurrió un error interno porque una función requerida no está disponible.";
  }
  if (lower.includes("sin permiso") || lower.includes("access denied") || lower.includes("permission denied")) {
    return "No tienes permiso para realizar esta acción.";
  }
  if (lower.includes("falta api:")) {
    const apiName = message.split(":").slice(1).join(":").trim();
    return apiName
      ? `Falta una función interna requerida: ${apiName}.`
      : "Falta una función interna requerida para completar la acción.";
  }
  if (lower.includes("duplicate entry")) {
    return "Ya existe un registro con esos datos.";
  }
  if (
    lower.includes("foreign key constraint") ||
    lower.includes("cannot add or update a child row") ||
    lower.includes("a foreign key constraint fails")
  ) {
    return "No se puede completar la operación porque hay registros relacionados.";
  }
  if (
    lower.includes("sql syntax") ||
    lower.includes("er_parse_error") ||
    lower.includes("unknown column")
  ) {
    return "Ocurrió un error interno al consultar la base de datos.";
  }
  if (lower.includes("er_access_denied_error") || lower.includes("access denied for user")) {
    return "No fue posible conectarse a la base de datos con la configuración actual.";
  }
  if (lower.includes("unknown database") || lower.includes("er_bad_db_error")) {
    return "No se encontró la base de datos configurada.";
  }
  if (lower.includes("enoent") || lower.includes("no such file or directory")) {
    return "Falta un archivo requerido para completar la operación.";
  }
  if (lower.includes("object has been destroyed") || lower.includes("browser has been closed")) {
    return "La ventana de la aplicación ya no estaba disponible.";
  }
  if ((lower.includes("target page") || lower.includes("target browser")) && lower.includes("closed")) {
    return "La ventana de la aplicación ya se había cerrado.";
  }
  if (lower.includes("invalid url") || lower.includes("url vacia") || lower.includes("url inválida")) {
    return "El enlace proporcionado no es válido.";
  }

  return message || "No se pudo completar la operación. Intenta nuevamente.";
}

function normalizeErrorMessage(error: any, fallback = "Ocurrió un error interno al comunicarse con el sistema.") {
  const rawMessage =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : fallback;

  const message = normalizeReadableText(rawMessage, fallback).trim();
  return translateCommonErrorMessage(message || fallback);
}

function normalizeInvokeResult<T>(result: T): T {
  if (!result || typeof result !== "object") return result;

  if ("message" in (result as AnyObj) && typeof (result as AnyObj).message === "string") {
    (result as AnyObj).message = normalizeErrorMessage((result as AnyObj).message);
  }

  return result;
}

async function invokeSafe(channel: string, ...args: any[]) {
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