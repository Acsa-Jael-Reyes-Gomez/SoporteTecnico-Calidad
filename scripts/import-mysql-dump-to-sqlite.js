const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const sourcePath = path.resolve(process.argv[2] || "");
const outputArgumentIndex = process.argv.indexOf("--output");
const outputPath = outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
  ? path.resolve(process.argv[outputArgumentIndex + 1])
  : path.join(__dirname, "..", "assets", "database", "seed.db");
const schemaPath = path.join(__dirname, "..", "assets", "database", "schema.sqlite.sql");

function collectInsertStatements(sql) {
  const statements = [];
  const lines = sql.split(/\r?\n/);
  let active = "";
  let quote = "";
  let escaped = false;
  let proceduresStarted = false;

  for (const line of lines) {
    if (/^\s*--\s*Procedure structure/i.test(line)) proceduresStarted = true;
    if (proceduresStarted) continue;
    if (!active && !/^\s*INSERT\s+INTO\s+/i.test(line)) continue;
    active += `${line}\n`;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) {
          if (line[i + 1] === quote) i += 1;
          else quote = "";
        }
      } else if (char === "'" || char === '"') quote = char;
      else if (char === ";") {
        statements.push(active.trim().replace(/;\s*$/, ""));
        active = "";
        break;
      }
    }
  }

  if (active.trim()) throw new Error("Hay un INSERT sin terminar en el volcado.");
  return statements;
}

function normalizeMysqlStringEscapes(sql) {
  let output = "";
  let quote = "";
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (!quote) {
      if (char === "'") quote = char;
      output += char;
      continue;
    }
    if (char === "\\" && i + 1 < sql.length) {
      const next = sql[++i];
      const replacements = { "'": "''", '"': '"', "\\": "\\", n: "\n", r: "\r", t: "\t", 0: "\0", Z: "\x1a" };
      output += replacements[next] ?? next;
      continue;
    }
    if (char === quote) {
      if (sql[i + 1] === quote) output += `${char}${sql[++i]}`;
      else quote = "";
    }
    output += char;
  }
  return output;
}

function alignOperationalDates(db) {
  const dateColumns = [];
  for (const { name: tableName } of db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()) {
    for (const { name: columnName } of db
      .prepare(`PRAGMA table_info("${tableName}")`)
      .all()
      .filter((column) => /fecha|date|createdAt|updatedAt|At$/i.test(column.name))) {
      dateColumns.push({ tableName, columnName });
    }

  }

  const values = [];
  for (const { tableName, columnName } of dateColumns) {
    const rows = db
      .prepare(
        `SELECT DISTINCT "${columnName}" AS value FROM "${tableName}"
         WHERE "${columnName}" IS NOT NULL AND TRIM(CAST("${columnName}" AS TEXT)) <> ''`
      )
      .all();
    for (const { value } of rows) {
      const match = String(value).match(/^(\d{4}-\d{2}-\d{2})(.*)$/);
      if (match) values.push({ ...match, value, tableName, columnName });
    }
  }

  if (!values.length) return;
  const sourceDays = values.map(({ 1: date }) => Date.parse(`${date}T00:00:00Z`));
  const firstDay = Math.min(...sourceDays);
  const lastDay = Math.max(...sourceDays);
  const targetStart = Date.parse("2026-09-25T00:00:00Z");
  const targetEnd = Date.parse("2026-10-26T00:00:00Z");
  const span = lastDay - firstDay;
  if (!Number.isFinite(firstDay) || !Number.isFinite(lastDay) || span <= 0) {
    throw new Error("No se pudieron normalizar las fechas del volcado.");
  }

  const updateCache = new Map();
  for (const { 1: date, 2: suffix, value, tableName, columnName } of values) {
    const sourceDay = Date.parse(`${date}T00:00:00Z`);
    const targetDay = targetStart + Math.round(((sourceDay - firstDay) / span) * (targetEnd - targetStart));
    const aligned = `${new Date(targetDay).toISOString().slice(0, 10)}${suffix}`;
    const key = `${tableName}.${columnName}`;
    if (!updateCache.has(key)) {
      updateCache.set(
        key,
        db.prepare(`UPDATE "${tableName}" SET "${columnName}" = ? WHERE "${columnName}" = ?`)
      );
    }
    updateCache.get(key).run(aligned, value);
  }
}

