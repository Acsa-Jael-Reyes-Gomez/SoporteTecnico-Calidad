import type { IpcMainInvokeEvent } from "electron";

export type TrustedSession = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  idRol: number;
  rol: string;
  permisos: string[];
  unidades: { idUnidad: number; nombre: string }[];
};

type SessionRecord = {
  session: TrustedSession;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

function readDuration(name: string, fallback: number, minimum: number) {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 ? Math.max(minimum, configured) : fallback;
}

const ABSOLUTE_TTL_MS = readDuration("SOPORTE_SESSION_TTL_MS", 8 * 60 * 60_000, 5 * 60_000);
const IDLE_TTL_MS = readDuration("SOPORTE_SESSION_IDLE_MS", 30 * 60_000, 60_000);
const trustedSessions = new Map<number, SessionRecord>();

function getSenderId(eventOrSenderId: IpcMainInvokeEvent | number) {
  return typeof eventOrSenderId === "number" ? eventOrSenderId : eventOrSenderId.sender.id;
}

export function setTrustedSession(eventOrSenderId: IpcMainInvokeEvent | number, session: TrustedSession) {
  const now = Date.now();
  trustedSessions.set(getSenderId(eventOrSenderId), {
    session,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + ABSOLUTE_TTL_MS,
    revokedAt: null
  });
}

export function clearTrustedSession(eventOrSenderId: IpcMainInvokeEvent | number) {
  trustedSessions.delete(getSenderId(eventOrSenderId));
}

export function clearAllTrustedSessions() {
  trustedSessions.clear();
}

export function revokeTrustedSessionsForUser(idUsuario: number) {
  const now = Date.now();
  for (const record of trustedSessions.values()) {
    if (record.session.idUsuario === idUsuario) record.revokedAt = now;
  }
}

export function getTrustedSession(eventOrSenderId: IpcMainInvokeEvent | number) {
  const senderId = getSenderId(eventOrSenderId);
  const record = trustedSessions.get(senderId);
  if (!record) return null;
  const now = Date.now();
  if (record.revokedAt || now >= record.expiresAt || now - record.lastActivityAt >= IDLE_TTL_MS) {
    trustedSessions.delete(senderId);
    return null;
  }
  record.lastActivityAt = now;
  return record.session;
}

export function getTrustedSessionStatus(eventOrSenderId: IpcMainInvokeEvent | number) {
  const senderId = getSenderId(eventOrSenderId);
  const record = trustedSessions.get(senderId);
  if (!record) return { active: false, expiresAt: null, idleExpiresAt: null };
  const now = Date.now();
  const idleExpiresAt = record.lastActivityAt + IDLE_TTL_MS;
  if (record.revokedAt || now >= record.expiresAt || now >= idleExpiresAt) {
    trustedSessions.delete(senderId);
    return { active: false, expiresAt: null, idleExpiresAt: null };
  }
  return { active: true, expiresAt: record.expiresAt, idleExpiresAt };
}

export function requireTrustedSession(event: IpcMainInvokeEvent) {
  const session = getTrustedSession(event);
  if (!session?.idUsuario) throw new Error("Sesión inválida.");
  return session;
}

const PERMISSION_CODE_ALIASES: Record<string, string> = {
  TICKETS_CREATE: "TICKETS_CREAR",
  TICKETS_EDIT: "TICKETS_EDITAR",
  TICKETS_DELETE: "TICKETS_BORRAR",
  TICKETS_CLOSE: "TICKETS_CERRAR",
  TICKETS_REOPEN: "TICKETS_REABRIR",
  TICKETS_VIEW_ALL: "TICKETS_VER_TODOS",
  RUTAS_CREATE: "RUTAS_CREAR",
  RUTAS_EDIT: "RUTAS_EDITAR",
  RUTAS_DELETE: "RUTAS_BORRAR",
  RUTAS_CLOSE: "RUTAS_CERRAR",
  RUTAS_REOPEN: "RUTAS_REABRIR",
  RUTAS_VIEW_ALL: "RUTAS_VER_TODAS",
  REPORTS_VIEW: "REPORTES_VER",
  REPORTS_EXPORT: "REPORTES_EXPORTAR",
  TICKETS_RATE: "TICKETS_CALIFICAR",
  EQUIPOS_CREATE: "EQUIPOS_CREAR",
  EQUIPOS_EDIT: "EQUIPOS_EDITAR",
  EQUIPOS_DELETE: "EQUIPOS_BORRAR",
  EQUIPOS_VIEW: "EQUIPOS_VER",
  PROYECTOS_ESPECIALES_CREATE: "PROYECTOS_ESPECIALES_CREAR",
  PROYECTOS_ESPECIALES_EDIT: "PROYECTOS_ESPECIALES_EDITAR",
  PROYECTOS_ESPECIALES_VIEW_ALL: "PROYECTOS_ESPECIALES_VER_TODOS",
  PROYECTOS_ESPECIALES_REVIEW: "PROYECTOS_ESPECIALES_REVISAR",
  PROYECTOS_ESPECIALES_DOWNLOAD: "PROYECTOS_ESPECIALES_DESCARGAR",
  CALIFICACION_VIEW: "CALIFICACION_VER",
  CALIFICACION_TICKETS: "CALIFICAR_TICKETS",
  CALIFICACION_RUTAS: "CALIFICAR_RUTAS",
  VALIDACION_VIEW: "VALIDACION_VER",
  VALIDACION_RUTAS: "VALIDAR_RUTAS",
  ENVIO_EQUIPO_VIEW: "ENVIO_EQUIPO_VER",
  ENVIO_EQUIPO_CREATE: "ENVIO_EQUIPO_CREAR",
  ENVIO_EQUIPO_UPDATE: "ENVIO_EQUIPO_ACTUALIZAR"
};

export function hasPerm(session: TrustedSession | null | undefined, code: string) {
  if (!Array.isArray(session?.permisos)) return false;
  const alias = PERMISSION_CODE_ALIASES[code];
  return session.permisos.includes(code) || (!!alias && session.permisos.includes(alias));
}

export function requirePerm(session: TrustedSession | null | undefined, code: string) {
  if (!hasPerm(session, code)) throw new Error("Sin permiso: " + code);
}

export function requirePermForEvent(event: IpcMainInvokeEvent, code: string) {
  const session = requireTrustedSession(event);
  requirePerm(session, code);
  return session;
}
