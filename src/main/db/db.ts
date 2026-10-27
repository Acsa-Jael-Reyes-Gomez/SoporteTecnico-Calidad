// src/db/db.ts
import fs from "fs";
import path from "path";

export interface DbConnection {
  execute<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void | Promise<void>;
}

function getConfigCandidates() {
  const envPath = String(process.env.APPSETTINGS_PATH || "").trim();
  const exeDirPath = path.join(path.dirname(process.execPath), "appsettings.json");
  const devPath = path.join(process.cwd(), "appsettings.json");
  const legacyProdBase = typeof process.resourcesPath === "string" ? process.resourcesPath : "";
  const legacyProdPath = legacyProdBase ? path.join(legacyProdBase, "appsettings.json") : "";

  return [...new Set([envPath, exeDirPath, devPath, legacyProdPath].filter(Boolean))];
}

/**
 * Lee appsettings.json con prioridad segura para produccion:
 * - APPSETTINGS_PATH
 * - junto al ejecutable
 * - raiz del proyecto (dev)
 * - resources/appsettings.json solo por compatibilidad con builds viejos
 */
function getConfigPath() {
  for (const candidate of getConfigCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return getConfigCandidates()[0] || path.join(process.cwd(), "appsettings.json");
}

type MysqlCfg = {
  charset?: string;
  connectionLimit?: number;
  connectTimeout?: number;
  odbcDsn?: string;
  odbcConnectionStringEnv?: string;
};

type SupportedMysqlCharset = "utf8mb4" | "utf8";

function normalizeMysqlCharset(value: any): SupportedMysqlCharset {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "utf8mb4") return "utf8mb4";
  return "utf8";
}

function getMysqlCollation(charset: SupportedMysqlCharset) {
  return charset === "utf8mb4" ? "utf8mb4_unicode_ci" : "utf8_general_ci";
}

function getMysqlDefaultCharsetSql(charset: SupportedMysqlCharset) {
  return `DEFAULT CHARSET=${charset} COLLATE=${getMysqlCollation(charset)}`;
}

const RUTA_REVIEW_CATALOG_SEED = [
  { idCatalogoEquipoRevisadoR: 1, clave: "caja_ventas", nombre: "CAJA - VENTAS", orden: 1 },
  { idCatalogoEquipoRevisadoR: 2, clave: "cableado", nombre: "CABLEADO", orden: 2 },
  { idCatalogoEquipoRevisadoR: 3, clave: "camaras", nombre: "CAMARAS", orden: 3 },
  { idCatalogoEquipoRevisadoR: 4, clave: "servidor", nombre: "SERVIDOR", orden: 4 },
  { idCatalogoEquipoRevisadoR: 5, clave: "switches_cenefa", nombre: "SWITCHES - CENEFA", orden: 5 },
  { idCatalogoEquipoRevisadoR: 6, clave: "gerencia_etiquetadoras", nombre: "GERENCIA - ETIQUETADORAS", orden: 6 },
  { idCatalogoEquipoRevisadoR: 7, clave: "balanzas", nombre: "BALANZAS", orden: 7 },
  { idCatalogoEquipoRevisadoR: 8, clave: "laptop", nombre: "LAPTOP", orden: 8 }
] as const;

const ENVIO_PERMISOS_CORREGIDOS = [
  { code: "ENVIO_EQUIPO_VER", descripcion: "Ver módulo de envío de equipo" },
  { code: "ENVIO_EQUIPO_CREAR", descripcion: "Crear envío de equipo" },
  { code: "ENVIO_EQUIPO_ACTUALIZAR", descripcion: "Actualizar envío de equipo" }
] as const;

const PERMISO_CODE_TRANSLATIONS = [
  ["TICKETS_CREATE", "TICKETS_CREAR"],
  ["TICKETS_EDIT", "TICKETS_EDITAR"],
  ["TICKETS_DELETE", "TICKETS_BORRAR"],
  ["TICKETS_CLOSE", "TICKETS_CERRAR"],
  ["TICKETS_REOPEN", "TICKETS_REABRIR"],
  ["TICKETS_VIEW_ALL", "TICKETS_VER_TODOS"],
  ["RUTAS_CREATE", "RUTAS_CREAR"],
  ["RUTAS_EDIT", "RUTAS_EDITAR"],
  ["RUTAS_DELETE", "RUTAS_BORRAR"],
  ["RUTAS_CLOSE", "RUTAS_CERRAR"],
  ["RUTAS_REOPEN", "RUTAS_REABRIR"],
  ["RUTAS_VIEW_ALL", "RUTAS_VER_TODAS"],
  ["REPORTS_VIEW", "REPORTES_VER"],
  ["REPORTS_EXPORT", "REPORTES_EXPORTAR"],
  ["TICKETS_RATE", "TICKETS_CALIFICAR"],
  ["EQUIPOS_CREATE", "EQUIPOS_CREAR"],
  ["EQUIPOS_EDIT", "EQUIPOS_EDITAR"],
  ["EQUIPOS_DELETE", "EQUIPOS_BORRAR"],
  ["EQUIPOS_VIEW", "EQUIPOS_VER"],
  ["PROYECTOS_ESPECIALES_CREATE", "PROYECTOS_ESPECIALES_CREAR"],
  ["PROYECTOS_ESPECIALES_EDIT", "PROYECTOS_ESPECIALES_EDITAR"],
  ["PROYECTOS_ESPECIALES_VIEW_ALL", "PROYECTOS_ESPECIALES_VER_TODOS"],
  ["PROYECTOS_ESPECIALES_REVIEW", "PROYECTOS_ESPECIALES_REVISAR"],
  ["PROYECTOS_ESPECIALES_DOWNLOAD", "PROYECTOS_ESPECIALES_DESCARGAR"],
  ["CALIFICACION_VIEW", "CALIFICACION_VER"],
  ["CALIFICACION_TICKETS", "CALIFICAR_TICKETS"],
  ["CALIFICACION_RUTAS", "CALIFICAR_RUTAS"],
  ["VALIDACION_VIEW", "VALIDACION_VER"],
  ["VALIDACION_RUTAS", "VALIDAR_RUTAS"],
  ["ENVIO_EQUIPO_VIEW", "ENVIO_EQUIPO_VER"],
  ["ENVIO_EQUIPO_CREATE", "ENVIO_EQUIPO_CREAR"],
  ["ENVIO_EQUIPO_UPDATE", "ENVIO_EQUIPO_ACTUALIZAR"]
] as const;

const ENVIO_MOTIVO_CATALOG_SEED_CORREGIDO = [
  { idMotivoEnvio: 1, clave: "REPARACION", nombre: "Reparación", orden: 1 },
  { idMotivoEnvio: 2, clave: "CAMBIO", nombre: "Cambio", orden: 2 },
  { idMotivoEnvio: 3, clave: "DESALOJO", nombre: "Desalojo", orden: 3 }
] as const;

const ENVIO_MEDIO_CATALOG_SEED_CORREGIDO = [
  { idMedioEnvio: 1, clave: "CAMION", nombre: "Camión", orden: 1 },
  { idMedioEnvio: 2, clave: "PERSONAL_SUCURSAL", nombre: "Personal sucursal", orden: 2 },
  { idMedioEnvio: 3, clave: "PERSONAL_IT", nombre: "Personal IT", orden: 3 }
] as const;

