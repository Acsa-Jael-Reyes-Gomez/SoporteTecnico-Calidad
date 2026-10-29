const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { SqliteConnection } = require("../dist/main/db/sqlite_connection.js");

test("el adaptador SQLite ejecuta CRUD con parámetros y devuelve el ID insertado", () => {
  const database = new DatabaseSync(":memory:");
  try {
    const connection = new SqliteConnection(database);
    connection.execute("CREATE TABLE registro (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)");
    const [insert] = connection.execute("INSERT INTO registro (nombre) VALUES (?)", ["solicitud ? segura"]);
    const [rows] = connection.execute("SELECT id, nombre FROM registro WHERE id = ?", [insert.insertId]);
    assert.deepEqual(rows.map((row) => ({ ...row })), [{ id: 1, nombre: "solicitud ? segura" }]);
    assert.equal(insert.affectedRows, 1);
  } finally {
    database.close();
  }
});

test("el adaptador transforma INSERT IGNORE y ON DUPLICATE KEY UPDATE", () => {
  const database = new DatabaseSync(":memory:");
  try {
    const connection = new SqliteConnection(database);
    connection.execute("CREATE TABLE catalogo (id INTEGER PRIMARY KEY, nombre TEXT UNIQUE)");
    connection.execute("INSERT IGNORE INTO catalogo (id, nombre) VALUES (?, ?)", [1, "Inicial"]);
    connection.execute(
      "INSERT INTO catalogo (id, nombre) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)",
      [1, "Actualizado"]
    );
    const [rows] = connection.execute("SELECT nombre FROM catalogo WHERE id = ?", [1]);
    assert.deepEqual(rows.map((row) => ({ ...row })), [{ nombre: "Actualizado" }]);
  } finally {
    database.close();
  }
});

test("commit conserva y rollback revierte los cambios", () => {
  const database = new DatabaseSync(":memory:");
  try {
    const connection = new SqliteConnection(database);
    connection.execute("CREATE TABLE registro (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)");
    connection.beginTransaction();
    connection.execute("INSERT INTO registro VALUES (?, ?)", [1, "confirmado"]);
    connection.commit();
    connection.beginTransaction();
    connection.execute("INSERT INTO registro VALUES (?, ?)", [2, "revertido"]);
    connection.rollback();
    const [rows] = connection.execute("SELECT id, nombre FROM registro");
    assert.deepEqual(rows.map((row) => ({ ...row })), [{ id: 1, nombre: "confirmado" }]);
  } finally {
    database.close();
  }
});

test("rechaza objetos como parámetros SQLite y conserva los errores SQL", () => {
  const database = new DatabaseSync(":memory:");
  try {
    const connection = new SqliteConnection(database);
    assert.throws(() => connection.execute("SELECT ?", [{ id: 1 }]), /Tipo de parámetro/);
    assert.throws(() => connection.execute("SELECT * FROM tabla_inexistente"), /no such table/i);
  } finally {
    database.close();
  }
});

test("la semilla incluida pasa la verificación SQLite y limita las fechas de tickets", () => {
  const database = new DatabaseSync(path.join(__dirname, "../assets/database/seed.db"), { readOnly: true });
  try {
    assert.equal(database.prepare("PRAGMA quick_check").get().quick_check, "ok");
    const [range] = database.prepare(`
      WITH operational_dates(value) AS (
        SELECT fechaEnvio FROM envio_equipo UNION ALL SELECT fechaRecepcion FROM envio_equipo
        UNION ALL SELECT fechaRevision FROM envio_equipo UNION ALL SELECT fechaReparacion FROM envio_equipo
        UNION ALL SELECT fechaEntrega FROM envio_equipo UNION ALL SELECT fechaExtravio FROM envio_equipo
        UNION ALL SELECT createdAt FROM envio_equipo UNION ALL SELECT updatedAt FROM envio_equipo
        UNION ALL SELECT fechaRegistro FROM envio_equipo UNION ALL SELECT fechaModificacion FROM envio_equipo
        UNION ALL SELECT createdAt FROM notificacion_asignacion
        UNION ALL SELECT fechaRegistro FROM proyecto_especial UNION ALL SELECT fechaRevision FROM proyecto_especial
        UNION ALL SELECT fechaApertura FROM ruta UNION ALL SELECT fechaCierre FROM ruta
        UNION ALL SELECT fechaValidacion FROM ruta UNION ALL SELECT fechaCalificacion FROM ruta
        UNION ALL SELECT fechaApertura FROM ticket UNION ALL SELECT fechaCierre FROM ticket
        UNION ALL SELECT fechaCalificacion FROM ticket
        UNION ALL SELECT fechaRecibido FROM ticket_equipo UNION ALL SELECT fechaSalida FROM ticket_equipo
      )
      SELECT MIN(substr(value, 1, 10)) AS inicio,
             MAX(substr(value, 1, 10)) AS fin,
             SUM(CASE WHEN substr(value, 1, 10) < '2026-09-25' OR substr(value, 1, 10) > '2026-10-26' THEN 1 ELSE 0 END) AS fuera
      FROM operational_dates WHERE value IS NOT NULL
    `).all();
    assert.equal(range.inicio, "2026-09-25");
    assert.equal(range.fin, "2026-10-26");
    assert.equal(range.fuera, 0);
  } finally {
    database.close();
  }
});
