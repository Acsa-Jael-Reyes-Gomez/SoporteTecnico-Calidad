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
  const event = { sender: { id: 701 } };
  const session = { idUsuario: 1, usuario: fixture.identity.username, nombre: "Admin ficticio",
    idRol: 1, rol: "ADMIN", unidades: [{ idUnidad: 1 }],
    permisos: ["TICKETS_CREAR", "TICKETS_EDITAR", "TICKETS_CERRAR", "TICKETS_REABRIR", "TICKETS_BORRAR", "TICKETS_VER_TODOS"] };
  sessions.setTrustedSession(event, session);
  const dbPath = require.resolve("../dist/main/db/db");
  const electronPath = require.resolve("electron");
  const modulePath = require.resolve("../dist/main/ipc_tickets");
  const paths = [dbPath, electronPath, modulePath];
  const previous = paths.map((p) => require.cache[p]);
  const handlers = new Map();
  try {
    // The fixture already applies the exact versioned notification schema.
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
      withConn: async (fn) => fn(connection),
      ensureAssignmentNotificationSchema: async () => {},
    } };
    require.cache[electronPath] = { id: electronPath, filename: electronPath, loaded: true,
      exports: { app: { isPackaged: true } } };
    delete require.cache[modulePath];
    require(modulePath).registerTicketsHandlers({ handle: (name, fn) => handlers.set(name, fn) });
  } finally {
    paths.forEach((p, i) => { if (previous[i]) require.cache[p] = previous[i]; else delete require.cache[p]; });
  }
  const data = { nombreSolicitante: "Solicitante CRUD ficticio", idPuesto: 1, idUnidad: 1,
    idServicio: 1, fechaApertura: fixture.identity.date, tecnicos: [2] };
  return { db, session, event, data,
    invoke: (channel, ...args) => handlers.get(channel)(event, null, ...args) };
}

test("tickets:create persiste ticket, técnico y notificación con relaciones válidas", async (t) => {
  const h = setup(t);
  const result = await h.invoke("tickets:create", h.data);
  assert.equal(result.ok, true, result.message);
  const row = h.db.prepare("SELECT * FROM ticket WHERE idTicket=?").get(result.idTicket);
  assert.equal(row.nombreSolicitante, h.data.nombreSolicitante);
  assert.equal(row.creadoPor, 1);
  assert.equal(row.idClasificacion, 1);
  assert.equal(h.db.prepare("SELECT idTecnico FROM ticket_tecnico WHERE idTicket=?").get(result.idTicket).idTecnico, 2);
  assert.equal(h.db.prepare("SELECT idUsuario FROM notificacion_asignacion WHERE idReferencia=?").get(result.idTicket).idUsuario, 2);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("tickets:create rechaza campos requeridos y referencias inexistentes sin escrituras parciales", async (t) => {
  const h = setup(t);
  for (const change of [{ nombreSolicitante: "" }, { tecnicos: [] }, { idUnidad: 999 }, { idServicio: 999 }]) {
    const response = await h.invoke("tickets:create", { ...h.data, ...change });
    assert.equal(response.ok, false);
    assert.ok(response.message);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket").get().n, 1);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket_tecnico").get().n, 1);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM notificacion_asignacion").get().n, 0);
  }
});

test("tickets:create revierte ticket, asignaciones y notificaciones al fallar una clave única", async (t) => {
  const h = setup(t);
  const result = await h.invoke("tickets:create", { ...h.data, tecnicos: [2, 2] });
  assert.equal(result.ok, false);
  assert.match(result.message, /UNIQUE/);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket").get().n, 1);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM notificacion_asignacion").get().n, 0);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal((await h.invoke("tickets:create", h.data)).ok, true);
});

test("tickets:list consulta por ID, busca texto y filtra sin inventar un endpoint de detalle", async (t) => {
  const h = setup(t);
  const filters = { desde: "2026-01-01", hasta: "2026-12-31", page: 1, pageSize: 10 };
  const found = await h.invoke("tickets:list", { ...filters, q: "1" });
  assert.equal(found.ok, true, found.message);
  assert.equal(found.total, 1);
  assert.equal(found.data[0].idTicket, 1);
  assert.equal(found.data[0].tecnicos[0].idUsuario, 2);
  const missing = await h.invoke("tickets:list", { ...filters, q: "999" });
  assert.equal(missing.ok, true, missing.message);
  assert.deepEqual(missing.data, []);
  const text = await h.invoke("tickets:list", { ...filters, q: "Solicitante ficticio", estado: "ABIERTO", idServicio: 1 });
  assert.equal(text.total, 1);
  const closed = await h.invoke("tickets:list", { ...filters, estado: "CERRADO" });
  assert.equal(closed.total, 0);
});

