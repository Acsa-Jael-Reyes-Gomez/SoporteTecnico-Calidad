const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const sourcePath = path.resolve(process.argv[2] || "");
const outputPath = path.join(__dirname, "..", "assets", "database", "seed.db");
const schemaPath = path.join(__dirname, "..", "assets", "database", "schema.sqlite.sql");

if (!process.argv[2] || !fs.existsSync(sourcePath)) {
  throw new Error("Uso: node scripts/import-mysql-dump-to-sqlite.js <volcado-mysql.sql>");
}

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

if (fs.existsSync(outputPath)) fs.rmSync(outputPath);
const db = new DatabaseSync(outputPath);
db.exec("PRAGMA foreign_keys=OFF; PRAGMA journal_mode=DELETE;");
db.exec(fs.readFileSync(schemaPath, "utf8"));
db.exec("PRAGMA foreign_keys=OFF;");

const inserts = collectInsertStatements(fs.readFileSync(sourcePath, "utf8"));
db.exec("BEGIN");
try {
  for (const statement of inserts) db.exec(normalizeMysqlStringEscapes(statement));
  alignOperationalDates(db);
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  db.close();
  fs.rmSync(outputPath, { force: true });
  throw error;
}

db.exec("PRAGMA foreign_keys=ON; VACUUM;");
const tables = db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get();
db.close();
console.log(`Base SQLite creada: ${tables.count} tablas, ${inserts.length} sentencias INSERT, ${path.relative(process.cwd(), outputPath)}`);
