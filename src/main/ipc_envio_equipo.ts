import type { IpcMain } from "electron";
import { ensureAssignmentNotificationSchema, withConn } from "./db/db";
import { requirePerm, requireTrustedSession } from "./session_store";
import { normalizeCatalogKey } from "./services/domain_utils";
import { buildPaginationClause } from "./services/pagination_service";

type EnvioEstado = string;
type EnvioMedio = string;

type EnvioCatalogItem = {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
};

type EnvioCatalogSet = {
  motivosById: Map<number, EnvioCatalogItem>;
  motivosByKey: Map<string, EnvioCatalogItem>;
  mediosById: Map<number, EnvioCatalogItem>;
  mediosByKey: Map<string, EnvioCatalogItem>;
  estadosById: Map<number, EnvioCatalogItem>;
  estadosByKey: Map<string, EnvioCatalogItem>;
};

const PUESTO_CANDIDATES_BY_ROLE: Record<string, string[]> = {
  GERENCIAL: ["Gerente", "Gerente Regional", "Gerente Aperturas"],
  ANALISTA: ["Analista", "Analista Elite"],
  TECNICO: ["Personal IT"],
  SUPERVISOR: ["Supervisor de Ventas", "Supervisor de caja"],
  ADMIN: ["Analista", "Programador Externo", "Gerente"]
};

function toIntSafe(v: any, def = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.trunc(n);
}

async function loadEnvioCatalogItems(conn: any, tableName: string, idField: string) {
  const [rows]: any = await conn.execute(
    `SELECT ${idField} AS id, clave, nombre, activo
     FROM ${tableName}`
  );

  return (rows || [])
    .map((row: any) => ({
      id: Number(row?.id || 0),
      clave: normalizeCatalogKey(row?.clave || row?.nombre || ""),
      nombre: String(row?.nombre || "").trim(),
      activo: Number(row?.activo ?? 0) === 1
    }))
    .filter((item: EnvioCatalogItem) => item.id > 0 && item.clave);
}

async function loadEnvioCatalogSet(conn: any): Promise<EnvioCatalogSet> {
  // ODBC 3.51 no soporta consultas simultáneas sobre la misma conexión.
  const motivos = await loadEnvioCatalogItems(conn, "des_motivo_envio", "idMotivoEnvio");
  const medios = await loadEnvioCatalogItems(conn, "des_medio_envio", "idMedioEnvio");
  const estados = await loadEnvioCatalogItems(conn, "des_estado_envio", "idEstadoEnvio");

  return {
    motivosById: new Map(motivos.map((item: EnvioCatalogItem) => [item.id, item])),
    motivosByKey: new Map(motivos.map((item: EnvioCatalogItem) => [item.clave, item])),
    mediosById: new Map(medios.map((item: EnvioCatalogItem) => [item.id, item])),
    mediosByKey: new Map(medios.map((item: EnvioCatalogItem) => [item.clave, item])),
    estadosById: new Map(estados.map((item: EnvioCatalogItem) => [item.id, item])),
    estadosByKey: new Map(estados.map((item: EnvioCatalogItem) => [item.clave, item]))
  };
}