test("tickets:create rechaza permiso ausente y sesión inexistente sin persistir", async (t) => {
  const h = setup(t);
  sessions.setTrustedSession(h.event, { ...h.session, permisos: [] });
  assert.match((await h.invoke("tickets:create", h.data)).message, /Sin permiso/);
  sessions.clearTrustedSession(h.event);
  assert.match((await h.invoke("tickets:create", h.data)).message, /Sesión inválida/);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket").get().n, 1);
});

test("tickets:update persiste campos permitidos y rechaza datos obligatorios inválidos", async (t) => {
  const h = setup(t);
  assert.equal((await h.invoke("tickets:update", { ...h.data, idTicket: 1, nombreSolicitante: "" })).ok, false);
  const response = await h.invoke("tickets:update", { ...h.data, idTicket: 1, nombreSolicitante: "Solicitante actualizado ficticio" });
  assert.equal(response.ok, true, response.message);
  assert.equal(h.db.prepare("SELECT nombreSolicitante FROM ticket WHERE idTicket=1").get().nombreSolicitante, "Solicitante actualizado ficticio");
});

test("tickets:close cierra un ticket abierto y rechaza repetir el cierre", async (t) => {
  const h = setup(t);
  for (const [index, key] of ["REPARADO", "ENTREGADO", "EXTRAVIADO"].entries()) {
    h.db.prepare("INSERT INTO des_estado_envio (idEstadoEnvio, clave, nombre) VALUES (?, ?, ?)").run(index + 1, key, key);
  }
  const response = await h.invoke("tickets:close", 1, "2026-10-27 10:00:00", "Solución ficticia");
  assert.equal(response.ok, true, response.message);
  assert.equal(h.db.prepare("SELECT solucion FROM ticket WHERE idTicket=1").get().solucion, "Solución ficticia");
  assert.equal((await h.invoke("tickets:close", 1, "2026-10-27 10:00:00", "Solución ficticia")).ok, false);
});

