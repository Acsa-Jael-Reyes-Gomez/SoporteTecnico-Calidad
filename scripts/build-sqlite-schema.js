const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "assets", "database", "schema.mysql.sql");
const outputPath = path.join(__dirname, "..", "assets", "database", "schema.sqlite.sql");

function splitDefinitions(body) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = body.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function normalizeColumn(definition) {
  const autoIncrement = /\bAUTO_INCREMENT\b/i.test(definition);
  let sql = definition
    .replace(/\bAUTO_INCREMENT\b/gi, "")
    .replace(/\bUNSIGNED\b/gi, "")
    .replace(/\b(?:CHARACTER\s+SET\s+\w+|COLLATE\s+\w+)\b/gi, "")
    .replace(/\b(?:TINYINT|SMALLINT|MEDIUMINT|BIGINT|INT|INTEGER)\s*\(\s*\d+\s*\)/gi, "INTEGER")
    .replace(/\b(?:TINYINT|SMALLINT|MEDIUMINT|BIGINT|INT)\b/gi, "INTEGER")
    .replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, "TEXT")
    .replace(/\bCHAR\s*\(\s*\d+\s*\)/gi, "TEXT")
    .replace(/\bENUM\s*\([^)]*\)/gi, "TEXT")
    .replace(/\bDECIMAL\s*\([^)]*\)/gi, "REAL")
    .replace(/\bDOUBLE(?:\s+PRECISION)?\b/gi, "REAL")
    .replace(/\bFLOAT\b/gi, "REAL")
    .replace(/\bDATETIME\b/gi, "TEXT")
    .replace(/\bTIMESTAMP\b/gi, "TEXT")
    .replace(/\bDATE\b/gi, "TEXT")
    .replace(/\s+/g, " ")
    .trim();

  if (autoIncrement) {
    sql = sql.replace(/\bINTEGER\b/i, "INTEGER PRIMARY KEY AUTOINCREMENT");
  }
  return sql;
}

function convertTable(name, body) {
  const columns = [];
  const tableConstraints = [];
  const indexes = [];
  const autoIncrementColumns = new Set();

  for (const definition of splitDefinitions(body)) {
    const key = definition.match(/^(UNIQUE\s+)?(?:KEY|INDEX)\s+`([^`]+)`\s*\(([^)]+)\)/i);
    if (key) {
      const unique = Boolean(key[1]);
      indexes.push(`CREATE ${unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS \`${key[2]}\` ON \`${name}\` (${key[3]});`);
      continue;
    }

    if (/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE\s+KEY|FOREIGN\s+KEY|CHECK)\b/i.test(definition)) {
      const normalized = definition
        .replace(/^CONSTRAINT\s+`[^`]+`\s+/i, "")
        .replace(/\bUNIQUE\s+KEY\b/gi, "UNIQUE")
        .replace(/\bON\s+UPDATE\s+RESTRICT\b/gi, "ON UPDATE NO ACTION")
        .replace(/\bON\s+DELETE\s+RESTRICT\b/gi, "ON DELETE NO ACTION")
        .replace(/\bON\s+UPDATE\s+CASCADE\b/gi, "ON UPDATE CASCADE")
        .replace(/\s+USING\s+BTREE\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      tableConstraints.push(normalized);
      continue;
    }

    if (/\bAUTO_INCREMENT\b/i.test(definition)) {
      const columnName = definition.match(/^`([^`]+)`/)?.[1];
      if (columnName) autoIncrementColumns.add(columnName);
    }
    columns.push(normalizeColumn(definition));
  }

  const filteredConstraints = tableConstraints.filter((constraint) => {
    const primary = constraint.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (!primary) return true;
    const primaryColumns = [...primary[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    return !(primaryColumns.length === 1 && autoIncrementColumns.has(primaryColumns[0]));
  });
  const definitions = [...columns, ...filteredConstraints].map((item) => `  ${item}`);
  return [`CREATE TABLE IF NOT EXISTS \`${name}\` (\n${definitions.join(",\n")}\n);`, ...indexes].join("\n");
}

const mysql = fs.readFileSync(sourcePath, "utf8");
const tables = [];
const pattern = /CREATE TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE\s*=\s*[^;]+;/gi;
for (const match of mysql.matchAll(pattern)) tables.push(convertTable(match[1], match[2]));

if (!tables.length) throw new Error("No se encontraron tablas en el esquema MySQL");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `PRAGMA foreign_keys = ON;\n\n${tables.join("\n\n")}\n`, "utf8");
console.log(`Esquema SQLite generado: ${tables.length} tablas en ${path.relative(process.cwd(), outputPath)}`);
