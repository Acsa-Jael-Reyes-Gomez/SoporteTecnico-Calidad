const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const schemaPath = path.resolve(__dirname, "../../assets/database/schema.sqlite.sql");

// Test-only credential. Never use this fixture in a deployed application.
const fixtureIdentity = Object.freeze({
  username: "sqa_fictitious_admin",
  password: "Synthetic-Tests-Only-2026!",
  date: "2026-10-26 10:00:00",
});

function populate(db) {
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;");
  try {
    db.prepare("INSERT INTO des_tipo_ruta (idTipoRuta, nombre) VALUES (2, ?)").run("Ruta ficticia SQA");
    db.prepare("INSERT INTO des_clasificacion (idClasificacion, nombre) VALUES (1, ?)").run("NORMAL");
    db.prepare("INSERT INTO des_estado_calificacion (idEstadoCalificacion, nombre) VALUES (0, ?)").run("PENDIENTE");
    db.prepare("INSERT INTO des_estado_validacion (idEstadoValidacion, nombre) VALUES (0, ?)").run("PENDIENTE");
    db.prepare("INSERT INTO rol (idRol, nombre) VALUES (1, 'ADMIN'), (2, 'TECNICO')").run();
    db.prepare("INSERT INTO unidad (idUnidad, nombre, idTipoRuta) VALUES (1, ?, 2)").run("Unidad ficticia SQA");
    db.prepare("INSERT INTO puesto (idPuesto, nombre) VALUES (1, ?)").run("Puesto ficticio SQA");
    db.prepare("INSERT INTO servicio (idServicio, nombre, idClasificacion) VALUES (1, ?, 1)").run("Servicio ficticio SQA");
    db.prepare("INSERT INTO tipo_equipo (idTipoEquipo, nombre) VALUES (1, ?)").run("Equipo ficticio SQA");
    // Fixed salt for reproducible synthetic data only; not a production hashing policy.
    const hash = bcrypt.hashSync(fixtureIdentity.password, "$2b$04$abcdefghijklmnopqrstuu");
    const insertUser = db.prepare("INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (?, ?, ?, ?, ?)");
    insertUser.run(1, fixtureIdentity.username, hash, "Administrador ficticio SQA", 1);
    insertUser.run(2, "sqa_fictitious_technician", hash, "Tecnico ficticio SQA", 2);
    db.prepare("INSERT INTO usuario_unidad (idUsuario, idUnidad) VALUES (1, 1), (2, 1)").run();
    ["TICKETS_CREAR", "TICKETS_VER_TODOS"].forEach((code, index) => {
      db.prepare("INSERT INTO permiso (idPermiso, code, descripcion) VALUES (?, ?, ?)").run(index + 1, code, "Permiso ficticio SQA");
      db.prepare("INSERT INTO rol_permiso (idRol, idPermiso) VALUES (1, ?)").run(index + 1);
    });
    db.prepare(`INSERT INTO ticket
      (idTicket, nombreSolicitante, idPuesto, idUnidad, idServicio, fechaApertura, creadoPor, idClasificacion)
      VALUES (1, ?, 1, 1, 1, ?, 1, 1)`).run("Solicitante ficticio SQA", fixtureIdentity.date);
    db.prepare("INSERT INTO ticket_tecnico (idTicket, idTecnico) VALUES (1, 2)").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** No caller-supplied paths or environment configuration are accepted. */
function createSyntheticDatabase(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => key !== "storage")) {
    throw new Error("Only the storage option is accepted; external paths are forbidden.");
  }
  const storage = options.storage ?? "memory";
  if (!["memory", "temporary"].includes(storage)) throw new Error("Invalid test storage mode.");

  let directory = null;
  let databasePath = ":memory:";
  let directoryStat = null;
  let db;
  let closed = false;
  function removeOwnedDirectory() {
    if (!directory || !fs.existsSync(directory)) return;
    const current = fs.lstatSync(directory);
    if (current.isSymbolicLink() || !current.isDirectory() ||
        current.dev !== directoryStat.dev || current.ino !== directoryStat.ino ||
        path.dirname(fs.realpathSync(directory)) !== fs.realpathSync(os.tmpdir())) {
      throw new Error("Refusing to clean a replaced or non-owned test directory.");
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
  try {
    if (storage === "temporary") {
      const tempRoot = fs.realpathSync(os.tmpdir());
      const repositoryRoot = fs.realpathSync(path.resolve(__dirname, "../.."));
      const relative = path.relative(repositoryRoot, tempRoot);
      if (!relative || (!path.isAbsolute(relative) && relative !== ".." &&
          !relative.startsWith(`..${path.sep}`))) {
        throw new Error("Temporary storage must be outside the repository.");
      }
      directory = fs.mkdtempSync(path.join(tempRoot, "soporte-synthetic-"));
      directoryStat = fs.lstatSync(directory);
      databasePath = path.join(directory, "fixture.sqlite");
      // Exclusive creation: never open an existing database for initialization.
      fs.closeSync(fs.openSync(databasePath, "wx", 0o600));
    }
    db = new DatabaseSync(databasePath);
    populate(db);
  } catch (error) {
    if (db) db.close();
    removeOwnedDirectory();
    throw error;
  }
  return Object.freeze({
    db,
    databasePath,
    directory,
    identity: fixtureIdentity,
    cleanup() {
      if (!closed) {
        db.close();
        closed = true;
      }
      removeOwnedDirectory();
    },
  });
}

module.exports = { createSyntheticDatabase };
