// src/main/ipc_rutas.ts
import type { IpcMain } from "electron";
import { ensureAssignmentNotificationSchema, withConn } from "./db/db";
import { hasPerm, requirePerm, requireTrustedSession } from "./session_store";
import { assertDateRange } from "./services/validation_service";
import { buildPaginationClause, normalizePagination } from "./services/pagination_service";
import { monthlyRangeMysql, normalizeOpenClosedState } from "./services/domain_utils";

const RUTA_REVIEW_CATALOG_TABLE = "catalogoequiporevisador";
const RUTA_REVIEW_DETAIL_TABLE = "equipos_revisados_rutas";

type RutaReviewCatalogItem = {
  idCatalogoEquipoRevisadoR: number;
  key: string;
  label: string;
  activo: boolean;
};

function normalizeRutaReviewKey(value: any) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

async function loadRutaReviewCatalog(conn: any, onlyActive = true): Promise<RutaReviewCatalogItem[]> {
  const [rows]: any = await conn.execute(
    `SELECT idCatalogoEquipoRevisadoR, clave, nombre, activo
     FROM ${RUTA_REVIEW_CATALOG_TABLE}
     ${onlyActive ? "WHERE activo = 1" : ""}
     ORDER BY orden, idCatalogoEquipoRevisadoR`
  );

  return (rows || [])
    .map((item: any) => ({
      idCatalogoEquipoRevisadoR: Number(item?.idCatalogoEquipoRevisadoR || 0),
      key: normalizeRutaReviewKey(item?.clave || item?.nombre || ""),
      label: String(item?.nombre || "").trim(),
      activo: Number(item?.activo ?? 0) === 1
    }))
    .filter((item: RutaReviewCatalogItem) => item.idCatalogoEquipoRevisadoR > 0 && item.key && item.label);
}

function normalizeRutaReviewItems(raw: any, catalogItems: RutaReviewCatalogItem[]) {
  const reviewCatalogByKey = new Map(
    catalogItems.map((item: RutaReviewCatalogItem) => [item.key, item] as const)
  );
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const items = source
    .map((item: any) => {
      const key = normalizeRutaReviewKey(item?.key || "");
      const catalog = reviewCatalogByKey.get(key);
      const label = String(catalog?.label || item?.label || "").trim();
      const value = Math.max(0, Math.trunc(Number(item?.valor ?? item?.value ?? 0) || 0));
      const validado = !!item?.validado;
      if (!catalog || !label) return null;
      return {
        idCatalogoEquipoRevisadoR: catalog.idCatalogoEquipoRevisadoR,
        key: catalog.key,
        label: label.slice(0, 120),
        valor: value,
        validado
      };
    })
    .filter(Boolean);

  return items;
}

function assertRutaReviewItemsValid(items: any[], catalogItems: RutaReviewCatalogItem[]) {
  if (!catalogItems.length) throw new Error("Catalogo de equipos revisados no configurado.");
  if (items.length !== catalogItems.length) {
    throw new Error("Debes validar todos los equipos revisados antes de validar la ruta.");
  }

  const validItemIds = new Set(
    items
      .filter((item: any) => item?.validado === true)
      .map((item: any) => Number(item?.idCatalogoEquipoRevisadoR || 0))
  );
  const missing = catalogItems.filter((item) => !validItemIds.has(item.idCatalogoEquipoRevisadoR));

  if (missing.length) {
    throw new Error("Debes seleccionar todos los checks de validacion de equipos revisados.");
  }
}