const ENVIO_ESTADO_CATALOG_SEED_CORREGIDO = [
  { idEstadoEnvio: 1, clave: "ENVIADO", nombre: "Enviado", orden: 1 },
  { idEstadoEnvio: 2, clave: "RECIBIDO", nombre: "Recibido", orden: 2 },
  { idEstadoEnvio: 3, clave: "EXTRAVIADO", nombre: "Extraviado", orden: 6 },
  { idEstadoEnvio: 4, clave: "REPARADO", nombre: "Reparado", orden: 4 },
  { idEstadoEnvio: 5, clave: "ENTREGADO", nombre: "Entregado", orden: 5 },
  { idEstadoEnvio: 6, clave: "EN_REVISION", nombre: "En revisión", orden: 3 }
] as const;

const RUTA_REVIEW_CATALOG_TABLE = "catalogoequiporevisador";
const RUTA_REVIEW_CATALOG_COMPAT_TABLES = ["catalogoEquipoRevisadoR"] as const;
const RUTA_REVIEW_DETAIL_TABLE = "equipos_revisados_rutas";
const RUTA_REVIEW_DETAIL_COMPAT_TABLES = ["Equipos_Revisados_Rutas"] as const;

type SeededCatalogRow = {
  id: number;
  clave: string;
  nombre: string;
  orden: number;
};

function normalizeCatalogKey(value: any, mode: "upper" | "lower") {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return mode === "lower" ? normalized.toLowerCase() : normalized.toUpperCase();
}

async function resolveExistingTableName(
  conn: DbConnection,
  preferredName: string,
  aliases: readonly string[] = []
): Promise<string | null> {
  const exactCandidates = [preferredName, ...aliases].filter(Boolean);

  for (const candidate of exactCandidates) {
    const [rows]: any = await conn.execute(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
       LIMIT 1`,
      [candidate]
    );

    if (rows?.length) return String(rows[0].TABLE_NAME);
  }

  const lowered = Array.from(new Set(exactCandidates.map((candidate) => candidate.toLowerCase())));
  const [rows]: any = await conn.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) IN (${lowered.map(() => "?").join(", ")})
     ORDER BY CASE WHEN LOWER(TABLE_NAME) = ? THEN 0 ELSE 1 END, TABLE_NAME
     LIMIT 1`,
    [...lowered, preferredName.toLowerCase()]
  );

  return rows?.length ? String(rows[0].TABLE_NAME) : null;
}

async function getTableColumnSet(conn: DbConnection, tableName: string): Promise<Set<string>> {
  const [rows]: any = await conn.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  return new Set((rows || []).map((row: any) => String(row.COLUMN_NAME)));
}

async function getTableIndexes(conn: DbConnection, tableName: string): Promise<Map<string, string[]>> {
  const [rows]: any = await conn.execute(
    `SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [tableName]
  );

  const indexMap = new Map<string, string[]>();
  for (const row of rows || []) {
    const indexName = String(row.INDEX_NAME || "");
    const columnName = String(row.COLUMN_NAME || "");
    const seq = Math.max(1, Number(row.SEQ_IN_INDEX || 1)) - 1;
    const columns = indexMap.get(indexName) || [];
    columns[seq] = columnName;
    indexMap.set(indexName, columns);
  }

  return indexMap;
}

function hasIndexPrefix(indexMap: Map<string, string[]>, columns: readonly string[]) {
  for (const indexedColumns of indexMap.values()) {
    if (indexedColumns.length < columns.length) continue;

    let matches = true;
    for (let index = 0; index < columns.length; index += 1) {
      if (String(indexedColumns[index] || "") !== String(columns[index] || "")) {
        matches = false;
        break;
      }
    }

    if (matches) return true;
  }

  return false;
}

async function ensureTableIndex(
  conn: DbConnection,
  opts: {
    tableName: string;
    indexName: string;
    columns: readonly string[];
    aliases?: readonly string[];
  }
) {
  const resolvedTableName = await resolveExistingTableName(conn, opts.tableName, opts.aliases || []);
  if (!resolvedTableName) return;

  const columnSet = await getTableColumnSet(conn, resolvedTableName);
  if (opts.columns.some((column) => !columnSet.has(column))) return;

  const indexMap = await getTableIndexes(conn, resolvedTableName);
  if (indexMap.has(opts.indexName) || hasIndexPrefix(indexMap, opts.columns)) return;

  await conn.execute(
    `ALTER TABLE \`${resolvedTableName}\`
     ADD KEY \`${opts.indexName}\` (${opts.columns.map((column) => `\`${column}\``).join(", ")})`
  );
}

async function ensureNullableUniqueTableIndex(
  conn: DbConnection,
  opts: {
    tableName: string;
    indexName: string;
    columnName: string;
    aliases?: readonly string[];
  }
) {
  const resolvedTableName = await resolveExistingTableName(conn, opts.tableName, opts.aliases || []);
  if (!resolvedTableName) return;

  const columnSet = await getTableColumnSet(conn, resolvedTableName);
  if (!columnSet.has(opts.columnName)) return;

  const indexMap = await getTableIndexes(conn, resolvedTableName);
  if (indexMap.has(opts.indexName)) return;

  const [duplicates]: any = await conn.execute(
    `SELECT \`${opts.columnName}\`
     FROM \`${resolvedTableName}\`
     WHERE \`${opts.columnName}\` IS NOT NULL
     GROUP BY \`${opts.columnName}\`
     HAVING COUNT(*) > 1
     LIMIT 1`
  );
  if (duplicates?.length) return;

  await conn.execute(
    `ALTER TABLE \`${resolvedTableName}\`
     ADD UNIQUE KEY \`${opts.indexName}\` (\`${opts.columnName}\`)`
  );
}

async function ensureTableColumn(
  conn: DbConnection,
  tableName: string,
  columnSet: Set<string>,
  columnName: string,
  definitionSql: string
) {
  if (columnSet.has(columnName)) return;

  await conn.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definitionSql}`);
  columnSet.add(columnName);
}

async function loadCatalogIdByKeyMap(
  conn: DbConnection,
  tableName: string,
  idColumn: string
): Promise<Map<string, number>> {
  const [rows]: any = await conn.execute(
    `SELECT \`${idColumn}\` AS id, clave, nombre
     FROM \`${tableName}\``
  );

  const map = new Map<string, number>();
  for (const row of rows || []) {
    const id = Number(row?.id || 0);
    if (!id) continue;

    const candidates = [row?.clave, row?.nombre];
    for (const candidate of candidates) {
      const key = normalizeCatalogKey(candidate, "upper");
      if (key) {
        map.set(key, id);
      }
    }
  }

  return map;
}

