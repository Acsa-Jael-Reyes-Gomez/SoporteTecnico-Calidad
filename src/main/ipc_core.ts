// src/main/ipc_core.ts
import type { IpcMain } from "electron";
import type { RowDataPacket } from "mysql2/promise";
import { withConn } from "./db/db";
import { hasPerm, requireTrustedSession } from "./session_store";
import { APPLICATION_VERSION, DATABASE_SCHEMA_VERSION } from "../shared/version";
import { normalizeCatalogKey } from "./services/domain_utils";

const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;
let catalogCache: { expiresAt: number; data: any } | null = null;
let catalogCachePromise: Promise<any> | null = null;

export function registerCoreHandlers(ipcMain: IpcMain) {
  ipcMain.handle("core:version", async (event) => {
    requireTrustedSession(event);
    return { ok: true, data: { applicationVersion: APPLICATION_VERSION, schemaVersion: DATABASE_SCHEMA_VERSION } };
  });
  ipcMain.handle("core:catalogos", async (event) => {
    try {
      requireTrustedSession(event);

      const now = Date.now();
      if (catalogCache && catalogCache.expiresAt > now) {
        return { ok: true, data: catalogCache.data };
      }

      if (catalogCachePromise) {
        const data = await catalogCachePromise;
        return { ok: true, data };
      }

      catalogCachePromise = withConn(async (conn) => {
        const [unidades] = await conn.execute<RowDataPacket[]>(
          `SELECT idUnidad, nombre, idTipoRuta, activo FROM unidad WHERE activo=1 ORDER BY nombre`
        );
        const [puestos] = await conn.execute<RowDataPacket[]>(
          `SELECT idPuesto, nombre, activo FROM puesto WHERE activo=1 ORDER BY nombre`
        );
        const [servicios] = await conn.execute<RowDataPacket[]>(
          `SELECT idServicio, nombre, idClasificacion, activo FROM servicio WHERE activo=1 ORDER BY nombre`
        );
        const [tiposEquipo] = await conn.execute<RowDataPacket[]>(
          `SELECT idTipoEquipo, nombre, activo FROM tipo_equipo WHERE activo=1 ORDER BY nombre`
        );
        const [desTipoRuta] = await conn.execute<RowDataPacket[]>(
          `SELECT idTipoRuta, nombre FROM des_tipo_ruta ORDER BY idTipoRuta`
        );
        const [desEstadoValidacion] = await conn.execute<RowDataPacket[]>(
          `SELECT idEstadoValidacion, nombre FROM des_estado_validacion ORDER BY idEstadoValidacion`
        );
        const [desEstadoCalificacion] = await conn.execute<RowDataPacket[]>(
          `SELECT idEstadoCalificacion, nombre FROM des_estado_calificacion ORDER BY idEstadoCalificacion`
        );
        const [desClasificaciones] = await conn.execute<RowDataPacket[]>(
          `SELECT idClasificacion, nombre FROM des_clasificacion ORDER BY idClasificacion`
        );
        const [desMotivoEnvio] = await conn.execute<RowDataPacket[]>(
          `SELECT idMotivoEnvio, clave, nombre, orden, activo
           FROM des_motivo_envio
           WHERE activo = 1
           ORDER BY orden, idMotivoEnvio`
        );
        const [desMedioEnvio] = await conn.execute<RowDataPacket[]>(
          `SELECT idMedioEnvio, clave, nombre, orden, activo
           FROM des_medio_envio
           WHERE activo = 1
           ORDER BY orden, idMedioEnvio`
        );
        const [desEstadoEnvio] = await conn.execute<RowDataPacket[]>(
          `SELECT idEstadoEnvio, clave, nombre, orden, activo
           FROM des_estado_envio
           WHERE activo = 1
           ORDER BY orden, idEstadoEnvio`
        );
        const [catalogoEquipoRevisadoRuta] = await conn.execute<RowDataPacket[]>(
          `SELECT idCatalogoEquipoRevisadoR, clave, nombre, orden, activo
           FROM catalogoequiporevisador
           WHERE activo = 1
           ORDER BY orden, idCatalogoEquipoRevisadoR`
        );
        const [tecnicos] = await conn.execute<RowDataPacket[]>(
          `SELECT u.idUsuario, u.nombre
           FROM usuario u
           JOIN rol r ON r.idRol = u.idRol
           WHERE u.activo=1 AND r.nombre='TECNICO'
           ORDER BY u.nombre`
        );
        const [usuarios] = await conn.execute<RowDataPacket[]>(
          `SELECT u.idUsuario, u.usuario, u.nombre, r.nombre AS rol
           FROM usuario u
           JOIN rol r ON r.idRol = u.idRol
           WHERE u.activo=1
           ORDER BY u.nombre`
        );

        const pendienteAsignarRow = (usuarios || []).find((row: any) => {
          const nombre = normalizeCatalogKey(row?.nombre || "");
          const usuario = normalizeCatalogKey(row?.usuario || "");
          return nombre === "PENDIENTE_ASIGNAR" || usuario === "PENDIENTE_ASIGNAR";
        }) || null;

        const extraordinarioRow = (desClasificaciones || []).find((row: any) => {
          return normalizeCatalogKey(row?.nombre || "") === "EXTRAORDINARIO";
        }) || null;

        return {
          unidades,
          puestos,
          servicios,
          tecnicos,
          tiposEquipo,
          usuarios,
          des_motivo_envio: desMotivoEnvio,
          des_medio_envio: desMedioEnvio,
          des_estado_envio: desEstadoEnvio,
          catalogo_equipo_revisado_ruta: catalogoEquipoRevisadoRuta,
          des_clasificaciones: desClasificaciones,
          des_tipo_ruta: desTipoRuta,
          des_estado_validacion: desEstadoValidacion,
          des_estado_calificacion: desEstadoCalificacion,
          meta_catalogos: {
            pendienteAsignarId: Number(pendienteAsignarRow?.idUsuario || 0) || 0,
            extraordinarioId: Number(extraordinarioRow?.idClasificacion || 0) || 0
          }
        };
      });

      const data = await catalogCachePromise;
      catalogCache = { expiresAt: now + CATALOG_CACHE_TTL_MS, data };
      catalogCachePromise = null;

      return { ok: true, data };
    } catch {
      catalogCachePromise = null;
      return { ok: false, message: "Error cargando catálogos." };
    }
  });

  ipcMain.handle("core:usuarios", async (event) => {
    try {
      const session = requireTrustedSession(event);

      if (!hasPerm(session, "TICKETS_VIEW_ALL") && !hasPerm(session, "REPORTS_VIEW")) {
        return { ok: false, message: "Sin permiso para ver usuarios." };
      }

      const data = await withConn(async (conn) => {
        const [usuarios] = await conn.execute<RowDataPacket[]>(
          `SELECT u.idUsuario, u.usuario, u.nombre, u.activo, r.nombre AS rol
           FROM usuario u
           JOIN rol r ON r.idRol = u.idRol
           ORDER BY u.nombre`
        );
        return { usuarios };
      });

      return { ok: true, data };
    } catch {
      return { ok: false, message: "Error cargando usuarios." };
    }
  });
}
