const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectInsertStatements,
  normalizeMysqlStringEscapes
} = require("../scripts/import-mysql-dump-to-sqlite.js");

test("identifica instrucciones INSERT e ignora comentarios", () => {
  const sql = [
    "-- Comentario inicial",
    "CREATE TABLE ejemplo (id INTEGER);",
    "INSERT INTO ejemplo VALUES (1, 'Primero');",
    "INSERT INTO ejemplo VALUES (2, 'Segundo');"
  ].join("\n");

  const statements = collectInsertStatements(sql);

  assert.equal(statements.length, 2);
  assert.match(statements[0], /Primero/);
  assert.match(statements[1], /Segundo/);
});

test("reconoce INSERT dividido en varias líneas", () => {
  const sql = [
    "INSERT INTO ejemplo",
    "VALUES (1, 'Prueba');"
  ].join("\n");

  const statements = collectInsertStatements(sql);

  assert.equal(statements.length, 1);
  assert.match(statements[0], /Prueba/);
});

test("rechaza instrucciones INSERT incompletas", () => {
  const sql = "INSERT INTO ejemplo VALUES (1, 'Sin terminar')";

  assert.throws(
    () => collectInsertStatements(sql),
    /INSERT sin terminar/
  );
});

test("ignora instrucciones posteriores a la sección de procedimientos", () => {
  const sql = [
    "INSERT INTO ejemplo VALUES (1);",
    "-- Procedure structure",
    "INSERT INTO ejemplo VALUES (2);"
  ].join("\n");

  const statements = collectInsertStatements(sql);

  assert.equal(statements.length, 1);
  assert.match(statements[0], /VALUES \(1\)/);
});

test("normaliza escapes de salto de línea y tabulación", () => {
  const sql = String.raw`INSERT INTO ejemplo VALUES ('Linea\nDos\tDato');`;

  const result = normalizeMysqlStringEscapes(sql);

  assert.ok(result.includes("\n"));
  assert.ok(result.includes("\t"));
});

test("convierte comillas escapadas en cadenas SQL", () => {
  const sql = String.raw`INSERT INTO ejemplo VALUES ('O\'Brien');`;

  const result = normalizeMysqlStringEscapes(sql);

  assert.match(result, /O''Brien/);
});

test("conserva texto SQL que no necesita normalización", () => {
  const sql = "INSERT INTO ejemplo VALUES (1, 'Normal');";

  assert.equal(normalizeMysqlStringEscapes(sql), sql);
});

test("conserva puntos y coma dentro de cadenas SQL", () => {
  const sql = "INSERT INTO ejemplo VALUES (1, 'Texto; con separador');";

  const statements = collectInsertStatements(sql);

  assert.equal(statements.length, 1);
  assert.match(statements[0], /Texto; con separador/);
});

test("reconoce comillas duplicadas y cadenas con comillas dobles", () => {
  const sql = [
    "INSERT INTO ejemplo VALUES (1, 'O''Brien');",
    'INSERT INTO ejemplo VALUES (2, "Texto; de prueba");'
  ].join("\n");

  const statements = collectInsertStatements(sql);

  assert.equal(statements.length, 2);
  assert.match(statements[0], /O''Brien/);
  assert.match(statements[1], /Texto; de prueba/);
});

test("normaliza retornos, barras y caracteres escapados de MySQL", () => {
  const sql = String.raw`INSERT INTO ejemplo VALUES ('A\rB\\C\0D\Z');`;

  const result = normalizeMysqlStringEscapes(sql);

  assert.ok(result.includes("\r"));
  assert.ok(result.includes("\\"));
  assert.ok(result.includes("\0"));
  assert.ok(result.includes("\x1a"));
});