async function ensureSeededCatalogTable(
  conn: DbConnection,
  opts: {
    preferredName: string;
    aliases?: readonly string[];
    createSql: string;
    idColumn: string;
    seedRows: readonly SeededCatalogRow[];
    keyMode: "upper" | "lower";
  }
): Promise<string> {
  const preferredTableName = await resolveExistingTableName(conn, opts.preferredName);
  let tableName = preferredTableName;

  if (!tableName) {
    tableName = await resolveExistingTableName(conn, opts.preferredName, opts.aliases || []);
  }

  if (!preferredTableName) {
    await conn.execute(opts.createSql);
  }

  if (!tableName) {
    tableName = opts.preferredName;
  }

  const columnSet = await getTableColumnSet(conn, tableName);
  await ensureTableColumn(conn, tableName, columnSet, "clave", `\`clave\` VARCHAR(60) NULL AFTER \`${opts.idColumn}\``);
  await ensureTableColumn(conn, tableName, columnSet, "orden", `\`orden\` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0 AFTER \`nombre\``);
  await ensureTableColumn(conn, tableName, columnSet, "activo", `\`activo\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`orden\``);
  await conn.execute(`ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET ${poolCharset} COLLATE ${getMysqlCollation(poolCharset)}`);

  const [rows]: any = await conn.execute(
    `SELECT \`${opts.idColumn}\` AS id, nombre, clave, orden, activo
     FROM \`${tableName}\`
     ORDER BY \`${opts.idColumn}\``
  );

  const seedById = new Map(opts.seedRows.map((item) => [item.id, item]));
  for (const row of rows || []) {
    const id = Number(row.id || 0);
    if (!id) continue;

    const seed = seedById.get(id);
    const nombre = String(seed?.nombre ?? row.nombre ?? "").trim();
    const clave =
      String(seed?.clave ?? row.clave ?? "").trim() || normalizeCatalogKey(nombre || id, opts.keyMode);
    const orden = Number(seed?.orden ?? row.orden ?? id) || id;
    const activo = row.activo === null || row.activo === undefined ? 1 : Number(row.activo) ? 1 : 0;

    await conn.execute(
      `UPDATE \`${tableName}\`
       SET clave = ?, nombre = ?, orden = ?, activo = ?
       WHERE \`${opts.idColumn}\` = ?`,
      [clave, nombre, orden, activo, id]
    );
  }

  await conn.execute(
    `INSERT INTO \`${tableName}\`
      (\`${opts.idColumn}\`, clave, nombre, orden, activo)
     VALUES ${opts.seedRows.map(() => "(?,?,?,?,1)").join(", ")}
     ON DUPLICATE KEY UPDATE
       clave = VALUES(clave),
       nombre = VALUES(nombre),
       orden = VALUES(orden)`,
    opts.seedRows.flatMap((item) => [item.id, item.clave, item.nombre, item.orden])
  );

  await conn.execute(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`clave\` VARCHAR(60) NOT NULL`);

  if (tableName !== opts.preferredName) {
    await conn.execute(
      `INSERT INTO \`${opts.preferredName}\`
        (\`${opts.idColumn}\`, clave, nombre, orden, activo)
       SELECT
         \`${opts.idColumn}\`,
         clave,
         nombre,
         orden,
         activo
       FROM \`${tableName}\`
       ON DUPLICATE KEY UPDATE
         clave = VALUES(clave),
         nombre = VALUES(nombre),
         orden = VALUES(orden)`
    );

    return opts.preferredName;
  }

  return tableName;
}

function loadMysqlConfig(): MysqlCfg {
  const cfgPath = getConfigPath();
  if (!fs.existsSync(cfgPath)) {
    const searched = getConfigCandidates().join(", ");
    throw new Error(
      `No se encontro appsettings.json. Busque en: ${searched}. Define APPSETTINGS_PATH o coloca appsettings.json junto al ejecutable (prod) o en la raiz del proyecto (dev).`
    );
  }

  const raw = fs.readFileSync(cfgPath, "utf8");
  const json = JSON.parse(raw);

  const mysqlCfg: MysqlCfg = json?.mysql || json?.odbc;
  const envName = String(mysqlCfg?.odbcConnectionStringEnv || "SOPORTE_ODBC_CONNECTION").trim();
  const connectionFromEnv = String(process.env[envName] || "").trim();
  if (!connectionFromEnv && !String(mysqlCfg?.odbcDsn || "Tickets_IT").trim()) {
    throw new Error("No se encontró la conexión ODBC configurada. Verifica que el DSN Tickets_IT exista en Windows.");
  }

  return mysqlCfg;
}

let odbcPool: any = null;
let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;
let poolCharset: SupportedMysqlCharset = "utf8";
let schemaAutoMigrate = false;
let initializedConnections = new WeakSet<object>();
let databaseOperationTail: Promise<void> = Promise.resolve();
let assignmentNotificationSchemaReady = false;

