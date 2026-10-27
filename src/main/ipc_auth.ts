// src/main/ipc_auth.ts
import type { IpcMain } from "electron";
import bcrypt from "bcryptjs";
import { withConn } from "./db/db";
import { clearTrustedSession, requireTrustedSession, revokeTrustedSessionsForUser, setTrustedSession, type TrustedSession } from "./session_store";

// Rate limiting simple en memoria
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos

function checkRateLimit(user: string): { allowed: boolean; message: string } {
  const now = Date.now();
  const record = loginAttempts.get(user);

  if (record && record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, message: `Demasiados intentos. Intente en ${remaining} segundos.` };
  }

  return { allowed: true, message: "" };
}

function recordFailedAttempt(user: string) {
  const now = Date.now();
  const record = loginAttempts.get(user) || { count: 0, lockedUntil: 0 };

  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  loginAttempts.set(user, record);
}

function clearFailedAttempts(user: string) {
  loginAttempts.delete(user);
}

async function verifyPassword(input: string, stored: string): Promise<boolean> {
  const plainInput = String(input || "");
  const storedValue = String(stored || "");

  if (!storedValue) return false;

  if (storedValue.startsWith("$2a$") || storedValue.startsWith("$2b$") || storedValue.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(plainInput, storedValue);
    } catch {
      return false;
    }
  }

  return plainInput === storedValue;
}

type LoginOk = {
  ok: true;
  session: TrustedSession;
};

type LoginFail = {
  ok: false;
  message: string;
};

type LogoutResp = {
  ok: boolean;
  message?: string;
};

export function registerAuthHandlers(ipcMain: IpcMain) {
  ipcMain.handle("auth:login", async (event, user: string, pass: string): Promise<LoginOk | LoginFail> => {
    try {
      const cleanUser = String(user || "").trim();
      const cleanPass = String(pass || "");

      if (!cleanUser || !cleanPass) {
        return { ok: false, message: "Usuario y contraseña son requeridos." };
      }

      const rateCheck = checkRateLimit(cleanUser);
      if (!rateCheck.allowed) {
        return { ok: false, message: rateCheck.message };
      }

      const out = await withConn(async (conn) => {
        const [rows]: any = await conn.execute(
          `SELECT
              u.idUsuario,
              u.usuario,
              u.nombre,
              u.pass,
              u.idRol,
              r.nombre AS rol
           FROM usuario u
           INNER JOIN rol r ON r.idRol = u.idRol
           WHERE u.usuario = ?
             AND u.activo = 1
           LIMIT 1`,
          [cleanUser]
        );

        if (!rows || rows.length === 0) {
          recordFailedAttempt(cleanUser);
          return null;
        }

        const u = rows[0];
        const passOk = await verifyPassword(cleanPass, u.pass);
        if (!passOk) {
          recordFailedAttempt(cleanUser);
          return null;
        }

        clearFailedAttempts(cleanUser);

        const [perms]: any = await conn.execute(
          `SELECT p.code
           FROM rol_permiso rp
           INNER JOIN permiso p ON p.idPermiso = rp.idPermiso
           WHERE rp.idRol = ?
           ORDER BY p.code`,
          [u.idRol]
        );

        const [uuRows]: any = await conn.execute(
          `SELECT uu.idUnidad, un.nombre
           FROM usuario_unidad uu
           JOIN unidad un ON un.idUnidad = uu.idUnidad
           WHERE uu.idUsuario = ?
           ORDER BY un.nombre`,
          [u.idUsuario]
        );
        const permisos = Array.isArray(perms) ? perms.map((x: any) => String(x.code)) : [];

        const unidades = Array.isArray(uuRows)
          ? uuRows.map((x: any) => ({ idUnidad: Number(x.idUnidad), nombre: String(x.nombre) }))
          : [];

        return {
          idUsuario: Number(u.idUsuario),
          usuario: String(u.usuario),
          nombre: String(u.nombre),
          idRol: Number(u.idRol),
          rol: String(u.rol),
          permisos,
          unidades
        } satisfies TrustedSession;
      });

      if (!out) {
        clearTrustedSession(event);
        return { ok: false, message: "Usuario o contraseña inválidos." };
      }

      setTrustedSession(event, out);
      return { ok: true, session: out };
    } catch (err: any) {
      clearTrustedSession(event);
      return { ok: false, message: err?.message || "Error interno en login, comuniquese con Sistemas" };
    }
  });

  ipcMain.handle("auth:logout", async (event): Promise<LogoutResp> => {
    try {
      clearTrustedSession(event);
      return { ok: true };
    } catch {
      return { ok: false, message: "Error al cerrar sesión." };
    }
  });

  ipcMain.handle("auth:revokeUserSessions", async (event, idUsuario: number): Promise<LogoutResp> => {
    try {
      const session = requireTrustedSession(event);
      if (session.rol !== "ADMIN") return { ok: false, message: "Sin permiso para revocar sesiones." };
      const targetId = Number(idUsuario);
      if (!Number.isInteger(targetId) || targetId <= 0) return { ok: false, message: "Usuario inválido." };
      revokeTrustedSessionsForUser(targetId);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error?.message || "No se pudieron revocar las sesiones." };
    }
  });

  ipcMain.handle("auth:health", async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      await withConn(async (conn) => {
        await conn.execute("SELECT 1");
      });
      return { ok: true };
    } catch {
      return { ok: false, message: "No se pudo conectar a la base de datos." };
    }
  });
}