function migratePlaintextPasswords(db) {
  const hasUsers = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuario'"
  ).get();
  if (!hasUsers) return 0;

  const rows = db.prepare("SELECT idUsuario, usuario, pass FROM usuario").all();
  const update = db.prepare("UPDATE usuario SET pass = ? WHERE idUsuario = ?");
  const fullBcrypt = /^\$2[aby]\$(?:0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/;
  const problems = [];
  let migrated = 0;

  for (const row of rows) {
    const stored = String(row.pass || "");
    if (!stored.trim()) {
      problems.push({ idUsuario: Number(row.idUsuario), usuario: String(row.usuario || ""), classification: "password_empty" });
      continue;
    }
    if (/^\$2[aby]\$/.test(stored) || /^\$2/.test(stored)) {
      if (!fullBcrypt.test(stored)) {
        problems.push({ idUsuario: Number(row.idUsuario), usuario: String(row.usuario || ""), classification: "bcrypt_invalid" });
      }
      continue;
    }
    const hasUnexpectedCharacters = Array.from(stored).some((char) => {
      const code = char.codePointAt(0) ?? 0;
      return (
        (code >= 0 && code <= 0x1f) ||
        (code >= 0x7f && code <= 0x9f) ||
        code === 0xfffd
      );
    });
    if (hasUnexpectedCharacters || stored.length > 80) {
      problems.push({ idUsuario: Number(row.idUsuario), usuario: String(row.usuario || ""), classification: "unexpected_data" });
      continue;
    }
    update.run(bcrypt.hashSync(stored, 10), row.idUsuario);
    migrated++;
  }

  if (problems.length) {
    const backupDirectory = path.join(__dirname, "..", "assets", "database", "backups");
    fs.mkdirSync(backupDirectory, { recursive: true });
    const reportPath = path.join(
      backupDirectory,
      `password-import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      notice: "Las credenciales y hashes no se incluyen en este informe.",
      problems
    }, null, 2), { encoding: "utf8", mode: 0o600 });
  }

  return migrated;
}

function validateTemporaryDatabase(databasePath) {
  if (!fs.existsSync(databasePath)) {
    throw new Error("La base temporal de importación no fue creada.");
  }
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").all();
    const firstValue = integrity.length ? Object.values(integrity[0])[0] : null;
    if (integrity.length !== 1 || String(firstValue).toLowerCase() !== "ok") {
      throw new Error("La base temporal no pasó la comprobación de integridad.");
    }
    const userTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='usuario'"
    ).get();
    if (!userTable) throw new Error("La base temporal no contiene la tabla usuario.");
    const columns = db.prepare("PRAGMA table_info('usuario')").all();
    const columnNames = new Set(columns.map((column) => column.name));
    if (!columnNames.has("idUsuario") || !columnNames.has("usuario")) {
      throw new Error("La tabla usuario temporal no contiene los identificadores esperados.");
    }
    const totals = db.prepare(
      "SELECT count(*) AS total, count(DISTINCT idUsuario) AS uniqueIds FROM usuario"
    ).get();
    if (Number(totals.total) !== Number(totals.uniqueIds)) {
      throw new Error("La base temporal contiene IDs de usuario duplicados.");
    }
    return totals;
  } finally {
    db.close();
  }
}

function importLockPath(outputPath) {
  return path.join(path.dirname(outputPath), ".seed-import.lock");
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireImportLock(outputPath) {
  const lockPath = importLockPath(outputPath);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const descriptor = fs.openSync(lockPath, "wx", 0o600);
    fs.writeSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    fs.closeSync(descriptor);
    return lockPath;
  } catch (error) {
    if (error?.code === "EEXIST") {
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        if (!processIsAlive(Number(lock.pid))) {
          fs.rmSync(lockPath, { force: true });
          return acquireImportLock(outputPath);
        }
      } catch {
        // A malformed lock is ambiguous and is not removed automatically.
      }
    }
    throw new Error("Otra importación o recuperación está en curso; se conservan todos los archivos.", { cause: error });
  }
}

function releaseImportLock(lockPath) {
  fs.rmSync(lockPath, { force: true });
}

function writeRecoveryReport(outputPath, action, details) {
  const reportDirectory = path.join(path.dirname(outputPath), "backups");
  fs.mkdirSync(reportDirectory, { recursive: true });
  try {
    if (process.platform !== "win32") fs.chmodSync(reportDirectory, 0o700);
  } catch {
    // El informe se crea como archivo local de 0600; no contiene credenciales.
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDirectory, `seed-recovery-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    action,
    notice: "No se incluyen contraseñas, hashes ni contenido de bases.",
    details
  }, null, 2), { encoding: "utf8", mode: 0o600 });
  return reportPath;
}