export async function ensureAssignmentNotificationSchema(conn: DbConnection): Promise<void> {
  if (assignmentNotificationSchemaReady) return;
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notificacion_asignacion (
      idNotificacion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      idUsuario INT(10) UNSIGNED NOT NULL,
      tipo VARCHAR(30) NOT NULL,
      idReferencia INT(10) UNSIGNED NOT NULL,
      idUnidad SMALLINT(5) UNSIGNED NULL,
      creadoPor INT(10) UNSIGNED NULL,
      createdAt DATETIME NOT NULL,
      PRIMARY KEY (idNotificacion),
      KEY idx_notificacion_usuario_fecha (idUsuario, createdAt, idNotificacion),
      KEY idx_notificacion_referencia (tipo, idReferencia)
    ) ENGINE=InnoDB ${getMysqlDefaultCharsetSql(poolCharset)}
  `);
  await conn.execute(`
    UPDATE notificacion_asignacion
       SET tipo = CASE tipo
         WHEN 'TICKET_ASSIGNED' THEN 'TICKET_ASIGNADO'
         WHEN 'ROUTE_ASSIGNED' THEN 'RUTA_ASIGNADA'
         WHEN 'ROUTE_VALIDATED' THEN 'RUTA_VALIDADA'
         ELSE tipo
       END
     WHERE tipo IN ('TICKET_ASSIGNED', 'ROUTE_ASSIGNED', 'ROUTE_VALIDATED')
  `);
  assignmentNotificationSchemaReady = true;
}

async function acquireDatabaseTurn(): Promise<() => void> {
  const previousTurn = databaseOperationTail;
  let releaseTurn!: () => void;
  databaseOperationTail = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });
  await previousTurn;
  return releaseTurn;
}

async function ensureSchema(conn: DbConnection): Promise<void> {
  if (schemaEnsured) return;
  if (schemaEnsurePromise) return schemaEnsurePromise;

  schemaEnsurePromise = (async () => {
    const schemaCharsetSql = getMysqlDefaultCharsetSql(poolCharset);

    // Schema migrations muy pequenas e idempotentes (compatibles con MySQL 5.1)
    // Objetivo: evitar errores runtime cuando el usuario tiene una BD creada con un SQL anterior.
    const [cols]: any = await conn.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'ticket'
         AND COLUMN_NAME = 'casoExtraordinario'
       LIMIT 1`
    );

    if (!cols?.length) {
      // Agregar columna faltante
      await conn.execute(
        `ALTER TABLE ticket
         ADD COLUMN casoExtraordinario TINYINT(1) NOT NULL DEFAULT 0`
      );

      // Backfill: marcar extraordinario usando el catálogo real en BD.
      try {
        const clasificacionIdsByKey = await loadCatalogIdByKeyMap(conn, "des_clasificacion", "idClasificacion");
        const extraordinarioId = Number(clasificacionIdsByKey.get("EXTRAORDINARIO") || 0) || 0;
        await conn.execute(
          `UPDATE ticket
           SET casoExtraordinario = CASE WHEN idClasificacion = ? THEN 1 ELSE 0 END`,
          [extraordinarioId]
        );
      } catch {
        // Si idClasificacion no existe o falla por alguna razon, no bloquear el arranque.
      }
    }

    await conn.execute(
      `UPDATE permiso
       SET code = CASE code
         ${PERMISO_CODE_TRANSLATIONS.map(() => "WHEN ? THEN ?").join("\n         ")}
         ELSE code
       END
       WHERE code IN (${PERMISO_CODE_TRANSLATIONS.map(() => "?").join(", ")})`,
      [
        ...PERMISO_CODE_TRANSLATIONS.flatMap(([oldCode, newCode]) => [oldCode, newCode]),
        ...PERMISO_CODE_TRANSLATIONS.map(([oldCode]) => oldCode)
      ]
    );

    await conn.execute(
      `INSERT IGNORE INTO permiso (code, descripcion)
       VALUES ${ENVIO_PERMISOS_CORREGIDOS.map(() => "(?, ?)").join(", ")}`,
      ENVIO_PERMISOS_CORREGIDOS.flatMap((perm) => [perm.code, perm.descripcion])
    );

    await ensureSeededCatalogTable(conn, {
      preferredName: "des_motivo_envio",
      createSql: `
        CREATE TABLE IF NOT EXISTS des_motivo_envio (
          idMotivoEnvio TINYINT(3) UNSIGNED NOT NULL,
          clave VARCHAR(60) NOT NULL,
          nombre VARCHAR(120) NOT NULL,
          orden TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
          activo TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (idMotivoEnvio),
          UNIQUE KEY uq_des_motivo_envio_clave (clave)
        ) ENGINE=InnoDB ${schemaCharsetSql}
      `,
      idColumn: "idMotivoEnvio",
      seedRows: ENVIO_MOTIVO_CATALOG_SEED_CORREGIDO.map((item) => ({
        id: item.idMotivoEnvio,
        clave: item.clave,
        nombre: item.nombre,
        orden: item.orden
      })),
      keyMode: "upper"
    });
    await ensureSeededCatalogTable(conn, {
      preferredName: "des_medio_envio",
      createSql: `
        CREATE TABLE IF NOT EXISTS des_medio_envio (
          idMedioEnvio TINYINT(3) UNSIGNED NOT NULL,
          clave VARCHAR(60) NOT NULL,
          nombre VARCHAR(120) NOT NULL,
          orden TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
          activo TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (idMedioEnvio),
          UNIQUE KEY uq_des_medio_envio_clave (clave)
        ) ENGINE=InnoDB ${schemaCharsetSql}
      `,
      idColumn: "idMedioEnvio",
      seedRows: ENVIO_MEDIO_CATALOG_SEED_CORREGIDO.map((item) => ({
        id: item.idMedioEnvio,
        clave: item.clave,
        nombre: item.nombre,
        orden: item.orden
      })),
      keyMode: "upper"
    });
    await ensureSeededCatalogTable(conn, {
      preferredName: "des_estado_envio",
      createSql: `
        CREATE TABLE IF NOT EXISTS des_estado_envio (
          idEstadoEnvio TINYINT(3) UNSIGNED NOT NULL,
          clave VARCHAR(60) NOT NULL,
          nombre VARCHAR(120) NOT NULL,
          orden TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
          activo TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (idEstadoEnvio),
          UNIQUE KEY uq_des_estado_envio_clave (clave)
        ) ENGINE=InnoDB ${schemaCharsetSql}
      `,
      idColumn: "idEstadoEnvio",
      seedRows: ENVIO_ESTADO_CATALOG_SEED_CORREGIDO.map((item) => ({
        id: item.idEstadoEnvio,
        clave: item.clave,
        nombre: item.nombre,
        orden: item.orden
      })),
      keyMode: "upper"
    });

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS envio_equipo (
        idEnvioEquipo INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
        numeroEquipo VARCHAR(40) NOT NULL,
        idUnidad SMALLINT(5) UNSIGNED NOT NULL,
        idTipoEquipo SMALLINT(5) UNSIGNED NOT NULL,
        nombreSolicitanteEnvio VARCHAR(100) NULL,
        idPuestoSolicitante SMALLINT(5) UNSIGNED NULL,
        idMotivoEnvio TINYINT(3) UNSIGNED NOT NULL,
        observaciones TEXT NULL,
        idMedioEnvio TINYINT(3) UNSIGNED NOT NULL,
        nombrePiloto VARCHAR(100) NULL,
        telefonoPiloto VARCHAR(30) NULL,
        placaVehiculo VARCHAR(30) NULL,
        nombrePersonalSucursal VARCHAR(100) NULL,
        idPuestoPersonalSucursal SMALLINT(5) UNSIGNED NULL,
        idTecnicoPersonalIT INT(10) UNSIGNED NULL,
        fechaEnvio DATETIME NOT NULL,
        idEstadoEnvio TINYINT(3) UNSIGNED NOT NULL DEFAULT 1,
        fechaRecepcion DATETIME NULL,
        fechaRevision DATETIME NULL,
        fechaReparacion DATETIME NULL,
        fechaEntrega DATETIME NULL,
        fechaExtravio DATETIME NULL,
        idTicketAsignado INT(10) UNSIGNED NULL,
        creadoPor INT(10) UNSIGNED NOT NULL,
        actualizadoPor INT(10) UNSIGNED NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        observacionesEstadoActual TEXT NULL,
        PRIMARY KEY (idEnvioEquipo),
        UNIQUE KEY uq_envio_equipo_numero (numeroEquipo),
        KEY idx_envio_equipo_unidad_fecha (idUnidad, fechaEnvio),
        KEY idx_envio_equipo_puesto_solicitante (idPuestoSolicitante),
        KEY idx_envio_equipo_motivo (idMotivoEnvio),
        KEY idx_envio_equipo_medio (idMedioEnvio),
        KEY idx_envio_equipo_estado (idEstadoEnvio),
        KEY idx_envio_equipo_tipo (idTipoEquipo),
        KEY idx_envio_equipo_ticket (idTicketAsignado),
        KEY idx_envio_equipo_puesto_sucursal (idPuestoPersonalSucursal),
        KEY idx_envio_equipo_tecnico_it (idTecnicoPersonalIT),
        KEY idx_envio_equipo_creado_por (creadoPor),
        KEY idx_envio_equipo_actualizado_por (actualizadoPor),
        CONSTRAINT fk_envio_equipo_unidad FOREIGN KEY (idUnidad) REFERENCES unidad (idUnidad) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_tipo FOREIGN KEY (idTipoEquipo) REFERENCES tipo_equipo (idTipoEquipo) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_puesto_solicitante FOREIGN KEY (idPuestoSolicitante) REFERENCES puesto (idPuesto) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_motivo FOREIGN KEY (idMotivoEnvio) REFERENCES des_motivo_envio (idMotivoEnvio) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_medio FOREIGN KEY (idMedioEnvio) REFERENCES des_medio_envio (idMedioEnvio) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_estado FOREIGN KEY (idEstadoEnvio) REFERENCES des_estado_envio (idEstadoEnvio) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_ticket FOREIGN KEY (idTicketAsignado) REFERENCES ticket (idTicket) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_puesto_sucursal FOREIGN KEY (idPuestoPersonalSucursal) REFERENCES puesto (idPuesto) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_tecnico_it FOREIGN KEY (idTecnicoPersonalIT) REFERENCES usuario (idUsuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_creado_por FOREIGN KEY (creadoPor) REFERENCES usuario (idUsuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_envio_equipo_actualizado_por FOREIGN KEY (actualizadoPor) REFERENCES usuario (idUsuario) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB ${schemaCharsetSql}
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notificacion_asignacion (
        idNotificacion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        idUsuario INT(10) UNSIGNED NOT NULL,
        tipo VARCHAR(30) NOT NULL,
        idReferencia INT(10) UNSIGNED NOT NULL,
        idUnidad SMALLINT(5) UNSIGNED NULL,
        creadoPor INT(10) UNSIGNED NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idNotificacion),
        KEY idx_notificacion_usuario_fecha (idUsuario, createdAt, idNotificacion),
        KEY idx_notificacion_referencia (tipo, idReferencia)
      ) ENGINE=InnoDB ${schemaCharsetSql}
    `);
    await conn.execute(`
      UPDATE notificacion_asignacion
         SET tipo = CASE tipo
           WHEN 'TICKET_ASSIGNED' THEN 'TICKET_ASIGNADO'
           WHEN 'ROUTE_ASSIGNED' THEN 'RUTA_ASIGNADA'
           WHEN 'ROUTE_VALIDATED' THEN 'RUTA_VALIDADA'
           ELSE tipo
         END
       WHERE tipo IN ('TICKET_ASSIGNED', 'ROUTE_ASSIGNED', 'ROUTE_VALIDATED')
    `);

    const [envioColumns]: any = await conn.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'envio_equipo'`
    );
    const envioColumnSet = new Set((envioColumns || []).map((row: any) => String(row.COLUMN_NAME)));
    if (!envioColumnSet.has("idMotivoEnvio")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idMotivoEnvio TINYINT(3) UNSIGNED NULL AFTER idTipoEquipo`);
    }
    if (!envioColumnSet.has("nombreSolicitanteEnvio")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN nombreSolicitanteEnvio VARCHAR(100) NULL AFTER idTipoEquipo`);
    }
    if (!envioColumnSet.has("idPuestoSolicitante")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idPuestoSolicitante SMALLINT(5) UNSIGNED NULL AFTER nombreSolicitanteEnvio`);
    }
    if (!envioColumnSet.has("idMedioEnvio")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idMedioEnvio TINYINT(3) UNSIGNED NULL AFTER observaciones`);
    }
    if (!envioColumnSet.has("idEstadoEnvio")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idEstadoEnvio TINYINT(3) UNSIGNED NULL DEFAULT 1 AFTER fechaEnvio`);
    }
    if (!envioColumnSet.has("nombrePiloto")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN nombrePiloto VARCHAR(100) NULL AFTER idMedioEnvio`);
    }
    if (!envioColumnSet.has("telefonoPiloto")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN telefonoPiloto VARCHAR(30) NULL AFTER nombrePiloto`);
    }
    if (!envioColumnSet.has("placaVehiculo")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN placaVehiculo VARCHAR(30) NULL AFTER telefonoPiloto`);
    }
    if (!envioColumnSet.has("nombrePersonalSucursal")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN nombrePersonalSucursal VARCHAR(100) NULL AFTER placaVehiculo`);
    }
    if (!envioColumnSet.has("idPuestoPersonalSucursal")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idPuestoPersonalSucursal SMALLINT(5) UNSIGNED NULL AFTER nombrePersonalSucursal`);
    }
    if (!envioColumnSet.has("idTecnicoPersonalIT")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idTecnicoPersonalIT INT(10) UNSIGNED NULL AFTER idPuestoPersonalSucursal`);
    }
    if (!envioColumnSet.has("idTicketAsignado")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN idTicketAsignado INT(10) UNSIGNED NULL AFTER fechaExtravio`);
    }
    if (!envioColumnSet.has("actualizadoPor")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN actualizadoPor INT(10) UNSIGNED NULL AFTER creadoPor`);
    }
    if (!envioColumnSet.has("createdAt")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN createdAt DATETIME NULL AFTER actualizadoPor`);
      await conn.execute(`UPDATE envio_equipo SET createdAt = IFNULL(createdAt, NOW())`);
    }
    if (!envioColumnSet.has("updatedAt")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN updatedAt DATETIME NULL AFTER createdAt`);
      await conn.execute(`UPDATE envio_equipo SET updatedAt = IFNULL(updatedAt, NOW())`);
    }
    if (!envioColumnSet.has("fechaReparacion")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN fechaReparacion DATETIME NULL AFTER fechaRevision`);
    }
    if (!envioColumnSet.has("fechaEntrega")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN fechaEntrega DATETIME NULL AFTER fechaReparacion`);
    }
    if (!envioColumnSet.has("observacionesEstadoActual")) {
      await conn.execute(`ALTER TABLE envio_equipo ADD COLUMN observacionesEstadoActual TEXT NULL AFTER idEstadoEnvio`);
    }
    if (envioColumnSet.has("motivoEnvio")) {
      await conn.execute(`
        UPDATE envio_equipo
        SET idMotivoEnvio = 1
        WHERE (idMotivoEnvio IS NULL OR idMotivoEnvio = 0)
          AND motivoEnvio IS NOT NULL
          AND (
            UPPER(TRIM(motivoEnvio)) = 'REPARACION'
            OR UPPER(TRIM(motivoEnvio)) = 'REPARACIÓN'
          )
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idMotivoEnvio = 2
        WHERE (idMotivoEnvio IS NULL OR idMotivoEnvio = 0)
          AND motivoEnvio IS NOT NULL
          AND UPPER(TRIM(motivoEnvio)) = 'CAMBIO'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idMotivoEnvio = 3
        WHERE (idMotivoEnvio IS NULL OR idMotivoEnvio = 0)
          AND motivoEnvio IS NOT NULL
          AND UPPER(TRIM(motivoEnvio)) = 'DESALOJO'
      `);
    }
    await conn.execute(`UPDATE envio_equipo SET idMotivoEnvio = IFNULL(idMotivoEnvio, 1)`);

    if (envioColumnSet.has("medioEnvio")) {
      await conn.execute(`
        UPDATE envio_equipo
        SET idMedioEnvio = 1
        WHERE (idMedioEnvio IS NULL OR idMedioEnvio = 0)
          AND medioEnvio = 'CAMION'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idMedioEnvio = 2
        WHERE (idMedioEnvio IS NULL OR idMedioEnvio = 0)
          AND medioEnvio = 'PERSONAL_SUCURSAL'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idMedioEnvio = 3
        WHERE (idMedioEnvio IS NULL OR idMedioEnvio = 0)
          AND medioEnvio = 'PERSONAL_IT'
      `);
    }
    await conn.execute(`UPDATE envio_equipo SET idMedioEnvio = IFNULL(idMedioEnvio, 3)`);

    if (envioColumnSet.has("estadoActual")) {
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 1
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'ENVIADO'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 2
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'RECIBIDO'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 6
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'EN_REVISION'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 4
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'REPARADO'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 5
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'ENTREGADO'
      `);
      await conn.execute(`
        UPDATE envio_equipo
        SET idEstadoEnvio = 3
        WHERE (idEstadoEnvio IS NULL OR idEstadoEnvio = 0)
          AND estadoActual = 'EXTRAVIADO'
      `);
    }
    await conn.execute(`UPDATE envio_equipo SET idEstadoEnvio = IFNULL(idEstadoEnvio, 1)`);

    // Corrección final: alinear migraciones legacy con los IDs reales del catálogo activo.
    // Esto evita depender de IDs fijos cuando la base ya existente usa otro orden.
    const motivoEnvioIdsByKey = await loadCatalogIdByKeyMap(conn, "des_motivo_envio", "idMotivoEnvio");
    const medioEnvioIdsByKey = await loadCatalogIdByKeyMap(conn, "des_medio_envio", "idMedioEnvio");
    const estadoEnvioIdsByKey = await loadCatalogIdByKeyMap(conn, "des_estado_envio", "idEstadoEnvio");

    const idMotivoReparacion = Number(motivoEnvioIdsByKey.get("REPARACION") || 0) || 0;
    const idMotivoCambio = Number(motivoEnvioIdsByKey.get("CAMBIO") || 0) || 0;
    const idMotivoDesalojo = Number(motivoEnvioIdsByKey.get("DESALOJO") || 0) || 0;
    const idMedioCamion = Number(medioEnvioIdsByKey.get("CAMION") || 0) || 0;
    const idMedioPersonalSucursal = Number(medioEnvioIdsByKey.get("PERSONAL_SUCURSAL") || 0) || 0;
    const idMedioPersonalIt = Number(medioEnvioIdsByKey.get("PERSONAL_IT") || 0) || 0;
    const idEstadoEnviado = Number(estadoEnvioIdsByKey.get("ENVIADO") || 0) || 0;
    const idEstadoRecibido = Number(estadoEnvioIdsByKey.get("RECIBIDO") || 0) || 0;
    const idEstadoEnRevision = Number(estadoEnvioIdsByKey.get("EN_REVISION") || 0) || 0;
    const idEstadoReparado = Number(estadoEnvioIdsByKey.get("REPARADO") || 0) || 0;
    const idEstadoEntregado = Number(estadoEnvioIdsByKey.get("ENTREGADO") || 0) || 0;
    const idEstadoExtraviado = Number(estadoEnvioIdsByKey.get("EXTRAVIADO") || 0) || 0;

    if (envioColumnSet.has("motivoEnvio")) {
      if (idMotivoReparacion) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMotivoEnvio = ?
           WHERE motivoEnvio IS NOT NULL
             AND (
               UPPER(TRIM(motivoEnvio)) = 'REPARACION'
               OR UPPER(TRIM(motivoEnvio)) = 'REPARACIÓN'
             )`,
          [idMotivoReparacion]
        );
      }
      if (idMotivoCambio) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMotivoEnvio = ?
           WHERE motivoEnvio IS NOT NULL
             AND UPPER(TRIM(motivoEnvio)) = 'CAMBIO'`,
          [idMotivoCambio]
        );
      }
      if (idMotivoDesalojo) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMotivoEnvio = ?
           WHERE motivoEnvio IS NOT NULL
             AND UPPER(TRIM(motivoEnvio)) = 'DESALOJO'`,
          [idMotivoDesalojo]
        );
      }
    }
    if (idMotivoReparacion) {
      await conn.execute(`UPDATE envio_equipo SET idMotivoEnvio = IFNULL(idMotivoEnvio, ?)`, [idMotivoReparacion]);
    }

    if (envioColumnSet.has("medioEnvio")) {
      if (idMedioCamion) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMedioEnvio = ?
           WHERE medioEnvio = 'CAMION'`,
          [idMedioCamion]
        );
      }
      if (idMedioPersonalSucursal) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMedioEnvio = ?
           WHERE medioEnvio = 'PERSONAL_SUCURSAL'`,
          [idMedioPersonalSucursal]
        );
      }
      if (idMedioPersonalIt) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idMedioEnvio = ?
           WHERE medioEnvio = 'PERSONAL_IT'`,
          [idMedioPersonalIt]
        );
      }
    }
    if (idMedioPersonalIt) {
      await conn.execute(`UPDATE envio_equipo SET idMedioEnvio = IFNULL(idMedioEnvio, ?)`, [idMedioPersonalIt]);
    }

    if (envioColumnSet.has("estadoActual")) {
      if (idEstadoEnviado) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'ENVIADO'`,
          [idEstadoEnviado]
        );
      }
      if (idEstadoRecibido) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'RECIBIDO'`,
          [idEstadoRecibido]
        );
      }
      if (idEstadoEnRevision) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'EN_REVISION'`,
          [idEstadoEnRevision]
        );
      }
      if (idEstadoReparado) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'REPARADO'`,
          [idEstadoReparado]
        );
      }
      if (idEstadoEntregado) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'ENTREGADO'`,
          [idEstadoEntregado]
        );
      }
      if (idEstadoExtraviado) {
        await conn.execute(
          `UPDATE envio_equipo
           SET idEstadoEnvio = ?
           WHERE estadoActual = 'EXTRAVIADO'`,
          [idEstadoExtraviado]
        );
      }
    }
    if (idEstadoEnviado) {
      await conn.execute(`UPDATE envio_equipo SET idEstadoEnvio = IFNULL(idEstadoEnvio, ?)`, [idEstadoEnviado]);
    }

    await ensureTableIndex(conn, {
      tableName: "envio_equipo",
      indexName: "idx_envio_equipo_puesto_solicitante",
      columns: ["idPuestoSolicitante"]
    });
    await ensureNullableUniqueTableIndex(conn, {
      tableName: "envio_equipo",
      indexName: "uq_envio_equipo_ticket_asignado",
      columnName: "idTicketAsignado"
    });

    if (envioColumnSet.has("motivoEnvio")) {
      await conn.execute(`
        ALTER TABLE envio_equipo
        MODIFY COLUMN motivoEnvio VARCHAR(160) NULL
      `);
    }
    if (envioColumnSet.has("medioEnvio")) {
      await conn.execute(`
        ALTER TABLE envio_equipo
        MODIFY COLUMN medioEnvio ENUM('CAMION','PERSONAL_SUCURSAL','PERSONAL_IT') NULL
      `);
    }
    if (envioColumnSet.has("estadoActual")) {
      await conn.execute(`
        ALTER TABLE envio_equipo
        MODIFY COLUMN estadoActual ENUM('ENVIADO','RECIBIDO','EN_REVISION','REPARADO','ENTREGADO','EXTRAVIADO') NULL
      `);
    }

    await conn.execute(`
      INSERT IGNORE INTO rol_permiso (idRol, idPermiso)
      SELECT r.idRol, p.idPermiso
      FROM rol r
      JOIN permiso p ON p.code = 'ENVIO_EQUIPO_VER'
      WHERE r.nombre IN ('ADMIN','GERENCIAL','ANALISTA','SUPERVISOR')
    `);
    await conn.execute(`
      INSERT IGNORE INTO rol_permiso (idRol, idPermiso)
      SELECT r.idRol, p.idPermiso
      FROM rol r
      JOIN permiso p ON p.code = 'ENVIO_EQUIPO_CREAR'
      WHERE r.nombre IN ('ADMIN','GERENCIAL')
    `);
    await conn.execute(`
      INSERT IGNORE INTO rol_permiso (idRol, idPermiso)
      SELECT r.idRol, p.idPermiso
      FROM rol r
      JOIN permiso p ON p.code = 'ENVIO_EQUIPO_ACTUALIZAR'
      WHERE r.nombre IN ('ADMIN','ANALISTA','SUPERVISOR')
    `);

    await ensureSeededCatalogTable(conn, {
      preferredName: RUTA_REVIEW_CATALOG_TABLE,
      aliases: RUTA_REVIEW_CATALOG_COMPAT_TABLES,
      createSql: `
        CREATE TABLE IF NOT EXISTS ${RUTA_REVIEW_CATALOG_TABLE} (
          idCatalogoEquipoRevisadoR TINYINT(3) UNSIGNED NOT NULL,
          clave VARCHAR(60) NOT NULL,
          nombre VARCHAR(120) NOT NULL,
          orden TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
          activo TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (idCatalogoEquipoRevisadoR),
          UNIQUE KEY uq_cer_clave (clave)
        ) ENGINE=InnoDB ${schemaCharsetSql}
      `,
      idColumn: "idCatalogoEquipoRevisadoR",
      seedRows: RUTA_REVIEW_CATALOG_SEED.map((item) => ({
        id: item.idCatalogoEquipoRevisadoR,
        clave: item.clave,
        nombre: item.nombre,
        orden: item.orden
      })),
      keyMode: "lower"
    });

    const preferredRutaReviewTable = await resolveExistingTableName(conn, RUTA_REVIEW_DETAIL_TABLE);
    let rutaReviewTable =
      preferredRutaReviewTable ||
      (await resolveExistingTableName(conn, RUTA_REVIEW_DETAIL_TABLE, RUTA_REVIEW_DETAIL_COMPAT_TABLES));

    if (!preferredRutaReviewTable) {
      await conn.execute(`
        CREATE TABLE ${RUTA_REVIEW_DETAIL_TABLE} (
          idEquipoRevisadoRuta INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
          idRuta INT(10) UNSIGNED NOT NULL,
          idCatalogoEquipoRevisadoR TINYINT(3) UNSIGNED NOT NULL,
          cantidad INT(10) UNSIGNED NOT NULL DEFAULT 0,
          validado TINYINT(1) NOT NULL DEFAULT 0,
          PRIMARY KEY (idEquipoRevisadoRuta),
          UNIQUE KEY uq_errr_ruta_equipo (idRuta, idCatalogoEquipoRevisadoR),
          KEY idx_errr_ruta (idRuta),
          KEY idx_errr_equipo (idCatalogoEquipoRevisadoR),
          KEY idx_errr_validado (validado),
          CONSTRAINT fk_errr_ruta
            FOREIGN KEY (idRuta) REFERENCES ruta (idRuta)
            ON DELETE CASCADE
            ON UPDATE RESTRICT,
          CONSTRAINT fk_errr_equipo
            FOREIGN KEY (idCatalogoEquipoRevisadoR) REFERENCES ${RUTA_REVIEW_CATALOG_TABLE} (idCatalogoEquipoRevisadoR)
            ON DELETE RESTRICT
            ON UPDATE RESTRICT
        ) ENGINE=InnoDB ${schemaCharsetSql}
      `);
    }
    if (!rutaReviewTable) rutaReviewTable = RUTA_REVIEW_DETAIL_TABLE;

    if (rutaReviewTable !== RUTA_REVIEW_DETAIL_TABLE) {
      await conn.execute(`
        INSERT IGNORE INTO ${RUTA_REVIEW_DETAIL_TABLE}
          (idRuta, idCatalogoEquipoRevisadoR, cantidad, validado)
        SELECT
          idRuta,
          idCatalogoEquipoRevisadoR,
          cantidad,
          validado
        FROM ${rutaReviewTable}
      `);
      rutaReviewTable = RUTA_REVIEW_DETAIL_TABLE;
    }

    const [legacyCatalog]: any = await conn.execute(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'des_equipo_revisado_ruta'
       LIMIT 1`
    );

    if (legacyCatalog?.length) {
      await conn.execute(`
        INSERT IGNORE INTO ${RUTA_REVIEW_CATALOG_TABLE}
          (idCatalogoEquipoRevisadoR, clave, nombre, orden, activo)
        SELECT
          idEquipoRevisadoRuta,
          clave,
          nombre,
          orden,
          activo
        FROM des_equipo_revisado_ruta
      `);
    }

    const [legacyReviewTable]: any = await conn.execute(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'equipos_revisados_ruta'
       LIMIT 1`
    );

    if (legacyReviewTable?.length) {
      await conn.execute(`
        INSERT IGNORE INTO ${rutaReviewTable}
          (idRuta, idCatalogoEquipoRevisadoR, cantidad, validado)
        SELECT
          idRuta,
          idEquipoRevisadoRuta,
          cantidad,
          validado
        FROM equipos_revisados_ruta
      `);
    }

    const [legacyRutaColumn]: any = await conn.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'ruta'
         AND COLUMN_NAME = 'detalleRevisionEquipos'
       LIMIT 1`
    );

    const rutaReviewByKey: Map<string, (typeof RUTA_REVIEW_CATALOG_SEED)[number]> = new Map(
      RUTA_REVIEW_CATALOG_SEED.map((item) => [item.clave, item] as const)
    );

    if (legacyRutaColumn?.length) {
      const [legacyRouteRows]: any = await conn.execute(
        `SELECT r.idRuta, r.detalleRevisionEquipos
         FROM ruta r
         WHERE r.detalleRevisionEquipos IS NOT NULL
           AND TRIM(r.detalleRevisionEquipos) <> ''
           AND NOT EXISTS (
             SELECT 1
             FROM ${rutaReviewTable} err
             WHERE err.idRuta = r.idRuta
           )`
      );

      for (const routeRow of legacyRouteRows || []) {
        let parsed: any;
        try {
          parsed = JSON.parse(String(routeRow.detalleRevisionEquipos || ""));
        } catch {
          parsed = null;
        }

        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
            ? parsed.items
            : [];

        for (const rawItem of items) {
          const key = String(rawItem?.key || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
          const catalog = rutaReviewByKey.get(key);
          if (!catalog) continue;

          const cantidad = Math.max(0, Math.trunc(Number(rawItem?.valor ?? rawItem?.value ?? 0) || 0));
          const validado = rawItem?.validado ? 1 : 0;

          await conn.execute(
            `INSERT IGNORE INTO ${rutaReviewTable}
              (idRuta, idCatalogoEquipoRevisadoR, cantidad, validado)
             VALUES (?,?,?,?)`,
            [routeRow.idRuta, catalog.idCatalogoEquipoRevisadoR, cantidad, validado]
          );
        }
      }

      await conn.execute(
        `UPDATE ruta
         SET detalleRevisionEquipos = NULL
         WHERE detalleRevisionEquipos IS NOT NULL
           AND TRIM(detalleRevisionEquipos) <> ''`
      );
    }

    if (legacyReviewTable?.length) {
      await conn.execute(`DROP TABLE IF EXISTS equipos_revisados_ruta`);
    }

    if (legacyCatalog?.length) {
      await conn.execute(`DROP TABLE IF EXISTS des_equipo_revisado_ruta`);
    }

    if (legacyRutaColumn?.length) {
      await conn.execute(`ALTER TABLE ruta DROP COLUMN detalleRevisionEquipos`);
    }

    // Refuerzo minimo para reportes productivos: los puentes ya tienen PK/indices utiles,
    // pero tickets y rutas calificadas filtran siempre por estado + rango de fecha.
    await ensureTableIndex(conn, {
      tableName: "ticket",
      indexName: "idx_ticket_estado_calificacion_fecha",
      columns: ["idEstadoCalificacion", "fechaApertura"]
    });
    await ensureTableIndex(conn, {
      tableName: "ruta",
      indexName: "idx_ruta_estado_calificacion_fecha",
      columns: ["idEstadoCalificacion", "fechaApertura"]
    });

    schemaEnsured = true;
  })();

  return schemaEnsurePromise;
}

