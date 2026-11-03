const test = require("node:test");
const assert = require("node:assert/strict");
const { createSyntheticDatabase } = require("./helpers/synthetic-database");
const { SqliteConnection } = require("../dist/main/db/sqlite_connection");
const sessions = require("../dist/main/session_store");

function setup(t) {
  const fixture = createSyntheticDatabase();
  sessions.clearAllTrustedSessions();
  t.after(() => {
    sessions.clearAllTrustedSessions();
    fixture.cleanup();
  });
  const connection = new SqliteConnection(fixture.db);
  // Replace only the connection boundary. Never load the operational DB module.
  const dbPath = require.resolve("../dist/main/db/db");
  const authPath = require.resolve("../dist/main/ipc_auth");
  const previousDb = require.cache[dbPath];
  const previousAuth = require.cache[authPath];
  const handlers = new Map();
  try {
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
      exports: { withConn: async (fn) => fn(connection) } };
    delete require.cache[authPath];
    require(authPath).registerAuthHandlers({
      handle(channel, handler) {
        assert.equal(handlers.has(channel), false);
        handlers.set(channel, handler);
      },
    });
  } finally {
    if (previousDb) require.cache[dbPath] = previousDb;
    else delete require.cache[dbPath];
    if (previousAuth) require.cache[authPath] = previousAuth;
    else delete require.cache[authPath];
  }
  const event = { sender: { id: 101 } };
  const invoke = (channel, ...args) => handlers.get(channel)(event, ...args);
  return { fixture, event, invoke, handlers,
    login: () => invoke("auth:login", fixture.identity.username, fixture.identity.password) };
}

test("login real carga rol, permisos y unidad; logout elimina la sesión", async (t) => {
  const h = setup(t);
  const response = await h.login();
  assert.equal(response.ok, true);
  assert.equal(response.session.rol, "ADMIN");
  assert.deepEqual(response.session.permisos, ["TICKETS_CREAR", "TICKETS_VER_TODOS"]);
  assert.equal(response.session.unidades[0].idUnidad, 1);
  assert.equal("pass" in response.session, false);
  assert.deepEqual(sessions.requireTrustedSession(h.event), response.session);
  assert.equal(sessions.getTrustedSessionStatus(h.event).active, true);
  assert.deepEqual(await h.invoke("auth:logout"), { ok: true });
  assert.throws(() => sessions.requireTrustedSession(h.event), /Sesión inválida/);
});

test("login rechaza contraseña incorrecta, usuario inexistente e inactivo y limpia sesión previa", async (t) => {
  const h = setup(t);
  for (const scenario of ["wrong-password", "missing-user", "inactive-user"]) {
    assert.equal((await h.login()).ok, true);
    if (scenario === "inactive-user") h.fixture.db.prepare("UPDATE usuario SET activo=0 WHERE idUsuario=1").run();
    const response = await h.invoke("auth:login",
      scenario === "missing-user" ? "sqa_missing" : h.fixture.identity.username,
      scenario === "wrong-password" ? "Synthetic-Wrong" : h.fixture.identity.password);
    assert.deepEqual(response, { ok: false, message: "Usuario o contraseña inválidos." });
    assert.equal(sessions.getTrustedSession(h.event), null);
  }
});

test("login rechaza entradas vacías sin crear sesión", async (t) => {
  const h = setup(t);
  for (const [user, pass] of [["", ""], ["   ", "synthetic"], [null, null], [h.fixture.identity.username, ""]]) {
    assert.deepEqual(await h.invoke("auth:login", user, pass),
      { ok: false, message: "Usuario y contraseña son requeridos." });
    assert.equal(sessions.getTrustedSession(h.event), null);
  }
});

test("permisos reales aceptan alias autorizado y rechazan permiso ausente o sesión inexistente", async (t) => {
  const h = setup(t);
  await h.login();
  assert.equal(sessions.requirePermForEvent(h.event, "TICKETS_CREATE").idUsuario, 1);
  assert.throws(() => sessions.requirePermForEvent(h.event, "REPORTS_EXPORT"), /Sin permiso/);
  await h.invoke("auth:logout");
  assert.throws(() => sessions.requirePermForEvent(h.event, "TICKETS_CREATE"), /Sesión inválida/);
  assert.equal((await h.invoke("auth:login", "sqa_fictitious_technician", h.fixture.identity.password)).ok, true);
  assert.throws(() => sessions.requirePermForEvent(h.event, "TICKETS_CREATE"), /Sin permiso/);
});

test("sesión vencida pierde acceso aunque el usuario tenga permiso", async (t) => {
  const h = setup(t);
  await h.login();
  const expiresAt = sessions.getTrustedSessionStatus(h.event).expiresAt;
  t.mock.method(Date, "now", () => expiresAt + 1);
  assert.equal(sessions.getTrustedSessionStatus(h.event).active, false);
  assert.throws(() => sessions.requirePermForEvent(h.event, "TICKETS_CREATE"), /Sesión inválida/);
});

test("revocación IPC exige ADMIN y elimina todas las sesiones del usuario objetivo", async (t) => {
  const h = setup(t);
  const technicianEvent = { sender: { id: 202 } };
  const login = h.handlers.get("auth:login");
  assert.equal((await login(technicianEvent, "sqa_fictitious_technician", h.fixture.identity.password)).ok, true);
  assert.equal((await h.handlers.get("auth:revokeUserSessions")(technicianEvent, 1)).ok, false);
  assert.equal((await h.login()).ok, true);
  assert.equal((await h.invoke("auth:revokeUserSessions", -1)).ok, false);
  assert.deepEqual(await h.invoke("auth:revokeUserSessions", 2), { ok: true });
  assert.equal(sessions.getTrustedSessionStatus(technicianEvent).active, false);
  assert.throws(() => sessions.requireTrustedSession(technicianEvent), /Sesión inválida/);
  assert.equal(sessions.getTrustedSessionStatus(h.event).active, true);
});

test("login bloquea nuevos intentos tras cinco contraseñas incorrectas", async (t) => {
  const h = setup(t);
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await h.invoke("auth:login", h.fixture.identity.username, "Synthetic-Wrong")).ok, false);
  }
  const response = await h.login();
  assert.equal(response.ok, false);
  assert.match(response.message, /Demasiados intentos/);
  assert.equal(sessions.getTrustedSession(h.event), null);
});