function recoverInterruptedSeed(outputPath) {
  const lockPath = acquireImportLock(outputPath);
  try {
    if (fs.existsSync(outputPath)) {
        try {
          validateTemporaryDatabase(outputPath);
          return writeRecoveryReport(outputPath, "seed_preserved", {
            reason: "seed.db ya existe y se conservó sin sustitución automática"
          });
        } catch (error) {
          return writeRecoveryReport(outputPath, "seed_invalid_preserved", {
            reason: error instanceof Error ? error.message : String(error)
          });
        }
    }

    const directory = path.dirname(outputPath);
    fs.mkdirSync(directory, { recursive: true });
    const backupCandidates = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.includes(".pre-import-") && entry.name.endsWith(".backup.db"))
      .map((entry) => path.join(directory, entry.name));
    const temporaryCandidates = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith(".") && entry.name.endsWith(".tmp.db"))
      .map((entry) => path.join(directory, entry.name));

    if (backupCandidates.length !== 1 && temporaryCandidates.length === 0) {
      return writeRecoveryReport(outputPath, "ambiguous_or_missing", {
        backupCount: backupCandidates.length,
        temporaryCount: temporaryCandidates.length
      });
    }

    if (backupCandidates.length === 1 && temporaryCandidates.length === 0) {
      const backupPath = backupCandidates[0];
      try {
        validateTemporaryDatabase(backupPath);
      } catch (error) {
        return writeRecoveryReport(outputPath, "backup_invalid", {
          reason: error instanceof Error ? error.message : String(error)
        });
      }

      const recoveryPath = path.join(
        directory,
        `.${path.basename(outputPath, path.extname(outputPath))}.${process.pid}-recovery.tmp.db`
      );
      fs.copyFileSync(backupPath, recoveryPath);
      validateTemporaryDatabase(recoveryPath);
      fs.renameSync(recoveryPath, outputPath);
      validateTemporaryDatabase(outputPath);
      return writeRecoveryReport(outputPath, "seed_recovered_from_backup", {
        backupPreserved: true
      });
    }

    if (backupCandidates.length === 0 && temporaryCandidates.length === 1) {
      const temporaryPath = temporaryCandidates[0];
      try {
        validateTemporaryDatabase(temporaryPath);
      } catch {
        return writeRecoveryReport(outputPath, "temporary_invalid", {
          reason: "temporary_no_importado_no_utilizado"
        });
      }
      fs.renameSync(temporaryPath, outputPath);
      validateTemporaryDatabase(outputPath);
      return writeRecoveryReport(outputPath, "seed_recovered_from_validated_temporary", {
        temporaryValidated: true
      });
    }

    return writeRecoveryReport(outputPath, "ambiguous_or_missing", {
      backupCount: backupCandidates.length,
      temporaryCount: temporaryCandidates.length
    });
  } finally {
    releaseImportLock(lockPath);
  }
}