class OdbcConnectionAdapter implements DbConnection {
  constructor(private readonly connection: any) {}

  private normalizeResultValues(result: any) {
    if (!Array.isArray(result)) return result;
    return result.map((sourceRow: any) => {
      if (!sourceRow || typeof sourceRow !== "object") return sourceRow;
      const row: Record<string, any> = {};
      for (const key of Object.keys(sourceRow)) {
        const value = sourceRow[key];
        if (typeof value === "bigint") {
          const numericValue = Number(value);
          row[key] = Number.isSafeInteger(numericValue) ? numericValue : value.toString();
        } else if (Buffer.isBuffer(value)) {
          row[key] = value.toString("utf8");
        } else if (value instanceof Date) {
          row[key] = new Date(value.getTime());
        } else {
          row[key] = value;
        }
      }
      return row;
    });
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    let result: any;
    try {
      result = await this.connection.query(sql, params);
    } catch (error: any) {
      const details = Array.isArray(error?.odbcErrors)
        ? error.odbcErrors.map((item: any) => String(item?.message || "").trim()).filter(Boolean)
        : [];
      throw new Error(details.join(" | ") || error?.message || "Error ejecutando consulta ODBC.");
    }
    const columns = (result as any)?.columns;
    const isResultSet = Array.isArray(result) && Array.isArray(columns) && columns.length > 0;
    if (isResultSet || /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i.test(sql)) {
      return [this.normalizeResultValues(result) as T, columns || []];
    }

    const header: any = {
      affectedRows: Math.max(0, Number(result?.count ?? 0) || 0),
      insertId: 0
    };

    if (/^\s*INSERT\b/i.test(sql)) {
      const idRows: any = await this.connection.query("SELECT LAST_INSERT_ID() AS insertId");
      header.insertId = Number(idRows?.[0]?.insertId ?? idRows?.[0]?.INSERT_ID ?? 0) || 0;
    }

    return [header as T, []];
  }

