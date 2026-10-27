// src/main/ipc_equipos.ts
import { app, type IpcMain } from "electron";
import { withConn } from "./db/db";
import { hasPerm, requirePerm, requireTrustedSession } from "./session_store";
import { buildPaginationClause, normalizePagination } from "./services/pagination_service";
import { assertDateRange } from "./services/validation_service";

function devError(...args: any[]) {
  if (!app.isPackaged) console.error(...args);
}

function getEquiposScope(session: any) {
  const isAdmin = hasPerm(session, "REPORTS_VIEW") || hasPerm(session, "TICKETS_VIEW_ALL");
  const isSupervisor =
    !isAdmin &&
    (hasPerm(session, "EQUIPOS_CREATE") || hasPerm(session, "EQUIPOS_EDIT") || hasPerm(session, "EQUIPOS_DELETE"));
  const isTecnico = !isAdmin && !isSupervisor;

  return { isAdmin, isSupervisor, isTecnico };
}

function pushTicketScope(where: string[], params: any[], session: any, ticketAlias = "t") {
  const scope = getEquiposScope(session);

  if (scope.isTecnico) {
    where.push(
      `EXISTS (SELECT 1 FROM ticket_tecnico tt WHERE tt.idTicket=${ticketAlias}.idTicket AND tt.idTecnico=?)`
    );
    params.push(session.idUsuario);
  } else if (scope.isSupervisor) {
    where.push(`${ticketAlias}.creadoPor=?`);
    params.push(session.idUsuario);
  }

  return scope;
}

function pushEquipoScope(where: string[], params: any[], session: any, equipoAlias = "te") {
  const scope = getEquiposScope(session);

  if (scope.isTecnico) {
    where.push(`${equipoAlias}.idTecnicoAsignado=?`);
    params.push(session.idUsuario);
  } else if (scope.isSupervisor) {
    where.push(`${equipoAlias}.registradoPor=?`);
    params.push(session.idUsuario);
  }

  return scope;
}

