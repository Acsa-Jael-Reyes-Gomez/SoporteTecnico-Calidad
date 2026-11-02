const test = require("node:test");
const assert = require("node:assert/strict");
const { createSyntheticDatabase } = require("./helpers/synthetic-database");
const { SqliteConnection } = require("../dist/main/db/sqlite_connection");
const sessions = require("../dist/main/session_store");

function setup(t) {
  const fixture = createSyntheticDatabase();
  const db = fixture.db;
  db.function("NOW", () => fixture.identity.date);
  const connection = new SqliteConnection(db);
  sessions.clearAllTrustedSessions();
  t.after(() => { sessions.clearAllTrustedSessions(); fixture.cleanup(); });
  const event = { sender: { id: 901 } };
  const session = { idUsuario: 1, usuario: fixture.identity.username, nombre: "Admin ficticio",
    idRol: 1, rol: "ADMIN", unidades: [{ idUnidad: 1 }],
    permisos: ["RUTAS_CREAR", "RUTAS_EDITAR", "RUTAS_BORRAR", "RUTAS_CERRAR", "RUTAS_REABRIR", "RUTAS_VER_TODAS"] };
  sessions.setTrustedSession(event, session);
  const dbPath = require.resolve("../dist/main/db/db");
  const modulePath = require.resolve("../dist/main/ipc_rutas");
  const previousDb = require.cache[dbPath];
  const previousModule = require.cache[modulePath];
  const handlers = new Map();
  try {
    // Notification tables/indexes already come from the versioned fixture schema.
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
      withConn: async (fn) => fn(connection), ensureAssignmentNotificationSchema: async () => {},
    } };
    delete require.cache[modulePath];
    require(modulePath).registerRutasHandlers({ handle: (name, handler) => handlers.set(name, handler) });
  } finally {
    if (previousDb) require.cache[dbPath] = previousDb; else delete require.cache[dbPath];
    if (previousModule) require.cache[modulePath] = previousModule; else delete require.cache[modulePath];
  }
  const data = { idUnidad: 1, fechaApertura: fixture.identity.date, observaciones: "Visita ficticia SQA", participantes: [2] };
  const invoke = (channel, ...args) => handlers.get(channel)(event, null, ...args);
  return { db, event, session, data, invoke, async create() {
    const response = await invoke("rutas:create", data);
    assert.equal(response.ok, true, response.message);
    return response.idRuta;
  } };
}

test("rutas:create persiste ruta, participante y notificación con claves válidas", async (t) => {
  const h = setup(t);
  const id = await h.create();
  const row = h.db.prepare("SELECT * FROM ruta WHERE idRuta=?").get(id);
  assert.equal(row.idUnidad, 1);
  assert.equal(row.idTipoRuta, 2);
  assert.equal(row.observaciones, h.data.observaciones);
  assert.equal(row.fechaCierre, null);
  assert.equal(h.db.prepare("SELECT idTecnico FROM ruta_participante WHERE idRuta=?").get(id).idTecnico, 2);
  assert.equal(h.db.prepare("SELECT idUsuario FROM notificacion_asignacion WHERE tipo='RUTA_ASIGNADA' AND idReferencia=?").get(id).idUsuario, 2);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("rutas:create rechaza campos y referencias inválidas sin persistencia parcial", async (t) => {
  const h = setup(t);
  for (const changes of [{ idUnidad: 0 }, { fechaApertura: "" }, { participantes: [] }, { idUnidad: 999 }, { participantes: [999] }]) {
    const result = await h.invoke("rutas:create", { ...h.data, ...changes });
    assert.equal(result.ok, false);
    assert.ok(result.message);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta").get().n, 0);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta_participante").get().n, 0);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM notificacion_asignacion").get().n, 0);
  }
});

test("rutas:create hace rollback cuando falla una notificación después de insertar ruta y participante", async (t) => {
  const h = setup(t);
  h.db.exec("CREATE TEMP TRIGGER fail_route_notice BEFORE INSERT ON notificacion_asignacion BEGIN SELECT RAISE(ABORT, 'synthetic notification failure'); END;");
  const result = await h.invoke("rutas:create", h.data);
  assert.equal(result.ok, false);
  assert.match(result.message, /synthetic notification failure/);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta").get().n, 0);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta_participante").get().n, 0);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("rutas:list busca por ID y texto, filtra y limita al participante autenticado", async (t) => {
  const h = setup(t);
  const id = await h.create();
  const filters = { desde: "2026-01-01", hasta: "2026-12-31", pageSize: 10 };
  const found = await h.invoke("rutas:list", { ...filters, q: String(id) });
  assert.equal(found.ok, true, found.message);
  assert.equal(found.total, 1);
  assert.equal(found.data[0].idRuta, id);
  const text = await h.invoke("rutas:list", { ...filters, q: "Visita ficticia", idUnidad: 1, idTecnico: 2 });
  assert.equal(text.total, 1);
  const missing = await h.invoke("rutas:list", { ...filters, q: "999" });
  assert.equal(missing.ok, true, missing.message);
  assert.deepEqual(missing.data, []);
  sessions.setTrustedSession(h.event, { ...h.session, idUsuario: 2, rol: "TECNICO", permisos: [] });
  assert.equal((await h.invoke("rutas:list", filters)).total, 1);
  sessions.setTrustedSession(h.event, { ...h.session, rol: "TECNICO", permisos: [] });
  assert.equal((await h.invoke("rutas:list", filters)).total, 0);
});

test("rutas:create exige permiso y sesión; rutas:close conserva cierre manual deshabilitado", async (t) => {
  const h = setup(t);
  assert.match((await h.invoke("rutas:close")).message, /Cierre manual deshabilitado/);
  sessions.setTrustedSession(h.event, { ...h.session, permisos: [] });
  assert.match((await h.invoke("rutas:create", h.data)).message, /Sin permiso/);
  sessions.clearTrustedSession(h.event);
  assert.match((await h.invoke("rutas:create", h.data)).message, /Sesión inválida/);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta").get().n, 0);
});

test("rutas:update persiste cambios y rechaza identificador inexistente", async (t) => {
  const h = setup(t);
  const id = await h.create();
  const result = await h.invoke("rutas:update", { ...h.data, idRuta: id, observaciones: "Cambio ficticio" });
  assert.equal(result.ok, true, result.message);
  assert.equal(h.db.prepare("SELECT observaciones FROM ruta WHERE idRuta=?").get(id).observaciones, "Cambio ficticio");
  assert.match((await h.invoke("rutas:update", { ...h.data, idRuta: 999 })).message, /Ruta no existe/);
});

test("rutas:delete elimina ruta y participantes conservando integridad", async (t) => {
  const h = setup(t);
  const id = await h.create();
  const result = await h.invoke("rutas:delete", id);
  assert.equal(result.ok, true, result.message);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta").get().n, 0);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ruta_participante").get().n, 0);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("rutas:reopen reabre ruta cerrada pendiente de validación y rechaza repetición", async (t) => {
  const h = setup(t);
  const id = await h.create();
  h.db.prepare("UPDATE ruta SET open=1, fechaCierre=? WHERE idRuta=?").run("2026-10-27 10:00:00", id);
  const result = await h.invoke("rutas:reopen", id);
  assert.equal(result.ok, true, result.message);
  const row = h.db.prepare("SELECT open, fechaCierre FROM ruta WHERE idRuta=?").get(id);
  assert.equal(row.open, 0);
  assert.equal(row.fechaCierre, null);
  assert.match((await h.invoke("rutas:reopen", id)).message, /Ya está abierta/);
});