function uniquePreImportBackupPath(outputPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = path.basename(outputPath, path.extname(outputPath));
  let sequence = 0;
  while (true) {
    const candidate = path.join(
      path.dirname(outputPath),
      `${baseName}.pre-import-${stamp}${sequence === 0 ? "" : `-${sequence}`}.backup.db`
    );
    if (!fs.existsSync(candidate)) return candidate;
    sequence++;
  }
}

function replaceSeedAfterValidation(outputPath, temporaryPath) {
  validateTemporaryDatabase(temporaryPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (!fs.existsSync(outputPath)) {
    fs.copyFileSync(temporaryPath, outputPath);
    fs.rmSync(temporaryPath, { force: true });
    return { replaced: true, previousBackupPath: null };
  }

  const previousBackupPath = uniquePreImportBackupPath(outputPath);
  let movedOriginal = false;
  try {
    fs.renameSync(outputPath, previousBackupPath);
    movedOriginal = true;
    fs.renameSync(temporaryPath, outputPath);
    if (!fs.existsSync(outputPath)) {
      throw new Error("El archivo de semilla sustituto no quedó disponible.");
    }
    validateTemporaryDatabase(outputPath);
    return { replaced: true, previousBackupPath };
  } catch (error) {
    if (movedOriginal && fs.existsSync(previousBackupPath)) {
      try {
        if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });
        fs.renameSync(previousBackupPath, outputPath);
      } catch (restoreError) {
        throw new Error(
          `Falló la sustitución y tampoco pudo restaurarse la semilla original: ${
            restoreError instanceof Error ? restoreError.message : String(restoreError)
          }`,
          { cause: restoreError }
        );
      }
    }
    throw error;
  }
}

function importMysqlDump(sourcePath, outputPath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error("Uso: node scripts/import-mysql-dump-to-sqlite.js <volcado-mysql.sql> [--output <seed.db>]");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const lockPath = acquireImportLock(outputPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath, path.extname(outputPath))}.${process.pid}-${stamp}.tmp.db`
  );
  if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });

  const db = new DatabaseSync(temporaryPath);
  let migratedPasswords;
  try {
    db.exec("PRAGMA foreign_keys=OFF; PRAGMA journal_mode=DELETE;");
    db.function("NOW", () => {
      const now = new Date();
      const pad = (value) => String(value).padStart(2, "0");
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    });
    db.exec(fs.readFileSync(schemaPath, "utf8"));
    db.exec("PRAGMA foreign_keys=OFF;");

    const inserts = collectInsertStatements(fs.readFileSync(sourcePath, "utf8"));
    db.exec("BEGIN");
    try {
      for (const statement of inserts) db.exec(normalizeMysqlStringEscapes(statement));
      alignOperationalDates(db);
      migratedPasswords = migratePlaintextPasswords(db);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    db.exec("PRAGMA foreign_keys=ON; VACUUM;");
    const tables = db.prepare(
      "SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).get();
    db.close();
    validateTemporaryDatabase(temporaryPath);
    const replacement = replaceSeedAfterValidation(outputPath, temporaryPath);
    console.log(
      `Base SQLite creada: ${tables.count} tablas, ${inserts.length} sentencias INSERT, ${migratedPasswords} contraseñas protegidas con bcrypt, ${path.relative(process.cwd(), outputPath)}`
    );
    releaseImportLock(lockPath);
    return replacement;
  } catch (error) {
    try {
      db.close();
    } catch {
      // La conexión ya pudo haberse cerrado durante la operación.
    }
    fs.rmSync(temporaryPath, { force: true });
    releaseImportLock(lockPath);
    throw error;
  }
}

if (require.main === module) {
  try {
    if (!fs.existsSync(outputPath)) recoverInterruptedSeed(outputPath);
    importMysqlDump(sourcePath, outputPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  collectInsertStatements,
  normalizeMysqlStringEscapes,
  migratePlaintextPasswords,
  validateTemporaryDatabase,
  writeRecoveryReport,
  recoverInterruptedSeed,
  acquireImportLock,
  releaseImportLock,
  replaceSeedAfterValidation,
  importMysqlDump
};
