const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const migration = require("../dist/main/db/password_migration.js");

function fixture(t, schema = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sqa-password-edge-"));
  const databasePath = path.join(directory, "synthetic.db");
  const db = new DatabaseSync(databasePath);
  if (schema) db.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT NOT NULL, pass TEXT, nombre TEXT, idRol INTEGER, activo INTEGER);");
  t.after(() => { db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { db, databasePath, directory };
}

test("migración: una base sin tabla de usuarios no se modifica ni genera respaldo", (t) => {
  const { db, directory, databasePath } = fixture(t, false);
  assert.deepEqual(migration.migratePlaintextPasswords(db, databasePath),
    { migrated: 0, problems: [], unchanged: 0 });
  assert.equal(fs.existsSync(path.join(directory, "backups")), false);
  assert.throws(() => migration.createPasswordMigrationBackup(databasePath, db), /tabla usuario/);
});

test("respaldo: rechaza ruta inexistente y verifica campos mínimos de usuarios", (t) => {
  const { db, databasePath } = fixture(t);
  assert.throws(() => migration.createPasswordMigrationBackup(databasePath + ".missing", db), /no existe/);
  db.exec("DROP TABLE usuario; CREATE TABLE usuario (id INTEGER PRIMARY KEY, nombre TEXT);");
  assert.throws(() => migration.createPasswordMigrationBackup(databasePath, db), /campos mínimos/);
});

test("respaldo: genera nombres únicos sin sobrescribir copias existentes", (t) => {
  const { db, databasePath } = fixture(t);
  db.prepare("INSERT INTO usuario (idUsuario, usuario, pass) VALUES (1, 'synthetic', 'Synthetic-Only-Password')").run();
  const first = migration.createPasswordMigrationBackup(databasePath, db);
  const second = migration.createPasswordMigrationBackup(databasePath, db);
  assert.notEqual(first, second);
  assert.equal(fs.existsSync(first), true);
  assert.equal(fs.existsSync(second), true);
  const one = new DatabaseSync(first, { readOnly: true });
  const two = new DatabaseSync(second, { readOnly: true });
  try {
    assert.equal(one.prepare("SELECT usuario FROM usuario").get().usuario, "synthetic");
    assert.equal(two.prepare("SELECT usuario FROM usuario").get().usuario, "synthetic");
  } finally { one.close(); two.close(); }
});

test("migración: identifica valores inesperados sin registrar contraseñas en el informe", (t) => {
  const { db, databasePath, directory } = fixture(t);
  const insert = db.prepare("INSERT INTO usuario (idUsuario, usuario, pass) VALUES (?, ?, ?)");
  insert.run(1, "empty", null);
  insert.run(2, "invalid", "$2b$12$bad");
  insert.run(3, "control", "dato" + String.fromCharCode(0xfffd) + "invalido");
  const result = migration.migratePlaintextPasswords(db, databasePath);
  assert.equal(result.migrated, 0);
  assert.equal(result.unchanged, 3);
  assert.deepEqual(result.problems.map(p => p.classification),
    ["password_empty", "bcrypt_invalid", "unexpected_data"]);
  const reports = fs.readdirSync(path.join(directory, "backups")).filter(name => name.endsWith(".json"));
  assert.equal(reports.length, 1);
  const report = fs.readFileSync(path.join(directory, "backups", reports[0]), "utf8");
  assert.doesNotMatch(report, /dato|\\$2b\\$12\\$bad/);
  assert.match(report, /credenciales y hashes no se incluyen/);
});

test("ACL: rechaza identidades sin SID, reglas heredadas, denegaciones y permisos insuficientes", () => {
  const sid = "S-1-5-21-1001";
  const valid = [
    { Sid: sid, Identity: "Usuario", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" },
    { Sid: "S-1-5-18", Identity: "SYSTEM", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" },
    { Sid: "S-1-5-32-544", Identity: "Administradores", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" }
  ];
  const check = (access, currentSid = sid) => migration.verifyWindowsBackupAcl(
    { IsInheritanceEnabled: false, Access: access }, currentSid
  );
  assert.throws(() => check(valid, ""), /identidad actual/);
  assert.throws(() => check([]), /reglas explícitas/);
  assert.throws(() => check(valid.slice(1)), /Falta una regla ACL/);
  assert.throws(() => check(valid.map((r, i) => i === 0 ? { ...r, IsInherited: true } : r)), /heredados/);
  assert.throws(() => check(valid.map((r, i) => i === 0 ? { ...r, AccessControlType: "Deny" } : r)), /denegación/);
  assert.throws(() => check(valid.map((r, i) => i === 0 ? { ...r, Rights: "Read" } : r)), /control total/);
});

test("clasificación: maneja valores nulos, números, datos binarios y contraseñas extensas", () => {
  assert.equal(migration.classifyPassword(null), "password_empty");
  assert.equal(migration.classifyPassword(undefined), "password_empty");
  assert.equal(migration.classifyPassword(123456), "plaintext_valid");
  assert.equal(migration.classifyPassword({ value: "clave" }), "unexpected_data");
  assert.equal(migration.classifyPassword("x".repeat(81)), "unexpected_data");
  assert.equal(migration.classifyPassword("clave" + String.fromCharCode(0xfffd)), "unexpected_data");
});

test("ACL: también rechaza ausencia de reglas y verifica una regla única sin aceptar permisos parciales", () => {
  const sid = "S-1-5-21-2026";
  const rule = { Sid: sid, Identity: "Usuario", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" };
  const check = (access) => migration.verifyWindowsBackupAcl(
    { IsInheritanceEnabled: false, Access: access }, sid
  );
  assert.throws(() => check(null), /reglas explícitas/);
  assert.throws(() => check(undefined), /reglas explícitas/);
  assert.throws(() => check(rule), /Falta una regla ACL válida/);
  assert.throws(() => check([{ ...rule, Sid: "S-1-5-21-otro", Identity: "" }]), /no autorizada/);
  assert.throws(() => check([{ ...rule, Rights: "ReadAndExecute" }]), /control total/);
});

test("respaldo: compara cantidad, identidad y datos relevantes de usuarios", () => {
  const original = [{ idUsuario: 1, usuario: "synthetic", nombre: "Prueba", idRol: 1, activo: 1 }];
  assert.doesNotThrow(() => migration.validateUserSnapshots(original, [{ ...original[0] }]));
  assert.throws(() => migration.validateUserSnapshots(original, []), /contiene 0 usuarios/);
  assert.throws(() => migration.validateUserSnapshots(original, [{ ...original[0], activo: 0 }]), /difieren/);
});

test("migración: acepta respaldo inyectado y conserva usuarios ya migrados", (t) => {
  const { db, databasePath, directory } = fixture(t);
  const insert = db.prepare("INSERT INTO usuario (idUsuario, usuario, pass) VALUES (?, ?, ?)");
  insert.run(1, "pending", "OnlySynthetic123");
  insert.run(2, "hash", require("bcryptjs").hashSync("OnlySynthetic456", 4));
  let calls = 0;
  const result = migration.migratePlaintextPasswords(db, databasePath, {
    backupFactory: (sourcePath) => {
      calls++;
      assert.equal(sourcePath, databasePath);
      return path.join(directory, "controlled-backup.db");
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.migrated, 1);
  assert.equal(result.unchanged, 1);
  assert.equal(result.backupPath, path.join(directory, "controlled-backup.db"));
  assert.equal(migration.classifyPassword(db.prepare("SELECT pass FROM usuario WHERE idUsuario=1").get().pass), "bcrypt_valid");
  assert.equal(migration.classifyPassword(db.prepare("SELECT pass FROM usuario WHERE idUsuario=2").get().pass), "bcrypt_valid");
});
