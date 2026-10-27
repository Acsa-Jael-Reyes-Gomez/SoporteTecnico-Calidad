// src/main/ipc_tickets.ts
import { app, type IpcMain } from "electron";
import { ensureAssignmentNotificationSchema, withConn } from "./db/db";
import { hasPerm, requirePerm, requireTrustedSession } from "./session_store";
import { assertActiveReference, assertChronologicalDates, assertDateRange, uniquePositiveIds } from "./services/validation_service";
import { buildPaginationClause, normalizePagination } from "./services/pagination_service";
import { monthlyRangeMysql, normalizeCatalogKey, normalizeOpenClosedState } from "./services/domain_utils";

function devError(...args: any[]) {
  if (!app.isPackaged) console.error(...args);
}


type TicketCatalogRefs = {
  pendienteAsignarId: number;
  clasificacionesById: Map<number, string>;
  extraordinarioId: number | null;
  estadoEnvioIds: {
    extraviado: number | null;
    reparado: number | null;
    entregado: number | null;
    enRevision: number | null;
  };
};

function requireCatalogId(id: number | null, label: string) {
  if (!id) throw new Error(`No se encontró ${label} en la base de datos.`);
  return id;
}

async function getTicketTechnicianIds(conn: any, idTicket: number): Promise<number[]> {
  const [rows]: any = await conn.execute(
    `SELECT idTecnico FROM ticket_tecnico WHERE idTicket=?`,
    [idTicket]
  );
  return (rows || [])
    .map((row: any) => Number(row?.idTecnico))
    .filter((id: number) => Number.isFinite(id) && id > 0);
}

async function loadTicketCatalogRefs(conn: any): Promise<TicketCatalogRefs> {
  // Mantener consultas secuenciales: ODBC 3.51 corrompe la conexión si se reutiliza en paralelo.
  const [pendienteRows]: any = await conn.execute(
    `SELECT idUsuario
     FROM usuario
     WHERE (
       UPPER(TRIM(nombre)) = 'PENDIENTE ASIGNAR'
       OR UPPER(TRIM(usuario)) = 'PENDIENTE_ASIGNAR'
       OR UPPER(TRIM(usuario)) = 'PENDIENTE ASIGNAR'
     )
     ORDER BY activo DESC, idUsuario ASC
     LIMIT 1`
  );
  const [clasificacionRows]: any = await conn.execute(
    `SELECT idClasificacion, nombre FROM des_clasificacion`
  );
  const [estadoEnvioRows]: any = await conn.execute(
    `SELECT idEstadoEnvio, clave, nombre FROM des_estado_envio`
  );

  const clasificacionesById = new Map<number, string>();
  let extraordinarioId: number | null = null;
  for (const row of clasificacionRows || []) {
    const idClasificacion = Number(row?.idClasificacion || 0);
    if (!idClasificacion) continue;
    const normalizedName = normalizeCatalogKey(row?.nombre || "");
    clasificacionesById.set(idClasificacion, normalizedName);
    if (normalizedName === "EXTRAORDINARIO") {
      extraordinarioId = idClasificacion;
    }
  }

  const estadoEnvioByKey = new Map<string, number>();
  for (const row of estadoEnvioRows || []) {
    const idEstadoEnvio = Number(row?.idEstadoEnvio || 0);
    if (!idEstadoEnvio) continue;
    const normalizedKey = normalizeCatalogKey(row?.clave || row?.nombre || "");
    estadoEnvioByKey.set(normalizedKey, idEstadoEnvio);
  }

  return {
    pendienteAsignarId: Number(pendienteRows?.[0]?.idUsuario || 0) || 0,
    clasificacionesById,
    extraordinarioId,
    estadoEnvioIds: {
      extraviado: estadoEnvioByKey.get("EXTRAVIADO") || null,
      reparado: estadoEnvioByKey.get("REPARADO") || null,
      entregado: estadoEnvioByKey.get("ENTREGADO") || null,
      enRevision: estadoEnvioByKey.get("EN_REVISION") || null
    }
  };
}

async function getTicketCalificacionBlockReason(conn: any, idTicket: number) {
  const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
  const [st]: any = await conn.execute(
    `SELECT idTicket, fechaCierre, idEstadoCalificacion
     FROM ticket
     WHERE idTicket=?
     FOR UPDATE`,
    [idTicket]
  );
  if (!st?.length) throw new Error("Ticket no existe.");
  if (Number(st[0].idEstadoCalificacion) !== 0) throw new Error("Ticket ya calificado.");
  if (!st[0].fechaCierre) {
    return "No se puede calificar el ticket porque sigue abierto. Debe cerrarlo antes de calificarlo.";
  }

  const [techRows]: any = await conn.execute(
    `SELECT idTecnico FROM ticket_tecnico WHERE idTicket=?`,
    [idTicket]
  );
  const techIds = (techRows || [])
    .map((r: any) => Number(r?.idTecnico))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  if (!techIds.length || techIds.includes(ticketCatalogRefs.pendienteAsignarId)) {
    return "No se puede calificar el ticket porque tiene 'Pendiente Asignar'. Debe asignar un técnico real antes de calificarlo.";
  }

  return null;
}