  beginTransaction() { return this.connection.beginTransaction(); }
  commit() { return this.connection.commit(); }
  rollback() { return this.connection.rollback(); }
  release() { return this.connection.close(); }
}

async function getDatabasePool(): Promise<any> {
  if (odbcPool) return odbcPool;

  const cfg = loadMysqlConfig();
  poolCharset = normalizeMysqlCharset(cfg.charset || "utf8");
  schemaAutoMigrate = false;
  const connectionLimit = Math.max(4, Math.min(40, Number(cfg.connectionLimit || 12) || 12));
  const connectTimeout = Math.max(5000, Number(cfg.connectTimeout || 15000) || 15000);

  const envName = String(cfg.odbcConnectionStringEnv || "SOPORTE_ODBC_CONNECTION").trim();
  const connectionString = String(process.env[envName] || "").trim() || `DSN=${String(cfg.odbcDsn || "Tickets_IT").trim()}`;
  const imported: any = await import("odbc");
  const odbc: any = imported.default || imported;
  odbcPool = await odbc.pool({
    connectionString,
    connectionTimeout: Math.ceil(connectTimeout / 1000),
    loginTimeout: Math.ceil(connectTimeout / 1000),
    initialSize: 1,
    incrementSize: 1,
    maxSize: connectionLimit,
    reuseConnections: true
  });

  return odbcPool;
}