export function registerEquiposHandlers(ipcMain: IpcMain) {

  // LIST TICKETS ABIERTOS PARA EQUIPOS
  ipcMain.handle("equipos:ticketsAbiertos", async (event, session: any) => {
    try {
      session = requireTrustedSession(event);
      
      const result = await withConn(async (conn) => {
        const where: string[] = [`t.fechaCierre IS NULL`];
        const params: any[] = [];
        pushTicketScope(where, params, session, "t");
        const whereSQL = `WHERE ${where.join(" AND ")}`;
        const [rows]: any = await conn.execute(
          `SELECT 
              t.idTicket,
              t.nombreSolicitante,
              t.idUnidad,
              un.nombre AS unidad,
              tt.idTecnico,
              tu.nombre AS tecnicoNombre
           FROM ticket t
           JOIN unidad un ON un.idUnidad = t.idUnidad
           LEFT JOIN (
             SELECT idTicket, MIN(idTecnico) AS idTecnico
             FROM ticket_tecnico
             GROUP BY idTicket
           ) tt ON tt.idTicket = t.idTicket
           LEFT JOIN usuario tu ON tu.idUsuario = tt.idTecnico
           ${whereSQL}
           ORDER BY t.idTicket DESC
           LIMIT 100`,
          params
        );

        return rows || [];
      });

      return { ok: true, data: result };
    } catch (err: any) {
      devError("equipos:ticketsAbiertos error:", err);
      return { ok: false, message: err?.message ?? "Error listando tickets abiertos." };
    }
  });

  // CREATE - Crear nuevo equipo con número automático
  ipcMain.handle("equipos:create", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_CREATE");

      const idTicket = Number(data?.idTicket);
      const idUnidad = Number(data?.idUnidad);
      const idTecnicoAsignado = Number(data?.idTecnicoAsignado);
      const idTipoEquipo = Number(data?.idTipoEquipo);
      const fechaRecibido = String(data?.fechaRecibido || "").trim();

      if (!idTicket) throw new Error("Ticket requerido.");
      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!idTecnicoAsignado) throw new Error("Técnico asignado requerido.");
      if (!idTipoEquipo) throw new Error("Tipo de equipo requerido.");
      if (!fechaRecibido) throw new Error("Fecha de recibido requerida.");

      const idEquipo = await withConn(async (conn) => {
        await conn.beginTransaction();
        const ticketWhere: string[] = [`t.idTicket = ?`, `t.fechaCierre IS NULL`];
        const ticketParams: any[] = [idTicket];
        pushTicketScope(ticketWhere, ticketParams, session, "t");
        try {
          // Verificar que el ticket existe y está abierto
          const [ticketCheck]: any = await conn.execute(
            `SELECT t.idTicket
             FROM ticket t
             WHERE ${ticketWhere.join(" AND ")}
             LIMIT 1
             FOR UPDATE`,
            ticketParams
          );
          if (!ticketCheck?.length) {
            throw new Error("Ticket no existe o ya está cerrado.");
          }

          // ✅ VALIDACIÓN: Verificar que no haya otro equipo activo en taller
          const [equipoActivo]: any = await conn.execute(
            `SELECT idEquipoControl, numeroEquipo, estado 
             FROM ticket_equipo 
             WHERE idTicket = ? AND activo = 1 AND estado = 'EN_TALLER'
             FOR UPDATE`,
            [idTicket]
          );
          if (equipoActivo?.length > 0) {
            throw new Error("Este ticket ya tiene un equipo registrado en taller. Complete o cancele el equipo actual antes de crear uno nuevo.");
          }

          // INSERT inicial sin numeroEquipo (se generará después)
          const [ins]: any = await conn.execute(
            `INSERT INTO ticket_equipo 
              (idTicket, idUnidad, idTecnicoAsignado, registradoPor, numeroEquipo, idTipoEquipo, fechaRecibido, estado, resultado, activo)
             VALUES (?,?,?,?,'',?,?,'EN_TALLER','PENDIENTE',1)`,
            [idTicket, idUnidad, idTecnicoAsignado, session.idUsuario, idTipoEquipo, fechaRecibido]
          );

          const newId = Number(ins.insertId);

          // Generar número automático EQ-000001
          await conn.execute(
            `UPDATE ticket_equipo 
             SET numeroEquipo = CONCAT('EQ-', LPAD(?, 6, '0'))
             WHERE idEquipoControl = ?`,
            [newId, newId]
          );

          await conn.commit();
          return newId;
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true, idEquipo };
    } catch (err: any) {
      devError("equipos:create error:", err);
      return { ok: false, message: err?.message ?? "Error creando equipo." };
    }
  });

  // ==========================
  // LIST - Lista equipos con filtros y joins completos
  // ==========================
  ipcMain.handle("equipos:list", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      const { page, pageSize, offset } = normalizePagination(filtros);

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const idTicket = filtros?.idTicket ? Number(filtros.idTicket) : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const desde = filtros?.desde ? String(filtros.desde).trim() : null;
      const hasta = filtros?.hasta ? String(filtros.hasta).trim() : null;
      const estado = filtros?.estado ? String(filtros.estado).trim().toUpperCase() : null;
      const resultado = filtros?.resultado ? String(filtros.resultado).trim().toUpperCase() : null;
      assertDateRange(desde, hasta);

      // REPLICAR LÓGICA EXACTA DE TICKETS/RUTAS: Admin/Supervisor/Técnico
      const result = await withConn(async (conn) => {
        const where: string[] = ["te.activo=1"];
        const params: any[] = [];

        pushEquipoScope(where, params, session, "te");

        if (q) {
          where.push(`(te.numeroEquipo LIKE ?)`);
          params.push(`%${q}%`);
        }

        if (idTicket) {
          where.push(`te.idTicket=?`);
          params.push(idTicket);
        }

        if (idUnidad) {
          where.push(`te.idUnidad=?`);
          params.push(idUnidad);
        }

        if (idTecnico) {
          where.push(`te.idTecnicoAsignado=?`);
          params.push(idTecnico);
        }

        if (desde) {
          where.push(`te.fechaRecibido>=?`);
          params.push(desde);
        }

        if (hasta) {
          where.push(`te.fechaRecibido<=?`);
          params.push(hasta);
        }

        if (estado) {
          where.push(`te.estado=?`);
          params.push(estado);
        }

        if (resultado) {
          where.push(`te.resultado=?`);
          params.push(resultado);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        // SELECT con JOINs completos
        const [rows]: any = await conn.execute(
          `SELECT
              te.idEquipoControl,
              te.numeroEquipo,
              te.idTicket,
              te.idUnidad,
              un.nombre AS unidad,
              te.idTipoEquipo,
              tpe.nombre AS tipoEquipo,
              te.idTecnicoAsignado,
              tec.nombre AS tecnicoAsignado,
              te.fechaRecibido,
              te.fechaSalida,
              te.estado,
              te.resultado,
              te.registradoPor,
              reg.nombre AS registradoPorNombre
           FROM ticket_equipo te
           JOIN unidad un ON un.idUnidad = te.idUnidad
           JOIN tipo_equipo tpe ON tpe.idTipoEquipo = te.idTipoEquipo
           JOIN usuario tec ON tec.idUsuario = te.idTecnicoAsignado
           JOIN usuario reg ON reg.idUsuario = te.registradoPor
           ${whereSQL}
           ORDER BY te.idEquipoControl DESC
           ${buildPaginationClause(pageSize, offset)}`,
          params
        );

        const [countRows]: any = await conn.execute(
          `SELECT COUNT(*) AS total
           FROM ticket_equipo te
           JOIN ticket t ON t.idTicket=te.idTicket
           JOIN unidad un ON un.idUnidad=te.idUnidad
           JOIN tipo_equipo tpe ON tpe.idTipoEquipo=te.idTipoEquipo
           JOIN usuario tec ON tec.idUsuario=te.idTecnicoAsignado
           JOIN usuario reg ON reg.idUsuario=te.registradoPor
           ${whereSQL}`,
          params
        );
        const total = Number(countRows?.[0]?.total || 0);

        return { total, rows: rows || [] };
      });

      return { ok: true, page, pageSize, total: result.total, data: result.rows };
    } catch (err: any) {
      devError("equipos:list error:", err);
      return { ok: false, message: err?.message ?? "Error listando equipos." };
    }
  });

  // ==========================
  // UPDATE RESULTADO - Actualizar solo el resultado del equipo
  // ==========================
  ipcMain.handle("equipos:updateResultado", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_EDIT");

      const idEquipoControl = Number(data?.idEquipoControl);
      const resultado = data?.resultado ? String(data.resultado).trim().toUpperCase() : null;

      if (!idEquipoControl) throw new Error("ID de equipo requerido.");
      
      // Solo permite CON_SOLUCION o SIN_SOLUCION
      if (!resultado || !["CON_SOLUCION", "SIN_SOLUCION"].includes(resultado)) {
        throw new Error("Resultado inválido. Use CON_SOLUCION o SIN_SOLUCION.");
      }

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const where: string[] = [`te.idEquipoControl = ?`];
          const params: any[] = [idEquipoControl];
          pushEquipoScope(where, params, session, "te");

          const [current]: any = await conn.execute(
            `SELECT te.estado, te.resultado
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}
             FOR UPDATE`,
            params
          );
          if (!current?.length) throw new Error("Equipo no existe.");
          
          if (current[0].estado === "ENTREGADO") {
            throw new Error("Equipo ya entregado. No se puede modificar.");
          }

          await conn.execute(
            `UPDATE ticket_equipo te
             SET te.resultado = ?
             WHERE ${where.join(" AND ")}`,
            [resultado, ...params]
          );
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:updateResultado error:", err);
      return { ok: false, message: err?.message ?? "Error actualizando resultado." };
    }
  });

  // ==========================
  // GET BY TICKET - Obtiene equipos de un ticket específico
  // ==========================
  ipcMain.handle("equipos:byTicket", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);


      const result = await withConn(async (conn) => {
        const where: string[] = [`te.idTicket = ?`, `te.activo = 1`];
        const params: any[] = [idTicket];
        pushEquipoScope(where, params, session, "te");

        const [rows]: any = await conn.execute(
          `SELECT 
              te.idEquipoControl,
              te.numeroEquipo,
              te.idTicket,
              te.idUnidad,
              un.nombre AS unidad,
              te.idTipoEquipo,
              tpe.nombre AS tipoEquipo,
              te.idTecnicoAsignado,
              tec.nombre AS tecnicoAsignado,
              te.fechaRecibido,
              te.fechaSalida,
              te.estado,
              te.resultado,
              te.registradoPor,
              reg.nombre AS registradoPorNombre
           FROM ticket_equipo te
            JOIN unidad un ON un.idUnidad = te.idUnidad
            JOIN tipo_equipo tpe ON tpe.idTipoEquipo = te.idTipoEquipo
            JOIN usuario tec ON tec.idUsuario = te.idTecnicoAsignado
            JOIN usuario reg ON reg.idUsuario = te.registradoPor
            WHERE ${where.join(" AND ")}
            ORDER BY te.idEquipoControl DESC`,
          params
        );

        return rows || [];
      });

      return { ok: true, data: result };
    } catch (err: any) {
      devError("equipos:byTicket error:", err);
      return { ok: false, message: err?.message ?? "Error obteniendo equipos del ticket." };
    }
  });


  // CHECK EQUIPO ACTIVO EN TALLER - Verifica si hay equipos activos en taller
  
  ipcMain.handle("equipos:checkActivoEnTaller", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);
      const result = await withConn(async (conn) => {
        const where: string[] = [`te.idTicket = ?`, `te.activo = 1`, `te.estado = 'EN_TALLER'`];
        const params: any[] = [idTicket];
        pushEquipoScope(where, params, session, "te");

        const [rows]: any = await conn.execute(
          `SELECT idEquipoControl, numeroEquipo, estado, resultado 
           FROM ticket_equipo te
           WHERE ${where.join(" AND ")}`,
          params
        );
        return rows || [];
      });

      return { ok: true, data: result };
    } catch (err: any) {
      devError("equipos:checkActivoEnTaller error:", err);
      return { ok: false, message: err?.message ?? "Error verificando equipos activos." };
    }
  });

  // ==========================
  // CHECK EQUIPO PENDIENTE - Verifica si hay equipos con resultado PENDIENTE
  // ==========================
  ipcMain.handle("equipos:checkPendiente", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);
      const result = await withConn(async (conn) => {
        const where: string[] = [`te.idTicket = ?`, `te.activo = 1`, `te.resultado = 'PENDIENTE'`];
        const params: any[] = [idTicket];
        pushEquipoScope(where, params, session, "te");

        const [rows]: any = await conn.execute(
          `SELECT COUNT(*) AS total 
           FROM ticket_equipo te
           WHERE ${where.join(" AND ")}`,
          params
        );
        return Number(rows?.[0]?.total || 0);
      });

      return { ok: true, tienePendiente: result > 0 };
    } catch (err: any) {
      devError("equipos:checkPendiente error:", err);
      return { ok: false, message: err?.message ?? "Error verificando equipos." };
    }
  });

  // ==========================
  // CERRAR EQUIPOS RELACIONADOS - Cierra equipos al cerrar ticket
  // ==========================
  ipcMain.handle("equipos:cerrarRelacionados", async (event, session: any, idTicket: number, fechaCierre: string) => {
    try {
      session = requireTrustedSession(event);
      const closeEquipoWhere: string[] = [
        `te.idTicket = ?`,
        `te.activo = 1`,
        `te.fechaSalida IS NULL`,
        `te.estado = 'EN_TALLER'`
      ];
      const closeEquipoParams: any[] = [idTicket];
      pushEquipoScope(closeEquipoWhere, closeEquipoParams, session, "te");
      await withConn(async (conn) => {
        // Cierre automático en un solo UPDATE
        await conn.execute(
          `UPDATE ticket_equipo te
           SET te.estado = 'ENTREGADO', te.fechaSalida = ?
           WHERE ${closeEquipoWhere.join(" AND ")}`,
          [fechaCierre, ...closeEquipoParams]
        );
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:cerrarRelacionados error:", err);
      return { ok: false, message: err?.message ?? "Error al cerrar equipos relacionados." };
    }
  });

  // ==========================
  // ENTREGAR - Cerrar equipo (marcar como entregado con resultado)
  // ==========================
  ipcMain.handle("equipos:entregar", async (event, session: any, idEquipoControl: number, resultado: string) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_EDIT");

      if (!idEquipoControl) throw new Error("ID de equipo requerido.");
      
      const resultadoVal = String(resultado || "").trim().toUpperCase();
      if (!["CON_SOLUCION", "SIN_SOLUCION"].includes(resultadoVal)) {
        throw new Error("Debe especificar resultado: CON_SOLUCION o SIN_SOLUCION.");
      }

      const now = new Date();
      const fechaSalida = now.toISOString().replace("T", " ").slice(0, 19);

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const where: string[] = [`te.idEquipoControl = ?`];
          const params: any[] = [idEquipoControl];
          pushEquipoScope(where, params, session, "te");

          const [current]: any = await conn.execute(
            `SELECT te.estado
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}
             FOR UPDATE`,
            params
          );
          if (!current?.length) throw new Error("Equipo no existe.");
          if (current[0].estado === "ENTREGADO") {
            throw new Error("Equipo ya entregado.");
          }

          await conn.execute(
            `UPDATE ticket_equipo te
             SET te.estado = 'ENTREGADO', te.resultado = ?, te.fechaSalida = ?
             WHERE ${where.join(" AND ")}`,
            [resultadoVal, fechaSalida, ...params]
          );
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:entregar error:", err);
      return { ok: false, message: err?.message ?? "Error al entregar equipo." };
    }
  });

  // ==========================
  // CANCELAR - Cancelar equipo
  // ==========================
  ipcMain.handle("equipos:cancelar", async (event, session: any, idEquipoControl: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_DELETE");

      if (!idEquipoControl) throw new Error("ID de equipo requerido.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const where: string[] = [`te.idEquipoControl = ?`];
          const params: any[] = [idEquipoControl];
          pushEquipoScope(where, params, session, "te");

          const [current]: any = await conn.execute(
            `SELECT te.estado
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}
             FOR UPDATE`,
            params
          );
          if (!current?.length) throw new Error("Equipo no existe.");
          if (current[0].estado === "ENTREGADO") {
            throw new Error("No se puede cancelar un equipo entregado.");
          }

          await conn.execute(
            `UPDATE ticket_equipo te
             SET te.estado = 'CANCELADO', te.activo = 0
             WHERE ${where.join(" AND ")}`,
            params
          );
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:cancelar error:", err);
      return { ok: false, message: err?.message ?? "Error al cancelar equipo." };
    }
  });

  // ==========================
  // DELETE - Eliminación física
  // ==========================
  ipcMain.handle("equipos:delete", async (event, session: any, idEquipoControl: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_DELETE");

      if (!idEquipoControl) throw new Error("ID de equipo requerido.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const where: string[] = [`te.idEquipoControl = ?`];
          const params: any[] = [idEquipoControl];
          pushEquipoScope(where, params, session, "te");

          const [current]: any = await conn.execute(
            `SELECT te.idEquipoControl
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}
             FOR UPDATE`,
            params
          );
          if (!current?.length) throw new Error("Equipo no existe.");

          const [res]: any = await conn.execute(
            `DELETE te
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}`,
            params
          );

          if (!Number(res?.affectedRows || 0)) {
            throw new Error("Equipo no existe.");
          }

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:delete error:", err);
      return { ok: false, message: err?.message ?? "Error borrando equipo." };
    }
  });

  // ==========================
  // UPDATE - Actualizar equipo (solo campos editables)
  // ==========================
  ipcMain.handle("equipos:update", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "EQUIPOS_EDIT");

      const idEquipoControl = Number(data?.idEquipoControl);
      const idTipoEquipo = Number(data?.idTipoEquipo);

      if (!idEquipoControl) throw new Error("ID de equipo requerido.");
      if (!idTipoEquipo) throw new Error("Tipo de equipo requerido.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const where: string[] = [`te.idEquipoControl = ?`];
          const params: any[] = [idEquipoControl];
          pushEquipoScope(where, params, session, "te");

          const [current]: any = await conn.execute(
            `SELECT te.idTicket, te.idUnidad, te.idTecnicoAsignado, te.numeroEquipo, te.fechaRecibido, te.estado
             FROM ticket_equipo te
             WHERE ${where.join(" AND ")}
             FOR UPDATE`,
            params
          );

          if (!current?.length) throw new Error("Equipo no existe.");
          
          const equipo = current[0];
          
          if (equipo.estado === "ENTREGADO" || equipo.estado === "CANCELADO") {
            throw new Error("No se puede editar un equipo entregado o cancelado.");
          }

          if (equipo.idTicket) {
            await conn.execute(
              `UPDATE ticket_equipo te
               SET te.idTipoEquipo = ?
               WHERE ${where.join(" AND ")}`,
              [idTipoEquipo, ...params]
            );
          } else {
            const idUnidad = Number(data?.idUnidad);
            const idTecnicoAsignado = Number(data?.idTecnicoAsignado);
            
            await conn.execute(
              `UPDATE ticket_equipo te
               SET te.idTipoEquipo = ?, te.idUnidad = ?, te.idTecnicoAsignado = ?
               WHERE ${where.join(" AND ")}`,
              [idTipoEquipo, idUnidad || equipo.idUnidad, idTecnicoAsignado || equipo.idTecnicoAsignado, ...params]
            );
          }

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("equipos:update error:", err);
      return { ok: false, message: err?.message ?? "Error actualizando equipo." };
    }
  });
}