export function registerRutasHandlers(ipcMain: IpcMain) {
  // ==========================
  // LIST
  // ==========================
  ipcMain.handle("rutas:list", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      const { page, pageSize, offset } = normalizePagination(filtros);

      const q = filtros?.q ? String(filtros.q).trim() : null;

      // Frontend manda estado ABIERTO/CERRADO
      const estado = normalizeOpenClosedState(filtros?.estado);

      // Legacy open 0/1 (si no viene estado)
      const open =
        estado
          ? null
          : filtros?.open === 0 || filtros?.open === 1
            ? Number(filtros.open)
            : null;

      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

      const pendingValidationRequested =
        filtros?.idEstadoValidacion === 0 || filtros?.idEstadoValidacion === "0";
      const isGerencialPendingValidation =
        String(session?.rol || "").trim().toUpperCase() === "GERENCIAL" && pendingValidationRequested;

      // El módulo gerencial de validación debe mostrar todas las pendientes,
      // sin importar su fecha. Los demás listados conservan el período 26-25.
      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;
      if (isGerencialPendingValidation) {
        desde = null;
        hasta = null;
      } else if (!desde && !hasta) {
        const r = monthlyRangeMysql(new Date());
        desde = r.start;
        hasta = r.end;
      }
      assertDateRange(desde, hasta);

      // ✅ Roles:
      // - Admin: REPORTS_VIEW => ve todo
      // - Supervisor: tiene RUTAS_CREATE/EDIT/CLOSE => ve solo creadoPor
      // - Técnico: resto => solo donde participa
      // ✅ Ajuste perms: RUTAS_VIEW_ALL para admin (no REPORTS_VIEW)
      const isAdmin = hasPerm(session, "RUTAS_VIEW_ALL");

      const isSupervisor =
        !isAdmin &&
        (hasPerm(session, "RUTAS_CREATE") || hasPerm(session, "RUTAS_EDIT") || hasPerm(session, "RUTAS_CLOSE"));

      const isGerencial =
        !isAdmin &&
        !isSupervisor &&
        (hasPerm(session, "VALIDACION_VIEW") ||
          hasPerm(session, "VALIDACION_RUTAS") ||
          String(session?.rol || "").toUpperCase() === "GERENCIAL");

      const isTecnico = !isAdmin && !isSupervisor && !isGerencial;

      const result = await withConn(async (conn: any) => {
        const where: string[] = [];
        const params: any[] = [];

        if (isTecnico) {
          where.push(
            `EXISTS (SELECT 1 FROM ruta_participante rp WHERE rp.idRuta=r.idRuta AND rp.idTecnico=?)`
          );
          params.push(session.idUsuario);
        } else if (isSupervisor) {
          // ✅ Supervisor: solo lo que él creó
          where.push(`r.creadoPor=?`);
          params.push(session.idUsuario);
        } else if (isGerencial) {
          // Gerencial: solo rutas de sus unidades asignadas (usuario_unidad)
          where.push(`EXISTS (SELECT 1 FROM usuario_unidad uu WHERE uu.idUsuario=? AND uu.idUnidad=r.idUnidad)`);
          params.push(session.idUsuario);
        }
        // Admin: sin restricción

        if (q) {
          if (/^\d+$/.test(q)) {
            where.push(`r.idRuta=?`);
            params.push(Number(q));
          } else {
            where.push(`(r.tipo LIKE ? OR r.observaciones LIKE ?)`);
            params.push(`%${q}%`, `%${q}%`);
          }
        }

        // ✅ Estado basado en fechaCierre (y compat con open)
        if (estado === "ABIERTO") {
          where.push(`(r.fechaCierre IS NULL AND (r.open=0 OR r.open IS NULL))`);
        } else if (estado === "CERRADO") {
          where.push(`(r.fechaCierre IS NOT NULL OR r.open=1)`);
        } else if (open !== null) {
          where.push(`r.open=?`);
          params.push(open);
        }

        if (idUnidad) {
          where.push(`r.idUnidad=?`);
          params.push(idUnidad);
        }

        // Rango por fechaApertura
        if (desde) {
          where.push(`r.fechaApertura>=?`);
          params.push(desde);
        }
        if (hasta) {
          where.push(`r.fechaApertura<=?`);
          params.push(hasta);
        }

        if (idTecnico) {
          where.push(
            `EXISTS (SELECT 1 FROM ruta_participante rp2 WHERE rp2.idRuta=r.idRuta AND rp2.idTecnico=?)`
          );
          params.push(idTecnico);
        }

        // ✅ Filtros nuevos RUTAS
        const idTipoRuta = filtros?.idTipoRuta ? Number(filtros.idTipoRuta) : null;
        const idEstadoValidacion =
          filtros?.idEstadoValidacion === 0 ||
          filtros?.idEstadoValidacion === "0" ||
          filtros?.idEstadoValidacion
            ? Number(filtros.idEstadoValidacion)
            : null;
        const idEstadoCalificacion =
          filtros?.idEstadoCalificacion === 0 ||
          filtros?.idEstadoCalificacion === "0" ||
          filtros?.idEstadoCalificacion
            ? Number(filtros.idEstadoCalificacion)
            : null;

        if (idTipoRuta) {
          where.push("r.idTipoRuta=?");
          params.push(idTipoRuta);
        }
        if (idEstadoValidacion !== null) {
          where.push("r.idEstadoValidacion=?");
          params.push(idEstadoValidacion);
        }
        if (idEstadoCalificacion !== null) {
          where.push("r.idEstadoCalificacion=?");
          params.push(idEstadoCalificacion);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [rows]: any = await conn.execute(
          `SELECT
              r.idRuta,
              r.idUnidad,
              un.nombre AS unidad,
              r.idTipoRuta,
              dtr.nombre AS tipoTexto,
              r.tipo,
              r.fechaApertura,
              r.fechaCierre,
              r.observaciones,
              r.open,
              r.creadoPor,
              r.idEstadoValidacion,
              r.nombreValidador,
              r.puestoValidador,
              r.fechaValidacion,
              dev.nombre AS estadoValidacion,
              r.idEstadoCalificacion,
              r.fechaCalificacion,
              r.idUsuarioCalificador,
              ecal.nombre AS estadoCalificacion,
              COUNT(rp.idTecnico) AS numParticipantes
           FROM ruta r
           JOIN unidad un ON un.idUnidad = r.idUnidad
           LEFT JOIN des_tipo_ruta dtr ON dtr.idTipoRuta = r.idTipoRuta
           LEFT JOIN des_estado_validacion dev ON dev.idEstadoValidacion = r.idEstadoValidacion
           LEFT JOIN des_estado_calificacion ecal ON ecal.idEstadoCalificacion = r.idEstadoCalificacion
           LEFT JOIN ruta_participante rp ON rp.idRuta = r.idRuta
           ${whereSQL}
           GROUP BY r.idRuta, r.idUnidad, un.nombre, r.idTipoRuta, dtr.nombre, r.tipo, 
                    r.fechaApertura, r.fechaCierre, r.observaciones, r.open, r.creadoPor,
                    r.idEstadoValidacion, r.nombreValidador, r.puestoValidador, r.fechaValidacion, dev.nombre,
                    r.idEstadoCalificacion, r.fechaCalificacion, r.idUsuarioCalificador, ecal.nombre
           ORDER BY r.idRuta ${String(filtros?.orden || "").toUpperCase() === "ASC" ? "ASC" : "DESC"}
           ${buildPaginationClause(pageSize, offset)}`,
          params
        );

        const [countRows]: any = await conn.execute(
          `SELECT COUNT(*) AS total
           FROM ruta r
           JOIN unidad un ON un.idUnidad = r.idUnidad
           LEFT JOIN des_tipo_ruta dtr ON dtr.idTipoRuta = r.idTipoRuta
           LEFT JOIN des_estado_validacion dev ON dev.idEstadoValidacion = r.idEstadoValidacion
           LEFT JOIN des_estado_calificacion ecal ON ecal.idEstadoCalificacion = r.idEstadoCalificacion
           ${whereSQL}`,
          params
        );
        const total = Number(countRows?.[0]?.total || 0);

        if (!rows?.length) return { total, rows: [] as any[] };

        const ids = rows.map((x: any) => x.idRuta);

        const [partRows]: any = await conn.execute(
          `SELECT rp.idRuta, u.idUsuario, u.nombre
           FROM ruta_participante rp
           JOIN usuario u ON u.idUsuario=rp.idTecnico
           WHERE rp.idRuta IN (${ids.map(() => "?").join(",")})
           ORDER BY u.nombre`,
          ids
        );

        const map = new Map<number, any[]>();
        for (const pr of partRows) {
          if (!map.has(pr.idRuta)) map.set(pr.idRuta, []);
          map.get(pr.idRuta)!.push({ idUsuario: pr.idUsuario, nombre: pr.nombre });
        }

        const [reviewRows]: any = await conn.execute(
          `SELECT
              err.idRuta,
              err.idCatalogoEquipoRevisadoR,
              cer.clave,
              cer.nombre,
              err.cantidad,
              err.validado
           FROM ${RUTA_REVIEW_DETAIL_TABLE} err
           JOIN ${RUTA_REVIEW_CATALOG_TABLE} cer
             ON cer.idCatalogoEquipoRevisadoR = err.idCatalogoEquipoRevisadoR
           WHERE err.idRuta IN (${ids.map(() => "?").join(",")})
           ORDER BY cer.orden, cer.nombre`,
          ids
        );

        const reviewMap = new Map<number, any[]>();
        for (const rr of reviewRows || []) {
          if (!reviewMap.has(rr.idRuta)) reviewMap.set(rr.idRuta, []);
          reviewMap.get(rr.idRuta)!.push({
            idCatalogoEquipoRevisadoR: rr.idCatalogoEquipoRevisadoR,
            key: rr.clave,
            label: rr.nombre,
            valor: Number(rr.cantidad || 0),
            validado: Number(rr.validado || 0) === 1
          });
        }

        const [previousRouteRows]: any = await conn.execute(
          `SELECT
              cur.idRuta AS currentIdRuta,
              (
                SELECT r2.idRuta
                FROM ruta r2
                WHERE r2.idUnidad = cur.idUnidad
                  AND r2.idRuta < cur.idRuta
                  AND r2.idEstadoValidacion = 1
                ORDER BY r2.idRuta DESC
                LIMIT 1
              ) AS previousIdRuta
           FROM ruta cur
           WHERE cur.idRuta IN (${ids.map(() => "?").join(",")})`,
          ids
        );

        const previousRouteByCurrent = new Map<number, number>();
        const previousIds = Array.from(
          new Set(
            (previousRouteRows || [])
              .map((row: any) => {
                const currentId = Number(row.currentIdRuta || 0);
                const previousId = Number(row.previousIdRuta || 0);
                if (currentId > 0 && previousId > 0) {
                  previousRouteByCurrent.set(currentId, previousId);
                  return previousId;
                }
                return 0;
              })
              .filter((id: number) => id > 0)
          )
        );

        const previousReviewMap = new Map<number, any[]>();
        if (previousIds.length) {
          const [previousReviewRows]: any = await conn.execute(
            `SELECT
                err.idRuta,
                err.idCatalogoEquipoRevisadoR,
                cer.clave,
                cer.nombre,
                err.cantidad,
                err.validado
             FROM ${RUTA_REVIEW_DETAIL_TABLE} err
             JOIN ${RUTA_REVIEW_CATALOG_TABLE} cer
               ON cer.idCatalogoEquipoRevisadoR = err.idCatalogoEquipoRevisadoR
             WHERE err.idRuta IN (${previousIds.map(() => "?").join(",")})
             ORDER BY cer.orden, cer.nombre`,
            previousIds
          );

          for (const rr of previousReviewRows || []) {
            if (!previousReviewMap.has(rr.idRuta)) previousReviewMap.set(rr.idRuta, []);
            previousReviewMap.get(rr.idRuta)!.push({
              idCatalogoEquipoRevisadoR: rr.idCatalogoEquipoRevisadoR,
              key: rr.clave,
              label: rr.nombre,
              valor: Number(rr.cantidad || 0),
              validado: Number(rr.validado || 0) === 1
            });
          }
        }

        return {
          total,
          rows: rows.map((r: any) => ({
            ...r,
            participantes: map.get(r.idRuta) || [],
            equiposRevisados: reviewMap.get(r.idRuta) || [],
            equiposRevisadosAnterior: previousReviewMap.get(previousRouteByCurrent.get(r.idRuta) || 0) || []
          }))
        };
      });

      return { ok: true, page, pageSize, total: result.total, data: result.rows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error listando rutas." };
    }
  });

  // ==========================
  // CREATE
  // ==========================
  ipcMain.handle("rutas:create", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "RUTAS_CREATE");

      const idUnidad = Number(data?.idUnidad);
      const fechaApertura = String(data?.fechaApertura || "").trim();
      const observaciones = data?.observaciones ? String(data.observaciones).trim() : null;

      const participantes: number[] = Array.isArray(data?.participantes)
        ? data.participantes.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n) && n > 0)
        : [];

      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!fechaApertura) throw new Error("Fecha apertura requerida.");
      if (!participantes.length) throw new Error("Debe asignar participantes (mínimo 1).");

      const idRuta = await withConn(async (conn: any) => {
        await ensureAssignmentNotificationSchema(conn);
        await conn.beginTransaction();
        try {
          // ✅ Resuelve idTipoRuta y tipo from unidad.idTipoRuta + des_tipo_ruta.nombre
          const [unidadTipo]: any = await conn.execute(
            `SELECT u.idTipoRuta, dtr.nombre AS tipoTexto
             FROM unidad u
             JOIN des_tipo_ruta dtr ON dtr.idTipoRuta = u.idTipoRuta
             WHERE u.idUnidad = ?`,
            [idUnidad]
          );
          if (!unidadTipo?.length) throw new Error("Unidad inválida o sin tipo de ruta asignado.");

          const { idTipoRuta, tipoTexto } = unidadTipo[0];

          // Validar participantes existen (usuarios)
          if (participantes.length) {
            const idsStr = participantes.map(() => "?").join(",");
            const [validUsers]: any = await conn.execute(
              `SELECT idUsuario FROM usuario WHERE idUsuario IN (${idsStr})`,
              participantes
            );
            if (validUsers.length !== participantes.length) {
              throw new Error("Uno o más participantes inválidos (no existen como usuarios).");
            }
          }

          const [ins]: any = await conn.execute(
            `INSERT INTO ruta (
              idUnidad, idTipoRuta, tipo, fechaApertura, fechaCierre, observaciones, 
              idEstadoValidacion, idEstadoCalificacion, open, creadoPor
            ) VALUES (?,?,?,?,NULL,?,0,0,0,?)`,
            [idUnidad, idTipoRuta, tipoTexto, fechaApertura, observaciones, session.idUsuario]
          );

          const newId = Number(ins.insertId);

          for (const idTec of participantes) {
            await conn.execute(
              `INSERT INTO ruta_participante (idRuta,idTecnico) VALUES (?,?)`,
              [newId, idTec]
            );
            await conn.execute(
              `INSERT INTO notificacion_asignacion
                 (idUsuario, tipo, idReferencia, idUnidad, creadoPor, createdAt)
               VALUES (?, 'RUTA_ASIGNADA', ?, ?, ?, NOW())`,
              [idTec, newId, idUnidad, session.idUsuario]
            );
          }

          await conn.commit();
          return newId;
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true, idRuta };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error creando ruta." };
    }
  });

  // ==========================
  // UPDATE (solo si NO está cerrada)
  // ==========================
  ipcMain.handle("rutas:update", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "RUTAS_EDIT");

      const idRuta = Number(data?.idRuta);
      if (!idRuta) throw new Error("idRuta requerido.");
      const idUnidad = Number(data?.idUnidad);
      const fechaApertura = String(data?.fechaApertura || "").trim();
      const observaciones = data?.observaciones ? String(data.observaciones).trim() : null;

      const participantes: number[] = Array.isArray(data?.participantes)
        ? data.participantes.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n) && n > 0)
        : [];

      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!fechaApertura) throw new Error("Fecha apertura requerida.");
      if (!participantes.length) throw new Error("Debe asignar participantes (mínimo 1).");

      await withConn(async (conn: any) => {
        await ensureAssignmentNotificationSchema(conn);
        await conn.beginTransaction();
        try {
          // Verificar ruta existe y editable (abierta)
          const [st]: any = await conn.execute(
            `SELECT idEstadoValidacion, idTipoRuta, open, fechaCierre
             FROM ruta
             WHERE idRuta=?
             FOR UPDATE`, 
            [idRuta]
          );
          if (!st?.length) throw new Error("Ruta no existe.");
          if (Number(st[0].idEstadoValidacion) !== 0) throw new Error("Ruta validada: no se puede modificar.");
          if (st[0].fechaCierre || Number(st[0].open) === 1) {
            throw new Error("Ruta cerrada o no editable. Use Reabrir.");
          }

          // ✅ Resuelve nuevo tipo from unidad (puede cambiar unidad → nuevo tipo)
          const [unidadTipo]: any = await conn.execute(
            `SELECT u.idTipoRuta, dtr.nombre AS tipoTexto
             FROM unidad u
             JOIN des_tipo_ruta dtr ON dtr.idTipoRuta = u.idTipoRuta
             WHERE u.idUnidad = ?`,
            [idUnidad]
          );
          if (!unidadTipo?.length) throw new Error("Unidad inválida o sin tipo de ruta asignado.");

          const { idTipoRuta, tipoTexto } = unidadTipo[0];

          // Validar participantes
          if (participantes.length) {
            const idsStr = participantes.map(() => "?").join(",");
            const [validUsers]: any = await conn.execute(
              `SELECT idUsuario FROM usuario WHERE idUsuario IN (${idsStr})`,
              participantes
            );
            if (validUsers.length !== participantes.length) {
              throw new Error("Uno o más participantes inválidos.");
            }
          }

          await conn.execute(
            `UPDATE ruta
             SET idUnidad=?, idTipoRuta=?, tipo=?, fechaApertura=?, observaciones=?
             WHERE idRuta=?`,
            [idUnidad, idTipoRuta, tipoTexto, fechaApertura, observaciones, idRuta]
          );

          const [previousParticipantRows]: any = await conn.execute(
            `SELECT idTecnico FROM ruta_participante WHERE idRuta=?`,
            [idRuta]
          );
          const previousParticipantSet = new Set(
            (previousParticipantRows || []).map((row: any) => Number(row.idTecnico))
          );
          await conn.execute(`DELETE FROM ruta_participante WHERE idRuta=?`, [idRuta]);
          for (const idTec of participantes) {
            await conn.execute(
              `INSERT INTO ruta_participante (idRuta,idTecnico) VALUES (?,?)`,
              [idRuta, idTec]
            );
            if (!previousParticipantSet.has(idTec)) {
              await conn.execute(
                `INSERT INTO notificacion_asignacion
                   (idUsuario, tipo, idReferencia, idUnidad, creadoPor, createdAt)
                 VALUES (?, 'RUTA_ASIGNADA', ?, ?, ?, NOW())`,
                [idTec, idRuta, idUnidad, session.idUsuario]
              );
            }
          }

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error actualizando ruta." };
    }
  });

  // ==========================
  // CLOSE (deshabilitado - el cierre es automatico al validar)
  // ==========================
  ipcMain.handle("rutas:close", async (event) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "RUTAS_CLOSE");
      throw new Error("Cierre manual deshabilitado. La ruta se cierra automaticamente al validar.");
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error cerrando ruta." };
    }
  });

  // ==========================
  // REOPEN
  // ==========================
  ipcMain.handle("rutas:reopen", async (event, session: any, idRuta: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "RUTAS_REOPEN");
      if (!idRuta) throw new Error("idRuta requerido.");

      await withConn(async (conn: any) => {
        await conn.beginTransaction();
        try {
          const [st]: any = await conn.execute(
            `SELECT idEstadoValidacion, open, fechaCierre
             FROM ruta
             WHERE idRuta=?
             FOR UPDATE`,
            [idRuta]
          );
          if (!st?.length) throw new Error("Ruta no existe.");
          if (Number(st[0].idEstadoValidacion) !== 0) throw new Error("No se puede reabrir una ruta validada.");
          if (!st[0].fechaCierre && Number(st[0].open) === 0) throw new Error("Ya está abierta.");

          await conn.execute(`UPDATE ruta SET open=0, fechaCierre=NULL WHERE idRuta=?`, [idRuta]);
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error reabriendo ruta." };
    }
  });

  // ==========================
  // VALIDAR RUTA (Gerencial: VALIDACION_RUTAS)
  // ==========================
  ipcMain.handle(
    "rutas:validar",
      async (
        event,
        session: any,
        idRuta: number,
        nombreValidador: string,
        puestoValidador: string,
        observaciones?: string,
        fechaValidacion?: string,
        revisionEquipos?: any
      ) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "VALIDACION_RUTAS");

      if (!idRuta) throw new Error("idRuta requerido.");
      if (!nombreValidador?.trim()) throw new Error("Nombre validador requerido.");
      if (!puestoValidador?.trim()) throw new Error("Puesto validador requerido.");

      const result = await withConn(async (conn: any) => {
        await ensureAssignmentNotificationSchema(conn);
        await conn.beginTransaction();

        try {
          // Verificar ruta existe y PENDIENTE validación
          const [st]: any = await conn.execute(
            `SELECT idEstadoValidacion, open, fechaCierre, idUnidad, observaciones, creadoPor
             FROM ruta
             WHERE idRuta=?
             FOR UPDATE`,
            [idRuta]
          );
          if (!st?.length) throw new Error("Ruta no existe.");
          const ruta = st[0];
          if (ruta.idEstadoValidacion !== 0) throw new Error("Ruta ya validada.");

          // Seguridad: gerencial solo puede validar rutas de sus unidades asignadas
          const [uu]: any = await conn.execute(
            `SELECT 1 FROM usuario_unidad uu WHERE uu.idUsuario=? AND uu.idUnidad=? LIMIT 1`,
            [session.idUsuario, ruta.idUnidad]
          );
          if (!uu?.length) throw new Error("La ruta no pertenece a tu unidad asignada.");

          const obsPrev = ruta.observaciones ? String(ruta.observaciones) : "";
          const obsNew = String(observaciones || "").trim();
          const mergedObs = obsNew ? (obsPrev.trim() ? obsPrev.trim() + "\n" + obsNew : obsNew) : obsPrev;

          const fv = String(fechaValidacion || "").trim();
          const fvOk = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fv) ? fv : null;
          const reviewCatalog = await loadRutaReviewCatalog(conn, true);
          const reviewItems = normalizeRutaReviewItems(revisionEquipos, reviewCatalog);
          assertRutaReviewItemsValid(reviewItems, reviewCatalog);

          await conn.execute(
            `UPDATE ruta 
             SET idEstadoValidacion=1, 
                 nombreValidador=?, 
                 puestoValidador=?, 
                 observaciones=?,
                 fechaValidacion=IFNULL(?, NOW()),
                 open=1,
                 fechaCierre=IFNULL(fechaCierre, IFNULL(?, NOW()))
             WHERE idRuta=?`,
            [nombreValidador.trim(), puestoValidador.trim(), mergedObs, fvOk, fvOk, idRuta]
          );

          await conn.execute(`DELETE FROM ${RUTA_REVIEW_DETAIL_TABLE} WHERE idRuta=?`, [idRuta]);
          for (const item of reviewItems) {
            await conn.execute(
              `INSERT INTO ${RUTA_REVIEW_DETAIL_TABLE} (idRuta, idCatalogoEquipoRevisadoR, cantidad, validado)
               VALUES (?,?,?,?)`,
              [idRuta, item.idCatalogoEquipoRevisadoR, item.valor, item.validado ? 1 : 0]
            );
          }

          if (String(session?.rol || "").trim().toUpperCase() === "GERENCIAL") {
            await conn.execute(
              `INSERT INTO notificacion_asignacion
                 (idUsuario, tipo, idReferencia, idUnidad, creadoPor, createdAt)
               SELECT r.creadoPor, 'RUTA_VALIDADA', r.idRuta, r.idUnidad, ?, NOW()
               FROM ruta r
               JOIN usuario creator ON creator.idUsuario = r.creadoPor
               JOIN rol creatorRole ON creatorRole.idRol = creator.idRol
               WHERE r.idRuta = ?
                 AND UPPER(creatorRole.nombre) = 'SUPERVISOR'`,
              [session.idUsuario, idRuta]
            );
          }

          await conn.commit();
          return true;
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: !!result };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error validando ruta." };
    }
  });

  // ==========================
  // CALIFICAR RUTA (Admin: CALIFICACION_RUTAS)
  // ==========================
  ipcMain.handle("rutas:calificar", async (event, session: any, idRuta: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "CALIFICACION_RUTAS");

      if (!idRuta) throw new Error("idRuta requerido.");

      const result = await withConn(async (conn: any) => {
        await conn.beginTransaction();

        try {
          // Verificar ruta existe (no check estado - puede calificarse independientemente)
          const [st]: any = await conn.execute(
            `SELECT idEstadoValidacion, idEstadoCalificacion
             FROM ruta
             WHERE idRuta=?
             FOR UPDATE`,
            [idRuta]
          );
          if (!st?.length) throw new Error("Ruta no existe.");
          if (Number(st[0].idEstadoValidacion) !== 1) throw new Error("Ruta no validada. Debe validarse antes de calificar.");
          if (st[0].idEstadoCalificacion !== 0) throw new Error("Ruta ya calificada.");

          await conn.execute(
            `UPDATE ruta 
             SET idEstadoCalificacion=1, 
                 fechaCalificacion=NOW(),
                 idUsuarioCalificador=?
             WHERE idRuta=?`,
            [session.idUsuario, idRuta]
          );

          await conn.commit();
          return true;
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: !!result };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error calificando ruta." };
    }
  });

  // ==========================
  // CALIFICAR TODAS (bulk) (Admin: CALIFICACION_RUTAS)
  // ==========================
  ipcMain.handle("rutas:calificarAll", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "CALIFICACION_RUTAS");
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;
      if (!desde && !hasta) {
        const r = monthlyRangeMysql(new Date());
        desde = r.start;
        hasta = r.end;
      }

      const isAdmin = hasPerm(session, "RUTAS_VIEW_ALL");
      const isSupervisor =
        !isAdmin &&
        (hasPerm(session, "RUTAS_CREATE") || hasPerm(session, "RUTAS_EDIT") || hasPerm(session, "RUTAS_CLOSE"));

      const isGerencial =
        !isAdmin &&
        !isSupervisor &&
        (hasPerm(session, "VALIDACION_VIEW") ||
          hasPerm(session, "VALIDACION_RUTAS") ||
          String(session?.rol || "").toUpperCase() === "GERENCIAL");

      const isTecnico = !isAdmin && !isSupervisor && !isGerencial;

      const affectedRows = await withConn(async (conn: any) => {
        const where: string[] = [];
        const params: any[] = [session.idUsuario]; // SET idUsuarioCalificador=?

        // Solo rutas VALIDADAS + pendientes
        where.push("r.idEstadoValidacion=1");
        where.push("r.idEstadoCalificacion=0");

        // Seguridad: mismo alcance que list
        if (isTecnico) {
          where.push(`EXISTS (SELECT 1 FROM ruta_participante rp WHERE rp.idRuta=r.idRuta AND rp.idTecnico=?)`);
          params.push(session.idUsuario);
        } else if (isSupervisor) {
          where.push("r.creadoPor=?");
          params.push(session.idUsuario);
        } else if (isGerencial) {
          where.push(`EXISTS (SELECT 1 FROM usuario_unidad uu WHERE uu.idUsuario=? AND uu.idUnidad=r.idUnidad)`);
          params.push(session.idUsuario);
        }

        if (q) {
          if (/^\\d+$/.test(q)) {
            where.push(`r.idRuta=?`);
            params.push(Number(q));
          } else {
            where.push(`(r.tipo LIKE ? OR r.observaciones LIKE ?)`);
            params.push(`%${q}%`, `%${q}%`);
          }
        }

        if (idUnidad) {
          where.push("r.idUnidad=?");
          params.push(idUnidad);
        }

        // Rango por fechaApertura (consistencia con list)
        if (desde) {
          where.push("r.fechaApertura>=?");
          params.push(desde);
        }
        if (hasta) {
          where.push("r.fechaApertura<=?");
          params.push(hasta);
        }

        if (idTecnico) {
          where.push(`EXISTS (SELECT 1 FROM ruta_participante rp2 WHERE rp2.idRuta=r.idRuta AND rp2.idTecnico=?)`);
          params.push(idTecnico);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `UPDATE ruta r
           SET r.idEstadoCalificacion=1,
               r.fechaCalificacion=NOW(),
               r.idUsuarioCalificador=?
           ${whereSQL}`,
          params
        );

        return Number(res?.affectedRows || 0);
      });

      return { ok: true, affectedRows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error calificando todas las rutas." };
    }
  });

  // ==========================
  // DELETE
  // ==========================
  ipcMain.handle("rutas:delete", async (event, session: any, idRuta: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "RUTAS_DELETE");
      if (!idRuta) throw new Error("idRuta requerido.");

      await withConn(async (conn: any) => {
        await conn.beginTransaction();
        try {
          const [st]: any = await conn.execute(
            `SELECT idEstadoValidacion
             FROM ruta
             WHERE idRuta=?
             FOR UPDATE`,
            [idRuta]
          );
          if (!st?.length) throw new Error("Ruta no existe.");
          if (Number(st[0].idEstadoValidacion) !== 0) throw new Error("No se puede borrar una ruta validada.");

          await conn.execute(`DELETE FROM ruta_participante WHERE idRuta=?`, [idRuta]);
          await conn.execute(`DELETE FROM ruta WHERE idRuta=?`, [idRuta]);
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error borrando ruta." };
    }
  });
}