export async function closePool(): Promise<void> {
  await databaseOperationTail;
  const currentOdbcPool = odbcPool;
  odbcPool = null;
  schemaEnsured = false;
  schemaEnsurePromise = null;
  poolCharset = "utf8";
  schemaAutoMigrate = false;
  initializedConnections = new WeakSet<object>();
  assignmentNotificationSchemaReady = false;

  try {
    if (currentOdbcPool) await currentOdbcPool.close();
  } catch {
    // No bloquear el cierre de la app si la BD ya no responde.
  }
}

export async function initConnection(conn: DbConnection): Promise<void> {
  if (initializedConnections.has(conn as object)) return;

  const attempts: Array<{ charset: SupportedMysqlCharset; collation: string }> =
    poolCharset === "utf8mb4"
      ? [
          { charset: "utf8mb4", collation: "utf8mb4_unicode_ci" },
          { charset: "utf8", collation: "utf8_general_ci" }
        ]
      : [
          { charset: "utf8", collation: "utf8_general_ci" }
        ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      await conn.execute(`SET NAMES ${attempt.charset} COLLATE ${attempt.collation}`);
      poolCharset = attempt.charset;
      initializedConnections.add(conn as object);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo inicializar la codificacion de la conexion.");
}

export async function withConn<T>(fn: (conn: DbConnection) => Promise<T>): Promise<T> {
  const releaseTurn = await acquireDatabaseTurn();
  let conn: DbConnection | null = null;
  try {
    const selectedPool = await getDatabasePool();
    const rawConnection = await selectedPool.connect();
    conn = new OdbcConnectionAdapter(rawConnection);
    // Asegurar charset utf8 en cada conexion
    await initConnection(conn);
    // Las migraciones modifican estructura; se ejecutan solo si appsettings.mysql.autoMigrate=true.
    if (schemaAutoMigrate) {
      await ensureSchema(conn);
    }
    return await fn(conn);
  } finally {
    try {
      if (conn) {
        await conn.release();
      }
    } finally {
      releaseTurn();
    }
  }
}
