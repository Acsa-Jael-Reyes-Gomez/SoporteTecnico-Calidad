import type { IpcMain } from "electron";
import { withConn } from "./db/db";
import { hasPerm, requirePerm, requireTrustedSession } from "./session_store";
import { buildPaginationClause, normalizePagination } from "./services/pagination_service";
import { assertDateRange } from "./services/validation_service";
import { monthlyRangeMysql } from "./services/domain_utils";

function normalizeUrl(url: string) {
  return String(url || "").trim();
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.host;
  } catch {
    return false;
  }
}

export function registerProyectosEspecialesHandlers(ipcMain: IpcMain) {
  ipcMain.handle("proyectos_especiales:list", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      // REPLICAR LÓGICA EXACTA DE TICKETS/RUTAS/EQUIPOS para TÉCNICO LECTURA
      const canDownloadDocumento = hasPerm(session, "PROYECTOS_ESPECIALES_DOWNLOAD");
      const isAdmin =
        hasPerm(session, "PROYECTOS_ESPECIALES_VIEW_ALL") ||
        hasPerm(session, "PROYECTOS_ESPECIALES_REVIEW") ||
        hasPerm(session, "REPORTS_VIEW");
      const isSupervisor = !isAdmin &&
        (hasPerm(session, "PROYECTOS_ESPECIALES_CREATE") ||
         hasPerm(session, "PROYECTOS_ESPECIALES_EDIT"));
      const isTecnico = !isAdmin && !isSupervisor;


      const { page, pageSize, offset } = normalizePagination(filtros);

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const estadoRevision = filtros?.estadoRevision ? String(filtros.estadoRevision).trim() : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

      let desde = filtros?.desde ? String(filtros.desde).trim() + ' 00:00:00' : null;
      let hasta = filtros?.hasta ? String(filtros.hasta).trim() + ' 23:59:59' : null;

      if (!desde && !hasta) {
        const r = monthlyRangeMysql(new Date());
        desde = r.start;
        hasta = r.end;
      }
      assertDateRange(desde, hasta);

      const result = await withConn(async (conn) => {
        const where: string[] = ["pe.activo=1"];
        const params: any[] = [];

        // FILTRO POR ROL - TÉCNICO solo ve proyectos ASIGNADOS (igual Tickets)
        if (isTecnico) {
          where.push(`EXISTS (SELECT 1 FROM proyecto_especial_participante pep WHERE pep.idProyectoEspecial=pe.idProyectoEspecial AND pep.idUsuario=?)`);
          params.push(session.idUsuario);
        } else if (isSupervisor) {
          where.push(`pe.idUsuarioCreador=?`);
          params.push(session.idUsuario);
        }
        // Admin ve todo


        if (q) {
          where.push("(pe.titulo LIKE ? OR pe.descripcion LIKE ? OR u.nombre LIKE ?)");
          params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        if (estadoRevision) {
          where.push("pe.estadoRevision=?");
          params.push(estadoRevision);
        }

        if (idUnidad) {
          where.push("pe.idUnidad=?");
          params.push(idUnidad);
        }

        if (idTecnico) {
          where.push(`EXISTS (SELECT 1 FROM proyecto_especial_participante pep WHERE pep.idProyectoEspecial=pe.idProyectoEspecial AND pep.idUsuario=?)`);
          params.push(idTecnico);
        }

        if (desde) {
          where.push("pe.fechaRegistro>=?");
          params.push(desde);
        }

        if (hasta) {
          where.push("pe.fechaRegistro<=?");
          params.push(hasta);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [rows]: any = await conn.execute(
          `SELECT
             pe.idProyectoEspecial,
             pe.titulo,
             pe.descripcion,
             pe.fechaRegistro,
             pe.idUnidad,
             pe.idUsuarioCreador,
             pe.urlDocumento,
             pe.estadoRevision,
             pe.fechaRevision,
             pe.idAdminRevisor,
             pe.activo,
             u.nombre AS creadorNombre,
             un.nombre AS unidadNombre,
             ar.nombre AS adminRevisorNombre
           FROM proyecto_especial pe
           JOIN usuario u ON u.idUsuario = pe.idUsuarioCreador
           JOIN unidad un ON un.idUnidad = pe.idUnidad
           LEFT JOIN usuario ar ON ar.idUsuario = pe.idAdminRevisor
           ${whereSQL}
           ORDER BY pe.idProyectoEspecial ${String(filtros?.orden || "").toUpperCase() === "ASC" ? "ASC" : "DESC"}
           ${buildPaginationClause(pageSize, offset)}`,
          params
        );

        const [countRows]: any = await conn.execute(
          `SELECT COUNT(*) AS total
           FROM proyecto_especial pe
           JOIN usuario u ON u.idUsuario = pe.idUsuarioCreador
           JOIN unidad un ON un.idUnidad = pe.idUnidad
           LEFT JOIN usuario ar ON ar.idUsuario = pe.idAdminRevisor
           ${whereSQL}`,
          params
        );
        const total = Number(countRows?.[0]?.total || 0);

        const ids = rows.map((r: any) => r.idProyectoEspecial);

        if (ids.length) {
          const placeholders = ids.map(() => "?").join(",");
          const [parts]: any = await conn.execute(
            `SELECT
               pep.idProyectoEspecial,
               u.idUsuario,
               u.nombre
             FROM proyecto_especial_participante pep
             JOIN usuario u ON u.idUsuario = pep.idUsuario
             WHERE pep.idProyectoEspecial IN (${placeholders})
             ORDER BY u.nombre`,
            ids
          );

          const map = new Map<number, Array<{ idUsuario: number; nombre: string }>>();

          for (const p of parts) {
            if (!map.has(p.idProyectoEspecial)) {
              map.set(p.idProyectoEspecial, []);
            }
            map.get(p.idProyectoEspecial)!.push({
              idUsuario: Number(p.idUsuario),
              nombre: p.nombre,
            });
          }

          for (const row of rows) {
            row.participantes = map.get(row.idProyectoEspecial) || [];
          }
        } else {
          for (const row of rows) {
            row.participantes = [];
          }
        }

        const kpiMap: any = {
          PENDIENTE: 0,
          APROBADO: 0,
        };

        const [kpis]: any = await conn.execute(
          `SELECT pe.estadoRevision, COUNT(*) AS total
           FROM proyecto_especial pe
           JOIN usuario u ON u.idUsuario = pe.idUsuarioCreador
           ${whereSQL}
           GROUP BY pe.estadoRevision`,
          params
        );

        for (const k of kpis) {
          kpiMap[k.estadoRevision] = Number(k.total || 0);
        }

        const sanitizedRows = rows.map((row: any) => {
          const tieneDocumento = !!String(row?.urlDocumento || "").trim();
          return {
            ...row,
            tieneDocumento,
            documentoBloqueado: !canDownloadDocumento && tieneDocumento,
            urlDocumento: canDownloadDocumento ? row.urlDocumento : null,
          };
        });

        return {
          total,
          rows: sanitizedRows,
          kpis: kpiMap,
          totalPendientes: kpiMap.PENDIENTE || 0,
        };
      });

      return {
        ok: true,
        page,
        pageSize,
        total: result.total,
        data: result.rows,
        kpis: result.kpis,
        totalPendientes: result.totalPendientes,
      };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error listando proyectos especiales." };
    }
  });

  ipcMain.handle("proyectos_especiales:create", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      const isAdmin = session?.rol === "ADMIN";
      const isSupervisor = session?.rol === "SUPERVISOR";

      if (!isAdmin && !isSupervisor) {
        throw new Error("Acceso denegado al módulo.");
      }

      requirePerm(session, "PROYECTOS_ESPECIALES_CREATE");

      const titulo = String(data?.titulo || "").trim();
      const descripcion = data?.descripcion ? String(data.descripcion).trim() : null;
      const idUnidad = Number(data?.idUnidad);
      const urlDocumento = normalizeUrl(data?.urlDocumento);

      const participantes: number[] = Array.isArray(data?.participantes)
        ? data.participantes
            .map((v: any) => Number(v))
            .filter((n: number) => Number.isFinite(n) && n > 0)
        : [];

      if (!titulo) throw new Error("Título requerido.");
      if (!idUnidad || !Number.isFinite(idUnidad)) throw new Error("Unidad requerida.");
      if (!participantes.length) throw new Error("Debe seleccionar al menos un participante.");
      if (!urlDocumento) throw new Error("Debe ingresar el enlace del documento.");
      if (!isValidUrl(urlDocumento)) throw new Error("El enlace del documento no es válido.");

      const fechaRegistro = new Date().toISOString().slice(0, 19).replace("T", " ");

      const idProyecto = await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const [ins]: any = await conn.execute(
            `INSERT INTO proyecto_especial
              (titulo, descripcion, fechaRegistro, idUnidad, idUsuarioCreador, urlDocumento, estadoRevision)
             VALUES (?,?,?,?,?,?,?)`,
            [titulo, descripcion, fechaRegistro, idUnidad, session.idUsuario, urlDocumento, "PENDIENTE"]
          );

          const newId = Number(ins.insertId);

          for (const idUser of participantes) {
            await conn.execute(
              `INSERT IGNORE INTO proyecto_especial_participante
                (idProyectoEspecial, idUsuario)
               VALUES (?,?)`,
              [newId, idUser]
            );
          }

          await conn.commit();
          return newId;
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true, idProyectoEspecial: idProyecto };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error creando proyecto especial." };
    }
  });

  ipcMain.handle("proyectos_especiales:approve", async (event, session: any, idProyectoEspecial: number) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida.");
      if (session?.rol !== "ADMIN") throw new Error("Solo ADMIN puede aprobar proyectos especiales.");

      requirePerm(session, "PROYECTOS_ESPECIALES_REVIEW");

      const id = Number(idProyectoEspecial);
      if (!id || !Number.isFinite(id)) throw new Error("Proyecto inválido.");

      const fechaRevision = new Date().toISOString().slice(0, 19).replace("T", " ");

      const result = await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const [rows]: any = await conn.execute(
            `SELECT idProyectoEspecial, activo, estadoRevision
             FROM proyecto_especial
             WHERE idProyectoEspecial=?
             FOR UPDATE`,
            [id]
          );

          if (!rows?.length) {
            throw new Error("Proyecto inválido.");
          }

          const current = rows[0];
          if (Number(current?.activo ?? 0) !== 1) {
            throw new Error("El proyecto ya no está activo.");
          }
          if (String(current?.estadoRevision || "").trim().toUpperCase() === "APROBADO") {
            throw new Error("El proyecto ya estaba aprobado.");
          }

          const [upd]: any = await conn.execute(
            `UPDATE proyecto_especial
             SET estadoRevision='APROBADO',
                 fechaRevision=?,
                 idAdminRevisor=?
             WHERE idProyectoEspecial=?`,
            [fechaRevision, session.idUsuario, id]
          );

          await conn.commit();
          return Number(upd?.affectedRows || 0);
        } catch (error) {
          await conn.rollback();
          throw error;
        }
      });

      if (!result) {
        throw new Error("El proyecto ya estaba aprobado o no pudo actualizarse.");
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error aprobando proyecto especial." };
    }
  });
}