function normalizeMysqlDateTime(value: any, fallbackNow = false) {
  const raw = String(value || "").trim();
  if (!raw) return fallbackNow ? "__NOW__" : null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw.replace("T", " ") + ":00";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00:00`;
  throw new Error("Fecha/hora inválida.");
}

function resolveCatalogItemByValue(
  value: any,
  byId: Map<number, EnvioCatalogItem>,
  byKey: Map<string, EnvioCatalogItem>
) {
  const asNumber = toIntSafe(value, 0);
  if (asNumber && byId.has(asNumber)) return byId.get(asNumber) || null;
  const key = normalizeCatalogKey(value);
  return byKey.get(key) || null;
}

function requireCatalogItemId(id: number | null, label: string) {
  if (!id) throw new Error(`No se encontró ${label} en el catálogo.`);
  return id;
}

function resolveMotivoId(catalogSet: EnvioCatalogSet, value: any, requireActive = false): number | null {
  const item = resolveCatalogItemByValue(value, catalogSet.motivosById, catalogSet.motivosByKey);
  if (!item || (requireActive && !item.activo)) return null;
  return item.id;
}

function resolveMedioKey(catalogSet: EnvioCatalogSet, value: any, requireActive = false): EnvioMedio | null {
  const item = resolveCatalogItemByValue(value, catalogSet.mediosById, catalogSet.mediosByKey);
  if (!item || (requireActive && !item.activo)) return null;
  return item.clave;
}

function resolveEstadoKey(catalogSet: EnvioCatalogSet, value: any, requireActive = false): EnvioEstado | null {
  const item = resolveCatalogItemByValue(value, catalogSet.estadosById, catalogSet.estadosByKey);
  if (!item || (requireActive && !item.activo)) return null;
  return item.clave;
}

function getMedioId(catalogSet: EnvioCatalogSet, key: EnvioMedio, requireActive = false) {
  const item = catalogSet.mediosByKey.get(normalizeCatalogKey(key));
  if (!item || (requireActive && !item.activo)) return 0;
  return item.id;
}

function getEstadoId(catalogSet: EnvioCatalogSet, key: EnvioEstado, requireActive = false) {
  const item = catalogSet.estadosByKey.get(normalizeCatalogKey(key));
  if (!item || (requireActive && !item.activo)) return 0;
  return item.id;
}

function isGerencial(session: any) {
  return String(session?.rol || "").trim().toUpperCase() === "GERENCIAL";
}

function getAllowedNextStates(current: EnvioEstado): EnvioEstado[] {
  switch (current) {
    case "ENVIADO":
      return ["RECIBIDO", "EXTRAVIADO"];
    case "RECIBIDO":
      return ["EXTRAVIADO"];
    case "EN_REVISION":
      return ["EXTRAVIADO"];
    case "REPARADO":
      return ["ENTREGADO", "EXTRAVIADO"];
    default:
      return [];
  }
}

async function assertUnidadPermitida(conn: any, session: any, idUnidad: number) {
  if (!isGerencial(session)) return;
  const [rows]: any = await conn.execute(
    `SELECT 1
     FROM usuario_unidad uu
     WHERE uu.idUsuario = ?
       AND uu.idUnidad = ?
     LIMIT 1`,
    [session.idUsuario, idUnidad]
  );
  if (!rows?.length) throw new Error("Solo puedes trabajar con tus unidades asignadas.");
}

async function assertCatalogs(conn: any, idUnidad: number, idTipoEquipo: number) {
  const [unidadRows]: any = await conn.execute(
    `SELECT idUnidad
     FROM unidad
     WHERE idUnidad = ?
       AND activo = 1
     LIMIT 1`,
    [idUnidad]
  );
  if (!unidadRows?.length) throw new Error("Unidad inválida.");

  const [tipoRows]: any = await conn.execute(
    `SELECT idTipoEquipo
     FROM tipo_equipo
     WHERE idTipoEquipo = ?
       AND activo = 1
     LIMIT 1`,
    [idTipoEquipo]
  );
  if (!tipoRows?.length) throw new Error("Tipo de equipo inválido.");
}

async function assertPuestoActivo(conn: any, idPuesto: number) {
  const [rows]: any = await conn.execute(
    `SELECT idPuesto
     FROM puesto
     WHERE idPuesto = ?
       AND activo = 1
     LIMIT 1`,
    [idPuesto]
  );
  if (!rows?.length) throw new Error("Puesto inválido.");
}

async function assertTecnicoActivo(conn: any, idUsuario: number) {
  const [rows]: any = await conn.execute(
    `SELECT u.idUsuario
     FROM usuario u
     JOIN rol r ON r.idRol = u.idRol
     WHERE u.idUsuario = ?
       AND u.activo = 1
       AND r.nombre = 'TECNICO'
     LIMIT 1`,
    [idUsuario]
  );
  if (!rows?.length) throw new Error("Técnico inválido.");
}

async function resolveSolicitantePuestoId(conn: any, session: any, requestedId: number) {
  const directId = Number(requestedId || 0);
  if (directId > 0) {
    await assertPuestoActivo(conn, directId);
    return directId;
  }

  const roleKey = String(session?.rol || "").trim().toUpperCase();
  const candidateNames = PUESTO_CANDIDATES_BY_ROLE[roleKey] || [];
  if (!candidateNames.length) return null;

  const normalizedCandidates = candidateNames.map((name) => normalizeCatalogKey(name));
  const [rows]: any = await conn.execute(
    `SELECT idPuesto, nombre
     FROM puesto
     WHERE activo = 1`
  );

  const match = (rows || []).find((row: any) =>
    normalizedCandidates.includes(normalizeCatalogKey(row?.nombre))
  );

  return match ? Number(match.idPuesto || 0) : null;
}

async function buildNumeroEquipo(conn: any, idEnvioEquipo: number) {
  const numeroEquipo = `EE-${String(idEnvioEquipo).padStart(6, "0")}`;
  await conn.execute(
    `UPDATE envio_equipo
     SET numeroEquipo = ?,
         updatedAt = NOW()
     WHERE idEnvioEquipo = ?`,
    [numeroEquipo, idEnvioEquipo]
  );
  return numeroEquipo;
}

function buildTempNumeroEquipo() {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `TMP-EE-${now}-${rand}`;
}

export function registerEnvioEquipoHandlers(ipcMain: IpcMain) {
  ipcMain.handle("envio_equipo:notifications", async (event, _sessionArg: any, data: any) => {
    try {
      const session = requireTrustedSession(event);
      const roleKey = normalizeCatalogKey(session.rol || "");
      if (roleKey !== "TECNICO" && roleKey !== "SUPERVISOR") requirePerm(session, "ENVIO_EQUIPO_VIEW");

      const since = normalizeMysqlDateTime(data?.since, false);
      const result = await withConn(async (conn: any) => {
        const [clockRows]: any = await conn.execute("SELECT NOW() AS serverTime");
        const serverTime = clockRows?.[0]?.serverTime || null;
        if (!since) return { serverTime, rows: [] };
        if (roleKey === "TECNICO" || roleKey === "SUPERVISOR") {
          await ensureAssignmentNotificationSchema(conn);
          const allowedEventType = roleKey === "SUPERVISOR" ? "RUTA_VALIDADA" : null;
          const [assignmentRows]: any = await conn.execute(
            `SELECT
                na.idNotificacion,
                na.idReferencia,
                na.tipo AS eventType,
                na.createdAt AS eventAt,
                u.nombre AS unidadNombre,
                actor.nombre AS actorNombre
             FROM notificacion_asignacion na
             LEFT JOIN unidad u ON u.idUnidad = na.idUnidad
             LEFT JOIN usuario actor ON actor.idUsuario = na.creadoPor
             WHERE na.idUsuario = ?
               AND na.createdAt > ?
               ${allowedEventType ? "AND na.tipo = ?" : "AND na.tipo IN ('TICKET_ASIGNADO', 'RUTA_ASIGNADA')"}
             ORDER BY na.createdAt ASC, na.idNotificacion ASC
             LIMIT 50`,
            [session.idUsuario, since, ...(allowedEventType ? [allowedEventType] : [])]
          );
          return { serverTime, rows: assignmentRows || [] };
        }
        if (roleKey !== "GERENCIAL" && roleKey !== "ANALISTA") return { serverTime, rows: [] };

        const isManagerNotification = roleKey === "GERENCIAL";
        const eventColumn = isManagerNotification ? "ee.updatedAt" : "ee.createdAt";
        const actorColumn = isManagerNotification ? "ua.nombre" : "uc.nombre";
        const where: string[] = [`${eventColumn} > ?`];
        const params: any[] = [since];
        if (isManagerNotification) {
          where.push("UPPER(ra.nombre) = 'ANALISTA'");
          where.push("ee.updatedAt > ee.createdAt");
          where.push(
            `EXISTS (
               SELECT 1
                 FROM usuario_unidad uu
                WHERE uu.idUsuario = ?
                  AND uu.idUnidad = ee.idUnidad
             )`
          );
          params.push(session.idUsuario);
        } else {
          where.push("UPPER(rc.nombre) = 'GERENCIAL'");
        }

        const [rows]: any = await conn.execute(
          `SELECT
              ee.idEnvioEquipo,
              ee.numeroEquipo,
              ${eventColumn} AS eventAt,
              '${isManagerNotification ? "STATUS_CHANGED" : "NEW_SHIPMENT"}' AS eventType,
              u.nombre AS unidadNombre,
              te.nombre AS tipoEquipoNombre,
              dee.clave AS estadoClave,
              dee.nombre AS estadoNombre,
              ${actorColumn} AS actorNombre
           FROM envio_equipo ee
           JOIN unidad u ON u.idUnidad = ee.idUnidad
           JOIN tipo_equipo te ON te.idTipoEquipo = ee.idTipoEquipo
           JOIN des_estado_envio dee ON dee.idEstadoEnvio = ee.idEstadoEnvio
           LEFT JOIN usuario uc ON uc.idUsuario = ee.creadoPor
           LEFT JOIN rol rc ON rc.idRol = uc.idRol
           LEFT JOIN usuario ua ON ua.idUsuario = ee.actualizadoPor
           LEFT JOIN rol ra ON ra.idRol = ua.idRol
           WHERE ${where.join(" AND ")}
           ORDER BY ${eventColumn} ASC, ee.idEnvioEquipo ASC
           LIMIT 50`,
          params
        );

        return { serverTime, rows: rows || [] };
      });

      return { ok: true, serverTime: result.serverTime, data: result.rows };
    } catch (err: any) {
      return { ok: false, message: err?.message || "No se pudieron consultar las notificaciones." };
    }
  });

  ipcMain.handle("envio_equipo:list", async (event, _sessionArg: any, filtros: any) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "ENVIO_EQUIPO_VIEW");

      const page = Math.max(1, toIntSafe(filtros?.page, 1));
      const pageSize = Math.min(100, Math.max(5, toIntSafe(filtros?.pageSize, 25)));
      const offset = (page - 1) * pageSize;

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTipoEquipo = filtros?.idTipoEquipo ? Number(filtros.idTipoEquipo) : null;
      const estadoActualInput = filtros?.estadoActual;

      const desde = filtros?.desde ? String(filtros.desde) : null;
      const hasta = filtros?.hasta ? String(filtros.hasta) : null;

      const result = await withConn(async (conn: any) => {
        const envioCatalogs = await loadEnvioCatalogSet(conn);
        const estadoActual = resolveEstadoKey(envioCatalogs, estadoActualInput);
        const idEstadoEnviado = requireCatalogItemId(getEstadoId(envioCatalogs, "ENVIADO"), "el estado ENVIADO");
        const idEstadoRecibido = requireCatalogItemId(getEstadoId(envioCatalogs, "RECIBIDO"), "el estado RECIBIDO");
        const idEstadoRevision = requireCatalogItemId(getEstadoId(envioCatalogs, "EN_REVISION"), "el estado EN_REVISION");
        const idEstadoReparado = requireCatalogItemId(getEstadoId(envioCatalogs, "REPARADO"), "el estado REPARADO");
        const idEstadoExtraviado = requireCatalogItemId(getEstadoId(envioCatalogs, "EXTRAVIADO"), "el estado EXTRAVIADO");
        const where: string[] = [];
        const params: any[] = [];

        if (isGerencial(session)) {
          where.push(
            `EXISTS (
              SELECT 1
              FROM usuario_unidad uu
              WHERE uu.idUsuario = ?
                AND uu.idUnidad = ee.idUnidad
            )`
          );
          params.push(session.idUsuario);
        }

        if (q) {
          const like = `%${q}%`;
          where.push(
            `(ee.numeroEquipo LIKE ? OR u.nombre LIKE ? OR te.nombre LIKE ? OR dmo.nombre LIKE ? OR ee.observaciones LIKE ?)`
          );
          params.push(like, like, like, like, like);
        }

        if (idUnidad) {
          where.push(`ee.idUnidad = ?`);
          params.push(idUnidad);
        }

        if (idTipoEquipo) {
          where.push(`ee.idTipoEquipo = ?`);
          params.push(idTipoEquipo);
        }

        if (estadoActual) {
          where.push(`ee.idEstadoEnvio = ?`);
          params.push(requireCatalogItemId(getEstadoId(envioCatalogs, estadoActual), `el estado ${estadoActual}`));
        }

        if (desde) {
          where.push(`ee.fechaEnvio >= ?`);
          params.push(desde);
        }

        if (hasta) {
          where.push(`ee.fechaEnvio <= ?`);
          params.push(hasta);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [summaryRows]: any = await conn.execute(
          `SELECT
             ee.idEstadoEnvio,
             COUNT(*) AS total
           FROM envio_equipo ee
           JOIN unidad u ON u.idUnidad = ee.idUnidad
           JOIN tipo_equipo te ON te.idTipoEquipo = ee.idTipoEquipo
           LEFT JOIN des_motivo_envio dmo ON dmo.idMotivoEnvio = ee.idMotivoEnvio
          ${whereSql}
           GROUP BY ee.idEstadoEnvio`,
          params
        );

        const [rows]: any = await conn.execute(
          `SELECT
             ee.idEnvioEquipo,
             ee.numeroEquipo,
             ee.idUnidad,
             u.nombre AS unidadNombre,
             ee.idTipoEquipo,
             te.nombre AS tipoEquipoNombre,
             ee.nombreSolicitanteEnvio,
             ee.idPuestoSolicitante,
             psol.nombre AS puestoSolicitanteNombre,
             ee.idMotivoEnvio,
             dmo.clave AS motivoEnvioClave,
             dmo.nombre AS motivoEnvio,
             ee.observaciones,
             ee.idMedioEnvio,
             dme.clave AS medioEnvio,
             dme.nombre AS medioEnvioNombre,
             ee.nombrePiloto,
             ee.telefonoPiloto,
             ee.placaVehiculo,
             ee.nombrePersonalSucursal,
             ee.idPuestoPersonalSucursal,
             ps.nombre AS puestoPersonalSucursalNombre,
             ee.idTecnicoPersonalIT,
             uti.nombre AS tecnicoPersonalITNombre,
             ee.fechaEnvio,
             ee.fechaRecepcion,
             ee.fechaRevision,
             ee.fechaReparacion,
             ee.fechaEntrega,
             ee.fechaExtravio,
             ee.idEstadoEnvio,
             dee.clave AS estadoActual,
             dee.nombre AS estadoActualNombre,
             ee.observacionesEstadoActual,
             ee.createdAt,
             ee.updatedAt,
             ee.idTicketAsignado,
             tk.idTicket AS ticketNumero,
             tk.nombreSolicitante AS ticketSolicitante,
             uc.nombre AS creadoPorNombre,
             rc.nombre AS creadoPorRolNombre,
             ua.nombre AS actualizadoPorNombre
           FROM envio_equipo ee
           JOIN unidad u ON u.idUnidad = ee.idUnidad
           JOIN tipo_equipo te ON te.idTipoEquipo = ee.idTipoEquipo
           LEFT JOIN puesto psol ON psol.idPuesto = ee.idPuestoSolicitante
           LEFT JOIN des_motivo_envio dmo ON dmo.idMotivoEnvio = ee.idMotivoEnvio
           LEFT JOIN des_medio_envio dme ON dme.idMedioEnvio = ee.idMedioEnvio
           LEFT JOIN des_estado_envio dee ON dee.idEstadoEnvio = ee.idEstadoEnvio
           LEFT JOIN ticket tk ON tk.idTicket = ee.idTicketAsignado
           LEFT JOIN puesto ps ON ps.idPuesto = ee.idPuestoPersonalSucursal
           LEFT JOIN usuario uti ON uti.idUsuario = ee.idTecnicoPersonalIT
           LEFT JOIN usuario uc ON uc.idUsuario = ee.creadoPor
           LEFT JOIN rol rc ON rc.idRol = uc.idRol
           LEFT JOIN usuario ua ON ua.idUsuario = ee.actualizadoPor
           ${whereSql}
           ORDER BY ee.idEnvioEquipo DESC
           ${buildPaginationClause(pageSize, offset)}`,
          params
        );

        const summaryByState = new Map<number, number>();
        let summaryTotal = 0;
        for (const summaryRow of Array.isArray(summaryRows) ? summaryRows : []) {
          const stateId = Number(summaryRow.idEstadoEnvio || 0);
          const stateTotal = Number(summaryRow.total || 0);
          if (stateId) summaryByState.set(stateId, stateTotal);
          summaryTotal += stateTotal;
        }
        return {
          rows,
          total: summaryTotal,
          summary: {
            total: summaryTotal,
            enviados: summaryByState.get(idEstadoEnviado) || 0,
            recibidos: summaryByState.get(idEstadoRecibido) || 0,
            revisando: summaryByState.get(idEstadoRevision) || 0,
            reparados: summaryByState.get(idEstadoReparado) || 0,
            extraviados: summaryByState.get(idEstadoExtraviado) || 0,
            lastUpdatedAt: null
          }
        };
      });

      return { ok: true, ...result };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error listando envíos." };
    }
  });

  ipcMain.handle("envio_equipo:create", async (event, _sessionArg: any, data: any) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "ENVIO_EQUIPO_CREATE");

      const idUnidad = Number(data?.idUnidad || 0);
      const idTipoEquipo = Number(data?.idTipoEquipo || 0);
      const motivoEnvioInput = data?.idMotivoEnvio ?? data?.motivoEnvio;
      const observaciones = String(data?.observaciones || "").trim();
      const medioEnvioInput = data?.idMedioEnvio ?? data?.medioEnvio;
      const nombrePiloto = String(data?.nombrePiloto || "").trim();
      const telefonoPiloto = String(data?.telefonoPiloto || "").trim();
      const placaVehiculo = String(data?.placaVehiculo || "").trim();
      const nombrePersonalSucursal = String(data?.nombrePersonalSucursal || "").trim();
      const idPuestoPersonalSucursal = Number(data?.idPuestoPersonalSucursal || 0);
      const idTecnicoPersonalIT = Number(data?.idTecnicoPersonalIT || 0);
      const nombreSolicitanteEnvio = String(data?.nombreSolicitanteEnvio || "").trim();
      const requestedPuestoSolicitanteId = Number(data?.idPuestoSolicitante || 0);
      const fechaEnvio = normalizeMysqlDateTime(data?.fechaEnvio, true);
      if (!nombreSolicitanteEnvio) throw new Error("Solicitante requerido.");

      if (!idUnidad) throw new Error("Unidad requerida.");
      if (!idTipoEquipo) throw new Error("Tipo de equipo requerido.");
      if (!fechaEnvio) throw new Error("Fecha de envío requerida.");

      const result = await withConn(async (conn: any) => {
        const envioCatalogs = await loadEnvioCatalogSet(conn);
        const idMotivoEnvio = resolveMotivoId(envioCatalogs, motivoEnvioInput, true);
        const medioEnvio = resolveMedioKey(envioCatalogs, medioEnvioInput, true);
        const idMedioEnvio = requireCatalogItemId(
          medioEnvio ? getMedioId(envioCatalogs, medioEnvio, true) : 0,
          "el medio de envío seleccionado"
        );
        const idEstadoEnviado = requireCatalogItemId(
          getEstadoId(envioCatalogs, "ENVIADO"),
          "el estado ENVIADO"
        );

        if (!idMotivoEnvio) throw new Error("Motivo de envío requerido.");
        if (!medioEnvio) throw new Error("Medio de envío requerido.");

        if (medioEnvio === "CAMION") {
          if (!nombrePiloto) throw new Error("Nombre del piloto requerido para CAMIÓN.");
          if (!telefonoPiloto) throw new Error("Teléfono del piloto requerido para CAMIÓN.");
          if (!placaVehiculo) throw new Error("Placa del vehículo requerida para CAMIÓN.");
        }

        if (medioEnvio === "PERSONAL_SUCURSAL") {
          if (!nombrePersonalSucursal) throw new Error("Nombre requerido para Personal sucursal.");
          if (!idPuestoPersonalSucursal) throw new Error("Puesto requerido para Personal sucursal.");
        }

        if (medioEnvio === "PERSONAL_IT") {
          if (!idTecnicoPersonalIT) throw new Error("Debes seleccionar un técnico de IT.");
        }

        await assertCatalogs(conn, idUnidad, idTipoEquipo);
        await assertUnidadPermitida(conn, session, idUnidad);
        if (medioEnvio === "PERSONAL_SUCURSAL") {
          await assertPuestoActivo(conn, idPuestoPersonalSucursal);
        }
        if (medioEnvio === "PERSONAL_IT") {
          await assertTecnicoActivo(conn, idTecnicoPersonalIT);
        }

        const idPuestoSolicitante = await resolveSolicitantePuestoId(conn, session, requestedPuestoSolicitanteId);
        if (!idPuestoSolicitante) throw new Error("No se pudo determinar el puesto del solicitante.");

        const tempNumeroEquipo = buildTempNumeroEquipo();

        const [insertRes]: any = await conn.execute(
          `INSERT INTO envio_equipo (
             numeroEquipo,
             idUnidad,
             idTipoEquipo,
             nombreSolicitanteEnvio,
             idPuestoSolicitante,
             idMotivoEnvio,
             observaciones,
             idMedioEnvio,
             nombrePiloto,
             telefonoPiloto,
             placaVehiculo,
             nombrePersonalSucursal,
             idPuestoPersonalSucursal,
             idTecnicoPersonalIT,
             fechaEnvio,
             idEstadoEnvio,
             creadoPor,
             actualizadoPor,
             createdAt,
             updatedAt
           ) VALUES (
             ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ${fechaEnvio === "__NOW__" ? "NOW()" : "?"},
             ?,
             ?,
             ?,
             NOW(),
             NOW()
           )`,
          [
            tempNumeroEquipo,
            idUnidad,
            idTipoEquipo,
            nombreSolicitanteEnvio.slice(0, 100),
            idPuestoSolicitante,
            idMotivoEnvio,
            observaciones || null,
            idMedioEnvio,
            medioEnvio === "CAMION" ? nombrePiloto.slice(0, 100) : null,
            medioEnvio === "CAMION" ? telefonoPiloto.slice(0, 30) : null,
            medioEnvio === "CAMION" ? placaVehiculo.slice(0, 30) : null,
            medioEnvio === "PERSONAL_SUCURSAL" ? nombrePersonalSucursal.slice(0, 100) : null,
            medioEnvio === "PERSONAL_SUCURSAL" ? idPuestoPersonalSucursal : null,
            medioEnvio === "PERSONAL_IT" ? idTecnicoPersonalIT : null,
            ...(fechaEnvio === "__NOW__" ? [] : [fechaEnvio]),
            idEstadoEnviado,
            session.idUsuario,
            session.idUsuario
          ]
        );

        const idEnvioEquipo = Number(insertRes?.insertId || 0);
        if (!idEnvioEquipo) throw new Error("No se pudo crear el envío.");
        const numeroEquipo = await buildNumeroEquipo(conn, idEnvioEquipo);
        return { idEnvioEquipo, numeroEquipo };
      });

      return { ok: true, ...result };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error creando envío." };
    }
  });

  ipcMain.handle("envio_equipo:ticketsDisponibles", async (event, _sessionArg: any, data: any) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "ENVIO_EQUIPO_UPDATE");

      const idUnidad = Number(data?.idUnidad || 0);
      if (!idUnidad) throw new Error("Unidad requerida.");

      const rows = await withConn(async (conn: any) => {
        if (isGerencial(session)) {
          await assertUnidadPermitida(conn, session, idUnidad);
        }

        const [ticketRows]: any = await conn.execute(
          `SELECT
             t.idTicket,
             t.nombreSolicitante,
             s.nombre AS servicioNombre,
             dc.nombre AS clasificacionNombre,
             t.fechaApertura
           FROM ticket t
           JOIN servicio s ON s.idServicio = t.idServicio
           LEFT JOIN des_clasificacion dc ON dc.idClasificacion = t.idClasificacion
           WHERE t.idUnidad = ?
             AND t.fechaCierre IS NULL
           ORDER BY t.idTicket DESC`,
          [idUnidad]
        );

        return ticketRows || [];
      });

      return { ok: true, rows };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error cargando tickets disponibles." };
    }
  });

  ipcMain.handle("envio_equipo:assignTicket", async (event, _sessionArg: any, data: any) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "ENVIO_EQUIPO_UPDATE");

      const idEnvioEquipo = Number(data?.idEnvioEquipo || 0);
      const idTicket = Number(data?.idTicket || 0);
      if (!idEnvioEquipo) throw new Error("Envío inválido.");
      if (!idTicket) throw new Error("Ticket inválido.");

      await withConn(async (conn: any) => {
        await conn.beginTransaction();
        try {
          const envioCatalogs = await loadEnvioCatalogSet(conn);
          const idEstadoRevision = requireCatalogItemId(
            getEstadoId(envioCatalogs, "EN_REVISION"),
            "el estado EN_REVISION"
          );
          const [envioRows]: any = await conn.execute(
            `SELECT idEnvioEquipo, idUnidad, idTicketAsignado, idEstadoEnvio
             FROM envio_equipo
             WHERE idEnvioEquipo = ?
             LIMIT 1
             FOR UPDATE`,
            [idEnvioEquipo]
          );
          if (!envioRows?.length) throw new Error("El envío no existe.");
          const envio = envioRows[0];

          if (isGerencial(session)) {
            await assertUnidadPermitida(conn, session, Number(envio.idUnidad));
          }

          const estadoActual = resolveEstadoKey(envioCatalogs, envio.idEstadoEnvio);
          if (!estadoActual) throw new Error("Estado actual inválido.");
          if (envio.idTicketAsignado) throw new Error("El envío ya tiene ticket asignado.");
          if (estadoActual === "ENTREGADO" || estadoActual === "EXTRAVIADO") {
            throw new Error("No se puede asignar ticket a un envío finalizado.");
          }

          if (estadoActual !== "RECIBIDO") {
            throw new Error("El envío debe estar en estado RECIBIDO antes de asignarle ticket.");
          }

          const [ticketRows]: any = await conn.execute(
            `SELECT idTicket, idUnidad, fechaCierre
             FROM ticket
             WHERE idTicket = ?
             LIMIT 1
             FOR UPDATE`,
            [idTicket]
          );
          if (!ticketRows?.length) throw new Error("El ticket no existe.");
          const ticket = ticketRows[0];
          if (Number(ticket.idUnidad) !== Number(envio.idUnidad)) {
            throw new Error("El ticket debe pertenecer a la misma unidad del envío.");
          }
          if (ticket.fechaCierre) throw new Error("No se puede asignar un ticket cerrado.");

          const [linkedRows]: any = await conn.execute(
            `SELECT idEnvioEquipo
             FROM envio_equipo
             WHERE idTicketAsignado = ?
               AND idEnvioEquipo <> ?
             LIMIT 1
             FOR UPDATE`,
            [idTicket, idEnvioEquipo]
          );
          if (linkedRows?.length) {
            throw new Error("El ticket ya está vinculado a otro envío.");
          }

          await conn.execute(
            `UPDATE envio_equipo
             SET idTicketAsignado = ?,
                 idEstadoEnvio = ?,
                 fechaRevision = IFNULL(fechaRevision, NOW()),
                 actualizadoPor = ?,
                 updatedAt = NOW()
             WHERE idEnvioEquipo = ?`,
            [idTicket, idEstadoRevision, session.idUsuario, idEnvioEquipo]
          );

          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error asignando ticket." };
    }
  });

  ipcMain.handle("envio_equipo:updateEstado", async (event, _sessionArg: any, data: any) => {
    try {
      const session = requireTrustedSession(event);
      requirePerm(session, "ENVIO_EQUIPO_UPDATE");

      const idEnvioEquipo = Number(data?.idEnvioEquipo || 0);
      const nuevoEstadoInput = data?.nuevoEstado;
      const observacionesEstadoActual = String(data?.observacionesEstadoActual || "").trim();
      const fechaEvento = normalizeMysqlDateTime(data?.fechaEvento, true);

      if (!idEnvioEquipo) throw new Error("Envío inválido.");
      if (!fechaEvento) throw new Error("Fecha del cambio requerida.");

      await withConn(async (conn: any) => {
        await conn.beginTransaction();
        try {
          const envioCatalogs = await loadEnvioCatalogSet(conn);
          const nuevoEstado = resolveEstadoKey(envioCatalogs, nuevoEstadoInput, true);
          if (!nuevoEstado || nuevoEstado === "ENVIADO") throw new Error("Nuevo estado inválido.");
          if (nuevoEstado === "EN_REVISION") {
            throw new Error("El estado EN_REVISION se asigna automáticamente al vincular el ticket.");
          }
          if (nuevoEstado === "REPARADO") {
            throw new Error("El estado REPARADO se asigna automáticamente al cerrar el ticket vinculado.");
          }
          if (nuevoEstado === "EXTRAVIADO" && !observacionesEstadoActual) {
            throw new Error("Debes registrar observaciones al marcar un envío como extraviado.");
          }

          const [rows]: any = await conn.execute(
            `SELECT idEnvioEquipo, idUnidad, idEstadoEnvio, idTicketAsignado, observacionesEstadoActual
             FROM envio_equipo
             WHERE idEnvioEquipo = ?
             LIMIT 1
             FOR UPDATE`,
            [idEnvioEquipo]
          );
          if (!rows?.length) throw new Error("El envío no existe.");
          const current = rows[0];

          if (isGerencial(session)) {
            await assertUnidadPermitida(conn, session, Number(current.idUnidad));
          }

          const currentState = resolveEstadoKey(envioCatalogs, current.idEstadoEnvio);
          if (!currentState) throw new Error("Estado actual inválido.");

          const allowedNextStates = getAllowedNextStates(currentState);
          if (!allowedNextStates.includes(nuevoEstado)) {
            throw new Error(`No se puede cambiar de ${currentState} a ${nuevoEstado}.`);
          }

          const dateColumnMap: Record<Exclude<EnvioEstado, "ENVIADO">, string> = {
            RECIBIDO: "fechaRecepcion",
            EN_REVISION: "fechaRevision",
            REPARADO: "fechaReparacion",
            ENTREGADO: "fechaEntrega",
            EXTRAVIADO: "fechaExtravio"
          };

          const dateColumn = dateColumnMap[nuevoEstado];
          const updateSql = `
            UPDATE envio_equipo
            SET idEstadoEnvio = ?,
                observacionesEstadoActual = ?,
                actualizadoPor = ?,
                updatedAt = NOW(),
                ${dateColumn} = ${fechaEvento === "__NOW__" ? `IFNULL(${dateColumn}, NOW())` : `IFNULL(${dateColumn}, ?)`}
            WHERE idEnvioEquipo = ?
          `;

          await conn.execute(updateSql, [
            requireCatalogItemId(getEstadoId(envioCatalogs, nuevoEstado), `el estado ${nuevoEstado}`),
            observacionesEstadoActual || current.observacionesEstadoActual || null,
            session.idUsuario,
            ...(fechaEvento === "__NOW__" ? [] : [fechaEvento]),
            idEnvioEquipo
          ]);

          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        }
      });

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error actualizando envío." };
    }
  });
}
