const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const bcrypt = require("bcryptjs");
const { createSyntheticDatabase } = require("./helpers/synthetic-database");

test("synthetic schema provides related users, permissions and ticket without external data", () => {
  const fixture = createSyntheticDatabase();
  try {
    assert.equal(fixture.databasePath, ":memory:");
    assert.equal(fixture.db.prepare("PRAGMA quick_check").get().quick_check, "ok");
    assert.deepEqual(fixture.db.prepare("PRAGMA foreign_key_check").all(), []);
    const user = fixture.db.prepare(`SELECT u.pass, r.nombre AS role FROM usuario u
      JOIN rol r ON r.idRol=u.idRol WHERE u.usuario=? AND u.activo=1`).get(fixture.identity.username);
    assert.equal(user.role, "ADMIN");
    assert.equal(bcrypt.compareSync(fixture.identity.password, user.pass), true);
    assert.equal(fixture.db.prepare("SELECT count(*) AS n FROM rol_permiso WHERE idRol=1").get().n, 2);
    assert.equal(fixture.db.prepare("SELECT count(*) AS n FROM ticket_tecnico WHERE idTicket=1 AND idTecnico=2").get().n, 1);
    assert.throws(() => fixture.db.prepare("INSERT INTO ticket_tecnico VALUES (999, 2)").run(), /FOREIGN KEY/);
  } finally {
    fixture.cleanup();
  }
});

test("fresh fixtures reproduce data and isolate writes", () => {
  const first = createSyntheticDatabase();
  let second;
  try {
    second = createSyntheticDatabase();
    assert.deepEqual(first.db.prepare("SELECT * FROM usuario ORDER BY idUsuario").all(), second.db.prepare("SELECT * FROM usuario ORDER BY idUsuario").all());
    first.db.prepare("DELETE FROM ticket_tecnico").run();
    assert.equal(second.db.prepare("SELECT count(*) AS n FROM ticket_tecnico").get().n, 1);
  } finally {
    first.cleanup();
    if (second) second.cleanup();
  }
});

test("temporary fixture owns its directory and removes database and sidecars", () => {
  const fixture = createSyntheticDatabase({ storage: "temporary" });
  try {
    assert.equal(path.dirname(fixture.directory), fs.realpathSync(os.tmpdir()));
    assert.equal(fs.existsSync(fixture.databasePath), true);
    fixture.db.exec("PRAGMA journal_mode=WAL; UPDATE ticket SET solucion='Respuesta ficticia';");
  } finally {
    fixture.cleanup();
  }
  assert.equal(fs.existsSync(fixture.directory), false);
  fixture.cleanup();
});

test("fixture rejects caller paths and invalid storage before opening any database", () => {
  for (const options of [null, "operative.sqlite", { databasePath: "operative.sqlite" },
    { storage: "../operative.sqlite" }, { storage: "memory", path: ":memory:" }]) {
    assert.throws(() => createSyntheticDatabase(options), /option|storage|paths/);
  }
});
