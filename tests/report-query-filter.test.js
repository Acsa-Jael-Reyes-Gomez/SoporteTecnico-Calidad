const test = require("node:test");
const assert = require("node:assert/strict");

const {
  appendSearchFilter,
  validateReportFilters
} = require("../dist/main/services/report_query_service.js");

test("agrega filtros parametrizados para una búsqueda válida", () => {
  const where = [];
  const params = [];

  appendSearchFilter(
    where,
    params,
    "impresora",
    ["t.descripcion", "t.observaciones"]
  );

  assert.equal(
    where[0],
    "(t.descripcion LIKE ? OR t.observaciones LIKE ?)"
  );

  assert.deepEqual(params, [
    "%impresora%",
    "%impresora%"
  ]);
});

test("ignora búsquedas vacías", () => {
  const where = [];
  const params = [];

  appendSearchFilter(
    where,
    params,
    "   ",
    ["t.descripcion"]
  );

  assert.equal(where.length, 0);
  assert.equal(params.length, 0);
});

test("no agrega filtros cuando no existen columnas", () => {
  const where = [];
  const params = [];

  appendSearchFilter(
    where,
    params,
    "prueba",
    []
  );

  assert.equal(where.length, 0);
  assert.equal(params.length, 0);
});

test("rechaza nombres de columnas SQL inválidos", () => {
  const where = [];
  const params = [];

  assert.throws(
    () => appendSearchFilter(
      where,
      params,
      "prueba",
      ["nombre; DROP TABLE tickets"]
    ),
    /Configuración interna de búsqueda inválida/
  );

  assert.equal(where.length, 0);
  assert.equal(params.length, 0);
});

test("elimina espacios externos del texto buscado", () => {
  const where = [];
  const params = [];

  appendSearchFilter(
    where,
    params,
    "  soporte técnico  ",
    ["descripcion"]
  );

  assert.deepEqual(params, ["%soporte técnico%"]);
});

test("valida filtros de reportes sin fechas", () => {
  const filters = { estado: "Cerrado" };

  assert.deepEqual(
    validateReportFilters(filters),
    filters
  );
});

test("devuelve filtros vacíos cuando no se proporcionan", () => {
  assert.deepEqual(validateReportFilters(), {});
});