test("tickets:delete elimina ticket y asignaciones sin dejar referencias inválidas", async (t) => {
  const h = setup(t);
  const response = await h.invoke("tickets:delete", 1);
  assert.equal(response.ok, true, response.message);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket").get().n, 0);
  assert.equal(h.db.prepare("SELECT count(*) AS n FROM ticket_tecnico").get().n, 0);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("tickets:update revierte campos y asignaciones si falla una referencia después de escribir", async (t) => {
  const h = setup(t);
  const before = h.db.prepare("SELECT * FROM ticket WHERE idTicket=1").get();
  const assignments = h.db.prepare("SELECT * FROM ticket_tecnico WHERE idTicket=1").all();
  const response = await h.invoke("tickets:update", {
    ...h.data, idTicket: 1, nombreSolicitante: "Cambio ficticio que debe revertirse", tecnicos: [999],
  });
  assert.equal(response.ok, false);
  assert.match(response.message, /FOREIGN KEY/i);
  assert.deepEqual(h.db.prepare("SELECT * FROM ticket WHERE idTicket=1").get(), before);
  assert.deepEqual(h.db.prepare("SELECT * FROM ticket_tecnico WHERE idTicket=1").all(), assignments);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
  // A subsequent valid write also proves that rollback released the transaction.
  const retry = await h.invoke("tickets:update", { ...h.data, idTicket: 1 });
  assert.equal(retry.ok, true, retry.message);
});

test("tickets:reopen persiste reapertura y rechaza repetirla", async (t) => {
  const h = setup(t);
  for (const [id, key] of [[1, "EN_REVISION"], [2, "REPARADO"]]) {
    h.db.prepare("INSERT INTO des_estado_envio (idEstadoEnvio, clave, nombre) VALUES (?, ?, ?)").run(id, key, key);
  }
  h.db.prepare("UPDATE ticket SET fechaCierre=? WHERE idTicket=1").run("2026-10-27 10:00:00");
  const response = await h.invoke("tickets:reopen", 1);
  assert.equal(response.ok, true, response.message);
  assert.equal(h.db.prepare("SELECT fechaCierre FROM ticket WHERE idTicket=1").get().fechaCierre, null);
  assert.match((await h.invoke("tickets:reopen", 1)).message, /Ya está abierto/);
});

test("tickets:setClasificacion persiste clasificación y extraordinario; rechaza permiso y referencia inválidos", async (t) => {
  const h = setup(t);
  h.db.prepare("INSERT INTO des_clasificacion (idClasificacion, nombre) VALUES (2, 'EXTRAORDINARIO')").run();
  assert.match((await h.invoke("tickets:setClasificacion", 1, 2)).message, /Sin permiso/);
  sessions.setTrustedSession(h.event, { ...h.session, permisos: [...h.session.permisos, "CALIFICACION_TICKETS"] });
  assert.match((await h.invoke("tickets:setClasificacion", 1, 999)).message, /Clasificación inválida/);
  assert.equal(h.db.prepare("SELECT idClasificacion FROM ticket WHERE idTicket=1").get().idClasificacion, 1);
  const response = await h.invoke("tickets:setClasificacion", 1, 2);
  assert.equal(response.ok, true, response.message);
  const row = h.db.prepare("SELECT idClasificacion, casoExtraordinario FROM ticket WHERE idTicket=1").get();
  assert.equal(row.idClasificacion, 2);
  assert.equal(row.casoExtraordinario, 1);
});

test("tickets:calificar exige cierre y técnico; persiste calificación y bloquea repetición, reclasificación y reapertura", async (t) => {
  const h = setup(t);
  h.db.prepare("INSERT INTO des_estado_calificacion (idEstadoCalificacion, nombre) VALUES (1, 'CALIFICADO')").run();
  sessions.setTrustedSession(h.event, { ...h.session, permisos: [...h.session.permisos, "CALIFICACION_TICKETS"] });
  assert.match((await h.invoke("tickets:calificar", 1)).message, /sigue abierto/);
  h.db.prepare("UPDATE ticket SET fechaCierre=? WHERE idTicket=1").run("2026-10-27 10:00:00");
  h.db.prepare("DELETE FROM ticket_tecnico WHERE idTicket=1").run();
  assert.match((await h.invoke("tickets:calificar", 1)).message, /técnico real/);
  h.db.prepare("INSERT INTO ticket_tecnico VALUES (1, 2)").run();
  const response = await h.invoke("tickets:calificar", 1);
  assert.equal(response.ok, true, response.message);
  const row = h.db.prepare("SELECT idEstadoCalificacion, fechaCalificacion, idUsuarioCalificador FROM ticket WHERE idTicket=1").get();
  assert.equal(row.idEstadoCalificacion, 1);
  assert.equal(row.fechaCalificacion, h.data.fechaApertura);
  assert.equal(row.idUsuarioCalificador, 1);
  assert.match((await h.invoke("tickets:calificar", 1)).message, /ya calificado/);
  assert.match((await h.invoke("tickets:setClasificacion", 1, 1)).message, /ya calificado/);
  assert.match((await h.invoke("tickets:reopen", 1)).message, /calificado/);
});

test("tickets:calificarAll califica solo el cerrado elegible según texto, unidad, técnico y fechas", async (t) => {
  const h = setup(t);
  h.db.prepare("INSERT INTO des_estado_calificacion (idEstadoCalificacion, nombre) VALUES (1, 'CALIFICADO')").run();
  sessions.setTrustedSession(h.event, { ...h.session, permisos: [...h.session.permisos, "CALIFICACION_TICKETS"] });
  h.db.prepare("UPDATE ticket SET nombreSolicitante='Elegible ficticio', fechaCierre=? WHERE idTicket=1").run("2026-10-27 10:00:00");
  // One closed record outside the search and one matching record still open.
  const other = await h.invoke("tickets:create", { ...h.data, nombreSolicitante: "Otro ficticio", fechaCierre: "2026-10-27 10:00:00", solucion: "Solución ficticia" });
  const open = await h.invoke("tickets:create", { ...h.data, nombreSolicitante: "Elegible ficticio abierto" });
  assert.equal(other.ok, true, other.message);
  assert.equal(open.ok, true, open.message);
  const rated = await h.invoke("tickets:create", { ...h.data, nombreSolicitante: "Elegible ficticio ya calificado",
    fechaCierre: "2026-10-27 10:00:00", solucion: "Solución ficticia" });
  assert.equal(rated.ok, true, rated.message);
  h.db.prepare("UPDATE ticket SET idEstadoCalificacion=1, fechaCalificacion=?, idUsuarioCalificador=2 WHERE idTicket=?")
    .run("2026-10-28 09:00:00", rated.idTicket);
  const before = h.db.prepare("SELECT * FROM ticket WHERE idTicket<>1 ORDER BY idTicket").all();
  const response = await h.invoke("tickets:calificarAll", { q: "Elegible ficticio", idUnidad: 1, idTecnico: 2,
    desde: "2026-10-01 00:00:00", hasta: "2026-10-31 23:59:59" });
  assert.equal(response.ok, true, response.message);
  assert.equal(response.affectedRows, 1);
  const row = h.db.prepare("SELECT idEstadoCalificacion, idUsuarioCalificador FROM ticket WHERE idTicket=1").get();
  assert.equal(row.idEstadoCalificacion, 1);
  assert.equal(row.idUsuarioCalificador, 1);
  assert.deepEqual(h.db.prepare("SELECT * FROM ticket WHERE idTicket<>1 ORDER BY idTicket").all(), before);
  assert.deepEqual(h.db.prepare("PRAGMA foreign_key_check").all(), []);
});