async function syncTicketEquipos(
  conn: any,
  idTicket: number,
  changes: { idUnidad?: number | null; idTecnicoAsignado?: number | null }
) {
  const sets: string[] = [];
  const params: any[] = [];

  if (changes.idUnidad != null) {
    sets.push("idUnidad=?");
    params.push(changes.idUnidad);
  }

  if (changes.idTecnicoAsignado != null) {
    sets.push("idTecnicoAsignado=?");
    params.push(changes.idTecnicoAsignado);
  }

  if (!sets.length) return;

  await conn.execute(
    `UPDATE ticket_equipo
     SET ${sets.join(", ")}
     WHERE idTicket=? AND activo=1`,
    [...params, idTicket]
  );
}

export function registerTicketsHandlers(ipcMain: IpcMain) {
// ==========================
// LIST - Completo con clasificacion + calificacion + filtros servicio/clasif/calif
// ==========================
ipcMain.handle("tickets:list", async (event, _sessionArg: any, filtros: any) => {
  try {
    const session = requireTrustedSession(event);
    if (!session?.idUsuario) throw new Error("Sesión inválida.");

    const { page, pageSize, offset } = normalizePagination(filtros);

    const q = filtros?.q ? String(filtros.q).trim() : null;
    const estado = normalizeOpenClosedState(filtros?.estado);
    const idServicio = filtros?.idServicio ? Number(filtros.idServicio) : null;
    const idClasificacion = filtros?.idClasificacion ? Number(filtros.idClasificacion) : null;
    const idEstadoCalificacion =
      filtros?.idEstadoCalificacion === 0 ||
      filtros?.idEstadoCalificacion === "0" ||
      filtros?.idEstadoCalificacion
        ? Number(filtros.idEstadoCalificacion)
        : null;
    const casoExtraordinario = filtros?.casoExtraordinario === "1" ? 1 : null;

    const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
    const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

    let desde = filtros?.desde ? String(filtros.desde) : null;
    let hasta = filtros?.hasta ? String(filtros.hasta) : null;
    if (!desde && !hasta) {
      const r = monthlyRangeMysql(new Date());
      desde = r.start;
      hasta = r.end;
    }
    assertDateRange(desde, hasta);

    const isAdmin = hasPerm(session, "TICKETS_VIEW_ALL");
    const isSupervisor =
      !isAdmin &&
      (hasPerm(session, "TICKETS_CREATE") || hasPerm(session, "TICKETS_EDIT") || hasPerm(session, "TICKETS_CLOSE"));
    const isTecnico = !isAdmin && !isSupervisor;

    const result = await withConn(async (conn) => {
      const where: string[] = [];
      const params: any[] = [];

      if (isTecnico) {
        where.push(`EXISTS (SELECT 1 FROM ticket_tecnico tt WHERE tt.idTicket=t.idTicket AND tt.idTecnico=?)`);
        params.push(session.idUsuario);
      } else if (isSupervisor) {
        where.push(`t.creadoPor=?`);
        params.push(session.idUsuario);
      }

      if (q) {
        if (/^\d+$/.test(q)) {
          where.push(`t.idTicket=?`);
          params.push(Number(q));
        } else {
          where.push(`(t.nombreSolicitante LIKE ? OR t.solucion LIKE ?)`);
          params.push(`%${q}%`, `%${q}%`);
        }
      }

      if (estado === "ABIERTO") {
        where.push(`t.fechaCierre IS NULL`);
      } else if (estado === "CERRADO") {
        where.push(`t.fechaCierre IS NOT NULL`);
      }

      if (idUnidad) {
        where.push(`t.idUnidad=?`);
        params.push(idUnidad);
      }

      if (idServicio) {
        where.push(`t.idServicio=?`);
        params.push(idServicio);
      }

      if (idClasificacion) {
        where.push(`t.idClasificacion=?`);
        params.push(idClasificacion);
      }

      if (idEstadoCalificacion !== null) {
        where.push(`t.idEstadoCalificacion=?`);
        params.push(idEstadoCalificacion);
      }

      if (casoExtraordinario !== null) {
        where.push(`t.casoExtraordinario=?`);
        params.push(casoExtraordinario);
      }

      if (desde) {
        where.push(`t.fechaApertura>=?`);
        params.push(desde);
      }
      if (hasta) {
        where.push(`t.fechaApertura<=?`);
        params.push(hasta);
      }

      if (idTecnico) {
        where.push(`EXISTS (SELECT 1 FROM ticket_tecnico tt2 WHERE tt2.idTicket=t.idTicket AND tt2.idTecnico=?)`);
        params.push(idTecnico);
      }

      const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [rows]: any = await conn.execute(
        `SELECT
            t.*,
            un.nombre AS unidad,
            pu.nombre AS puestoSolicitante,
            se.nombre AS servicio,
            dc.nombre AS clasificacion,
            ec.nombre AS estadoCalificacion
         FROM ticket t
         JOIN unidad un ON un.idUnidad=t.idUnidad
         LEFT JOIN puesto pu ON pu.idPuesto=t.idPuesto
         JOIN servicio se ON se.idServicio=t.idServicio
         LEFT JOIN des_clasificacion dc ON dc.idClasificacion=t.idClasificacion
         LEFT JOIN des_estado_calificacion ec ON ec.idEstadoCalificacion=t.idEstadoCalificacion
         ${whereSQL}
         ORDER BY t.idTicket ${String(filtros?.orden || "").toUpperCase() === "ASC" ? "ASC" : "DESC"}
         ${buildPaginationClause(pageSize, offset)}`,
        params
      );

      const [countRows]: any = await conn.execute(
        `SELECT COUNT(*) AS total
         FROM ticket t
         JOIN unidad un ON un.idUnidad=t.idUnidad
         LEFT JOIN puesto pu ON pu.idPuesto=t.idPuesto
         JOIN servicio se ON se.idServicio=t.idServicio
         LEFT JOIN des_clasificacion dc ON dc.idClasificacion=t.idClasificacion
         LEFT JOIN des_estado_calificacion ec ON ec.idEstadoCalificacion=t.idEstadoCalificacion
         ${whereSQL}`,
        params
      );
      const total = Number(countRows?.[0]?.total || 0);

      if (!rows?.length) return { total, rows: [] };

      const ids = rows.map((r: any) => r.idTicket);
      const [techRows]: any = await conn.execute(
        `SELECT tt.idTicket, u.idUsuario, u.nombre
         FROM ticket_tecnico tt
         JOIN usuario u ON u.idUsuario=tt.idTecnico
         WHERE tt.idTicket IN (${ids.map(() => "?").join(",")})`,
        ids
      );

      const map = new Map<number, any[]>();
      const totalTecnicosMap = new Map<number, number>();
      for (const tr of techRows) {
        totalTecnicosMap.set(tr.idTicket, (totalTecnicosMap.get(tr.idTicket) || 0) + 1);
        if (idTecnico && Number(tr.idUsuario) !== Number(idTecnico)) continue;
        if (!map.has(tr.idTicket)) map.set(tr.idTicket, []);
        map.get(tr.idTicket)!.push({ idUsuario: tr.idUsuario, nombre: tr.nombre });
      }

      return {
        total,
        rows: rows.map((r: any) => ({ 
          ...r, 
          tecnicos: map.get(r.idTicket) || [],
          totalTecnicos: totalTecnicosMap.get(r.idTicket) || 0,
          clasificacion: r.clasificacion || "SIN CLASIF",
          estadoCalificacion: r.estadoCalificacion || "PENDIENTE"
        }))
      };
    });

    return { ok: true, page, pageSize, total: result.total, data: result.rows };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Error listando tickets." };
  }
});

  // ==========================
  // CREATE - Completo con idClasificacion auto + ticket_equipo transaccional
  // ==========================
  ipcMain.handle("tickets:create", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "TICKETS_CREATE");

      const nombreSolicitante = String(data?.nombreSolicitante || "").trim();
      const idPuesto = Number(data?.idPuesto || 0) || null;
      const idUnidad = Number(data?.idUnidad || 0);
      const idServicio = Number(data?.idServicio || 0);
      const enLugar = data?.enLugar ? 1 : 0;
      const casoExtraordinario = data?.casoExtraordinario ? 1 : 0;
      const fechaApertura = String(data?.fechaApertura || "").trim();
      const fechaCierre = data?.fechaCierre ? String(data.fechaCierre).trim() : null;
      const solucion = data?.solucion ? String(data.solucion).trim() : null;
      const tecnicos: number[] = Array.isArray(data?.tecnicos) ? data.tecnicos.map((x: any) => Number(x)) : [];
      const ingresarEquipo = data?.ingresarEquipo ? 1 : 0;
      const idTipoEquipo = ingresarEquipo ? Number(data?.idTipoEquipo || 0) : null;

      // Validaciones obligatorias
      if (!nombreSolicitante) throw new Error("Nombre solicitante requerido.");
      if (!idPuesto) throw new Error("Puesto requerido.");
      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!idServicio) throw new Error("Servicio requerido.");
      if (!fechaApertura) throw new Error("Fecha apertura requerida.");
      if (!tecnicos.length) throw new Error("Debe asignar al menos 1 técnico.");
      if (ingresarEquipo && (!idTipoEquipo || idTipoEquipo <= 0)) {
        throw new Error("Tipo de equipo requerido para ingreso al taller.");
      }
      if (fechaCierre && !solucion) {
        throw new Error("Solución obligatoria si el ticket se creará ya cerrado.");
      }
      assertChronologicalDates(fechaApertura, fechaCierre);
      if (fechaCierre && ingresarEquipo) {
        throw new Error("No se puede crear y cerrar un ticket al mismo tiempo si también se ingresará equipo al taller.");
      }

      const techRealUnique = uniquePositiveIds(tecnicos);
      const tecnicosToPersist = fechaCierre ? techRealUnique : tecnicos;

      if (fechaCierre && !tecnicosToPersist.length) {
        throw new Error("Debe seleccionar un técnico real antes de crear el ticket ya cerrado.");
      }

      const idTicket = await withConn(async (conn) => {
        await ensureAssignmentNotificationSchema(conn);
        await conn.beginTransaction();
        try {
          await assertActiveReference(conn, "puesto", "idPuesto", idPuesto, "Puesto");
          await assertActiveReference(conn, "unidad", "idUnidad", idUnidad, "Unidad");
          for (const idTecnico of uniquePositiveIds(tecnicosToPersist)) {
            await assertActiveReference(conn, "usuario", "idUsuario", idTecnico, "Técnico");
          }
          if (ingresarEquipo) {
            await assertActiveReference(conn, "tipo_equipo", "idTipoEquipo", idTipoEquipo, "Tipo de equipo");
          }
          // 1️⃣ OBTENER idClasificacion correcta
          const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
          const [servicioRow]: any = await conn.execute(
            `SELECT idClasificacion FROM servicio WHERE idServicio=? AND activo=1`,
            [idServicio]
          );
          if (!servicioRow?.length) throw new Error("Servicio inválido.");
          
          const idClasificacionBase = Number(servicioRow[0].idClasificacion);
          const idClasificacionFinal = casoExtraordinario
            ? requireCatalogId(ticketCatalogRefs.extraordinarioId, "la clasificación EXTRAORDINARIO")
            : idClasificacionBase;

          // 2️⃣ CREAR TICKET con clasificacion correcta
          const [ins]: any = await conn.execute(
            `INSERT INTO ticket (
              nombreSolicitante, idPuesto, idUnidad, idServicio, enLugar, 
              fechaApertura, fechaCierre, solucion, creadoPor, idClasificacion,
              idEstadoCalificacion, casoExtraordinario
            ) VALUES (?,?,?,?,?,?,?,?,?,?,0,?)`,
            [
              nombreSolicitante, idPuesto, idUnidad, idServicio, enLugar,
              fechaApertura, fechaCierre, solucion, session.idUsuario, idClasificacionFinal, casoExtraordinario
            ]
          );

          const newId = Number(ins.insertId);

          // 3️⃣ ASIGNAR TÉCNICOS (puente)
          for (const idTec of tecnicosToPersist) {
            await conn.execute(
              `INSERT INTO ticket_tecnico (idTicket, idTecnico) VALUES (?, ?)`,
              [newId, idTec]
            );
            /// Notificaciones Tickes
            await conn.execute(
              `INSERT INTO notificacion_asignacion
                 (idUsuario, tipo, idReferencia, idUnidad, creadoPor, createdAt)
               VALUES (?, 'TICKET_ASIGNADO', ?, ?, ?, NOW())`,
              [idTec, newId, idUnidad, session.idUsuario]
            );
          }

          // 4️⃣ SI ingresarEquipo: crear ticket_equipo transaccional
          if (ingresarEquipo) {
            const idTecnicoPrincipal = tecnicos[0]; // Primer técnico asignado
            
            const [equipoIns]: any = await conn.execute(
              `INSERT INTO ticket_equipo (
                idTicket, idUnidad, idTipoEquipo, idTecnicoAsignado, registradoPor,
                numeroEquipo, fechaRecibido, estado, resultado, activo
              ) VALUES (?, ?, ?, ?, ?, '', NOW(), 'EN_TALLER', 'PENDIENTE', 1)`,
              [newId, idUnidad, idTipoEquipo, (tecnicosToPersist[0] ?? idTecnicoPrincipal), session.idUsuario]
            );

            const idEquipoControl = Number(equipoIns.insertId);
            await conn.execute(
              `UPDATE ticket_equipo
               SET numeroEquipo = CONCAT('EQ-', LPAD(?, 6, '0'))
               WHERE idEquipoControl = ?`,
              [idEquipoControl, idEquipoControl]
            );
          }

          await conn.commit();
          return newId;
        } catch (e: any) {
          await conn.rollback();
          throw new Error(e.message || "Error interno en transacción.");
        }
      });

      return { ok: true, idTicket };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error creando ticket." };
    }
  });

  // ==========================
  // UPDATE - Recalcula idClasificacion dinámicamente
  // ==========================
  ipcMain.handle("tickets:update", async (event, session: any, data: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "TICKETS_EDIT");

      const idTicket = Number(data?.idTicket);
      if (!idTicket) throw new Error("idTicket requerido.");

      const nombreSolicitante = String(data?.nombreSolicitante || "").trim();
      const idPuesto = Number(data?.idPuesto || 0) || null;
      const idUnidad = Number(data?.idUnidad || 0);
      const idServicio = Number(data?.idServicio || 0);
      const enLugar = data?.enLugar ? 1 : 0;
      const casoExtraordinario = data?.casoExtraordinario ? 1 : 0;
      const fechaApertura = String(data?.fechaApertura || "").trim();
      const solucion = data?.solucion ? String(data.solucion).trim() : null;
      const tecnicos: number[] = Array.isArray(data?.tecnicos) ? data.tecnicos.map((x: any) => Number(x)) : [];

      if (!nombreSolicitante) throw new Error("Nombre solicitante requerido.");
      if (!idPuesto) throw new Error("Puesto requerido.");
      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!idServicio) throw new Error("Servicio requerido.");
      if (!fechaApertura) throw new Error("Fecha apertura requerida.");
      if (!tecnicos.length) throw new Error("Debe asignar al menos 1 técnico.");

      const idTecnicoPrincipal = tecnicos.length > 0 ? tecnicos[0] : null;

      await withConn(async (conn) => {
        await ensureAssignmentNotificationSchema(conn);
        await conn.beginTransaction();
        try {
          // Verificar estado antes de modificar
          const [st]: any = await conn.execute(
            `SELECT fechaApertura, fechaCierre, idEstadoCalificacion
             FROM ticket
             WHERE idTicket=?
             FOR UPDATE`, 
            [idTicket]
          );
          if (!st?.length) throw new Error("Ticket no existe.");
          if (st[0].fechaCierre) throw new Error("Ticket cerrado. Use Reabrir.");
          if (st[0].idEstadoCalificacion === 1) {
            throw new Error("Ticket calificado: no se puede modificar.");
          }

          // OBTENER nueva idClasificacion
          const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
          const [servicioRow]: any = await conn.execute(
            `SELECT idClasificacion FROM servicio WHERE idServicio=? AND activo=1`,
            [idServicio]
          );
          if (!servicioRow?.length) throw new Error("Servicio inválido.");
          
          const idClasificacionBase = Number(servicioRow[0].idClasificacion);
          const idClasificacionFinal = casoExtraordinario
            ? requireCatalogId(ticketCatalogRefs.extraordinarioId, "la clasificación EXTRAORDINARIO")
            : idClasificacionBase;

          // UPDATE ticket con nueva clasificacion
          await conn.execute(
            `UPDATE ticket
             SET nombreSolicitante=?, idPuesto=?, idUnidad=?, idServicio=?, 
                 enLugar=?, fechaApertura=?, solucion=?, casoExtraordinario=?, idClasificacion=?
             WHERE idTicket=?`,
            [
              nombreSolicitante, idPuesto, idUnidad, idServicio, 
              enLugar, fechaApertura, solucion, casoExtraordinario, idClasificacionFinal, idTicket
            ]
          );

          // Re-asignar técnicos
          const previousTechnicians = await getTicketTechnicianIds(conn, idTicket);
          const previousTechnicianSet = new Set(previousTechnicians);
          await conn.execute(`DELETE FROM ticket_tecnico WHERE idTicket=?`, [idTicket]);
          for (const idTec of tecnicos) {
            await conn.execute(`INSERT INTO ticket_tecnico (idTicket,idTecnico) VALUES (?,?)`, [idTicket, idTec]);
            if (!previousTechnicianSet.has(idTec)) {
              await conn.execute(
                `INSERT INTO notificacion_asignacion
                   (idUsuario, tipo, idReferencia, idUnidad, creadoPor, createdAt)
                 VALUES (?, 'TICKET_ASIGNADO', ?, ?, ?, NOW())`,
                [idTec, idTicket, idUnidad, session.idUsuario]
              );
            }
          }

          // SINCRONIZAR equipos existentes del ticket, incluso si ya fueron entregados.
          if (idTecnicoPrincipal) {
            await syncTicketEquipos(conn, idTicket, {
              idUnidad,
              idTecnicoAsignado: idTecnicoPrincipal
            });
          }

          await conn.commit();
        } catch (e: any) {
          await conn.rollback();
          throw new Error(e.message || "Error interno en transacción.");
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error actualizando ticket." };
    }
  });

  // ==========================
  // CLOSE (fecha manual) - NO permite cerrar si ya está calificado
  // ==========================
  ipcMain.handle("tickets:close", async (event, session: any, idTicket: number, fechaCierre: string, solucion: string, tecnicos?: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "TICKETS_CLOSE");
      if (!idTicket) throw new Error("idTicket requerido.");
      if (!solucion?.trim()) throw new Error("Solución obligatoria para cerrar.");
      if (!fechaCierre || !String(fechaCierre).trim()) throw new Error("Fecha de cierre requerida.");

      // Regla negocio: no permitir cerrar con técnico placeholder "Pendiente Asignar" (id=14).
      const tecnicosIn: number[] | null = Array.isArray(tecnicos)
        ? tecnicos
            .map((x: any) => Number(x))
            .filter((n: number) => Number.isFinite(n) && n > 0)
        : null;

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
          const [st]: any = await conn.execute(
            `SELECT fechaApertura, fechaCierre, idEstadoCalificacion
             FROM ticket
             WHERE idTicket=?
             FOR UPDATE`,
            [idTicket]
          );
          if (!st?.length) throw new Error("Ticket no existe.");
          if (st[0].fechaCierre) throw new Error("Ya está cerrado.");
          if (Number(st[0].idEstadoCalificacion) === 1) {
            throw new Error("Ticket calificado: no se puede cerrar.");
          }
          assertChronologicalDates(st[0].fechaApertura, fechaCierre);

          // ✅ VALIDACIÓN: Verificar si hay equipos con resultado PENDIENTE
          const [equiposPendientes]: any = await conn.execute(
            `SELECT COUNT(*) AS total 
             FROM ticket_equipo 
             WHERE idTicket = ? AND activo = 1 AND resultado = 'PENDIENTE'`,
            [idTicket]
          );
          if (equiposPendientes?.[0]?.total > 0) {
            throw new Error(
              "No se puede cerrar el ticket porque el equipo relacionado aún no tiene definido si salió con solución o sin solución."
            );
          }

          // ==========================
          // REGLA: no permitir cerrar con técnico placeholder "Pendiente Asignar" (id=14).
          let techIds: number[] = [];
          if (tecnicosIn && tecnicosIn.length) {
            techIds = tecnicosIn;
          } else {
            const [techRows]: any = await conn.execute(
              `SELECT idTecnico FROM ticket_tecnico WHERE idTicket=?`,
              [idTicket]
            );
            techIds = (techRows || [])
              .map((r: any) => Number(r?.idTecnico))
              .filter((n: number) => Number.isFinite(n) && n > 0);
          }

          const techRealUnique = Array.from(
            new Set(techIds.filter((id) => id !== ticketCatalogRefs.pendienteAsignarId))
          );

          if (!techRealUnique.length) {
            throw new Error("Debe seleccionar un técnico antes de cerrar el ticket.");
          }

          if (tecnicosIn && tecnicosIn.length) {
            await conn.execute(`DELETE FROM ticket_tecnico WHERE idTicket=?`, [idTicket]);
            for (const idTec of techRealUnique) {
              await conn.execute(
                `INSERT INTO ticket_tecnico (idTicket,idTecnico) VALUES (?,?)`,
                [idTicket, idTec]
              );
            }
          }

          const idTecnicoPrincipal = techRealUnique[0] || null;
          if (idTecnicoPrincipal) {
            // Mantener consistencia: si hay equipo en taller, el técnico asignado debe reflejar el principal del ticket.
            await syncTicketEquipos(conn, idTicket, {
              idTecnicoAsignado: idTecnicoPrincipal
            });
          }

          // Cerrar ticket
          await conn.execute(`UPDATE ticket SET fechaCierre=?, solucion=? WHERE idTicket=?`, [
            String(fechaCierre).trim(),
            String(solucion).trim(),
            idTicket
          ]);

          // ✅ CIERRE AUTOMÁTICO: Cerrar equipos relacionados en un solo UPDATE
          await conn.execute(
            `UPDATE ticket_equipo 
             SET estado = 'ENTREGADO', fechaSalida = ?
             WHERE idTicket = ? AND activo = 1 AND fechaSalida IS NULL AND estado = 'EN_TALLER'`,
            [String(fechaCierre).trim(), idTicket]
          );

          await conn.execute(
            `UPDATE envio_equipo
             SET idEstadoEnvio = ?,
                 fechaReparacion = IFNULL(fechaReparacion, ?),
                 actualizadoPor = ?,
                 updatedAt = NOW()
             WHERE idTicketAsignado = ?
               AND idEstadoEnvio NOT IN (?, ?)`,
            [
              requireCatalogId(ticketCatalogRefs.estadoEnvioIds.reparado, "el estado REPARADO"),
              String(fechaCierre).trim(),
              session.idUsuario,
              idTicket,
              requireCatalogId(ticketCatalogRefs.estadoEnvioIds.entregado, "el estado ENTREGADO"),
              requireCatalogId(ticketCatalogRefs.estadoEnvioIds.extraviado, "el estado EXTRAVIADO")
            ]
          );

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error cerrando ticket." };
    }
  });

  // ==========================
  // REOPEN - NO permite reopen si ya está calificado
  // ==========================
  ipcMain.handle("tickets:reopen", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "TICKETS_REOPEN");
      if (!idTicket) throw new Error("idTicket requerido.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
        const [st]: any = await conn.execute(
          `SELECT fechaCierre, idEstadoCalificacion
           FROM ticket
           WHERE idTicket=?
           FOR UPDATE`,
          [idTicket]
        );
        if (!st?.length) throw new Error("Ticket no existe.");
        if (!st[0].fechaCierre) throw new Error("Ya está abierto.");
        if (Number(st[0].idEstadoCalificacion) === 1) {
          throw new Error("Ticket calificado: no se puede reabrir.");
        }

        await conn.execute(`UPDATE ticket SET fechaCierre=NULL WHERE idTicket=?`, [idTicket]);
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?,
               actualizadoPor = ?,
               updatedAt = NOW()
           WHERE idTicketAsignado = ?
             AND idEstadoEnvio = ?`,
          [
            requireCatalogId(ticketCatalogRefs.estadoEnvioIds.enRevision, "el estado EN_REVISION"),
            session.idUsuario,
            idTicket,
            requireCatalogId(ticketCatalogRefs.estadoEnvioIds.reparado, "el estado REPARADO")
          ]
        );

        await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("tickets:reopen error:", err);
      return { ok: false, message: err?.message ?? "Error reabriendo ticket." };
    }
  });

  // ==========================
  // DELETE - NO permite eliminar si ya está calificado
  // ==========================
  ipcMain.handle("tickets:delete", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "TICKETS_DELETE");
      if (!idTicket) throw new Error("idTicket requerido.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          // ✅ Verificar si el ticket está calificado - NO se puede eliminar si ya tiene calificación
          const [st]: any = await conn.execute(
            `SELECT idEstadoCalificacion
             FROM ticket
             WHERE idTicket=?
             FOR UPDATE`,
            [idTicket]
          );
          if (!st?.length) throw new Error("Ticket no existe.");
          if (Number(st[0].idEstadoCalificacion) === 1) {
            throw new Error("Ticket calificado: no se puede eliminar.");
          }

          await conn.execute(`DELETE FROM ticket_tecnico WHERE idTicket=?`, [idTicket]);
          await conn.execute(`DELETE FROM ticket WHERE idTicket=?`, [idTicket]);
          await conn.commit();
        } catch (e: any) {
          await conn.rollback();
          // ✅ Capturar error de foreign key - no mostrar error técnico al usuario
          if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.message?.includes('foreign key constraint')) {
            throw new Error("Ticket con registros asociados (equipos). No puede eliminarse.");
          }
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      devError("tickets:delete error:", err);
      return { ok: false, message: err?.message ?? "Error borrando ticket." };
    }
  });

  // ==========================
  // SET COMPLEJIDAD / CLASIFICACION (Admin: CALIFICACION_TICKETS)
  // Permite ajustar idClasificacion antes de calificar.
  // ==========================
  ipcMain.handle("tickets:setClasificacion", async (event, session: any, idTicket: number, idClasificacion: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "CALIFICACION_TICKETS");

      const tid = Number(idTicket);
      const cid = Number(idClasificacion);
      if (!tid) throw new Error("idTicket requerido.");
      if (!cid) throw new Error("Clasificación inválida.");

      await withConn(async (conn) => {
        await conn.beginTransaction();
        try {
          const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
          if (!ticketCatalogRefs.clasificacionesById.has(cid)) {
            throw new Error("Clasificación inválida.");
          }
          const [st]: any = await conn.execute(
            `SELECT idEstadoCalificacion
             FROM ticket
             WHERE idTicket=?
             FOR UPDATE`,
            [tid]
          );
          if (!st?.length) throw new Error("Ticket no existe.");
          if (Number(st[0].idEstadoCalificacion) === 1) {
            throw new Error("Ticket ya calificado: no se puede cambiar complejidad.");
          }

          const casoExtraordinario =
            ticketCatalogRefs.clasificacionesById.get(cid) === "EXTRAORDINARIO" ? 1 : 0;

          await conn.execute(
            `UPDATE ticket SET idClasificacion=?, casoExtraordinario=? WHERE idTicket=?`,
            [cid, casoExtraordinario, tid]
          );

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error actualizando clasificación." };
    }
  });

  // ==========================
  // CALIFICAR TICKET (requiere CALIFICACION_TICKETS)
  // ==========================
  ipcMain.handle("tickets:calificar", async (event, session: any, idTicket: number) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "CALIFICACION_TICKETS");
      if (!idTicket) throw new Error("idTicket requerido.");

      const result = await withConn(async (conn) => {
        await conn.beginTransaction();

        try {
          const blockReason = await getTicketCalificacionBlockReason(conn, Number(idTicket));
          if (blockReason) throw new Error(blockReason);

          await conn.execute(
            `UPDATE ticket 
             SET idEstadoCalificacion=1, 
                 fechaCalificacion=NOW(),
                 idUsuarioCalificador=?
             WHERE idTicket=?`,
            [session.idUsuario, idTicket]
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
      return { ok: false, message: err?.message ?? "Error calificando ticket." };
    }
  });

  // ==========================
  // CALIFICAR TODOS (bulk) (requiere CALIFICACION_TICKETS)
  // ==========================
  ipcMain.handle("tickets:calificarAll", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "CALIFICACION_TICKETS");
      if (!session?.idUsuario) throw new Error("Sesión inválida.");

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

      // Si no mandan rango, aplicar 26-25 por defecto (consistencia con list)
      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;
      if (!desde && !hasta) {
        const r = monthlyRangeMysql(new Date());
        desde = r.start;
        hasta = r.end;
      }

      const isAdmin = hasPerm(session, "TICKETS_VIEW_ALL");
      const isSupervisor =
        !isAdmin &&
        (hasPerm(session, "TICKETS_CREATE") || hasPerm(session, "TICKETS_EDIT") || hasPerm(session, "TICKETS_CLOSE"));
      const isTecnico = !isAdmin && !isSupervisor;

      const affectedRows = await withConn(async (conn) => {
        const ticketCatalogRefs = await loadTicketCatalogRefs(conn);
        const where: string[] = [];
        const params: any[] = [session.idUsuario]; // SET idUsuarioCalificador=?

        // Solo pendientes
        where.push(`t.idEstadoCalificacion=0`);
        where.push(`t.fechaCierre IS NOT NULL`);
        where.push(`EXISTS (SELECT 1 FROM ticket_tecnico ttok WHERE ttok.idTicket=t.idTicket AND ttok.idTecnico<>?)`);
        params.push(ticketCatalogRefs.pendienteAsignarId);
        where.push(`NOT EXISTS (SELECT 1 FROM ticket_tecnico ttp WHERE ttp.idTicket=t.idTicket AND ttp.idTecnico=?)`);
        params.push(ticketCatalogRefs.pendienteAsignarId);

        // Seguridad: respetar el mismo alcance que el listado
        if (isTecnico) {
          where.push(`EXISTS (SELECT 1 FROM ticket_tecnico tt WHERE tt.idTicket=t.idTicket AND tt.idTecnico=?)`);
          params.push(session.idUsuario);
        } else if (isSupervisor) {
          where.push(`t.creadoPor=?`);
          params.push(session.idUsuario);
        }

        if (q) {
          if (/^\\d+$/.test(q)) {
            where.push(`t.idTicket=?`);
            params.push(Number(q));
          } else {
            where.push(`(t.nombreSolicitante LIKE ? OR t.solucion LIKE ?)`);
            params.push(`%${q}%`, `%${q}%`);
          }
        }

        if (idUnidad) {
          where.push(`t.idUnidad=?`);
          params.push(idUnidad);
        }

        if (desde) {
          where.push(`t.fechaApertura>=?`);
          params.push(desde);
        }
        if (hasta) {
          where.push(`t.fechaApertura<=?`);
          params.push(hasta);
        }

        if (idTecnico) {
          where.push(
            `EXISTS (SELECT 1 FROM ticket_tecnico tt2 WHERE tt2.idTicket=t.idTicket AND tt2.idTecnico=?)`
          );
          params.push(idTecnico);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `UPDATE ticket t
           SET t.idEstadoCalificacion=1,
               t.fechaCalificacion=NOW(),
               t.idUsuarioCalificador=?
           ${whereSQL}`,
          params
        );

        return Number(res?.affectedRows || 0);
      });

      if (affectedRows <= 0) {
        return {
          ok: false,
          message:
            "No hay tickets elegibles para calificar con los filtros actuales. Deben estar cerrados y con técnico asignado."
        };
      }

      return { ok: true, affectedRows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error calificando todos los tickets." };
    }
  });
}
