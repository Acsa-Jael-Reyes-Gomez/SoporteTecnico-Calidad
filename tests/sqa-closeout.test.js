const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");
const { SqliteConnection } = require("../dist/main/db/sqlite_connection");
const security = require("../dist/main/services/export_security");

function declaration(file, name) {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/renderer/modulos", file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = parsed.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, name);
  return node.getText(parsed);
}

test("SQA: SQL conserva agregaciones DISTINCT y DATEDIFF sin reescritura redundante", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE nombres (nombre TEXT); INSERT INTO nombres VALUES ('Ana'), ('Ana'), ('Bea')");
    db.function("DATEDIFF", (left, right) => left.length - right.length);
    const c = new SqliteConnection(db);
    const [rows] = c.execute("SELECT GROUP_CONCAT(DISTINCT nombre ORDER BY nombre SEPARATOR ', ') AS nombres FROM nombres");
    assert.deepEqual(rows[0].nombres.split(",").sort(), ["Ana", "Bea"]);
    assert.equal(c.execute("SELECT GROUP_CONCAT(nombre) AS nombres FROM nombres")[0][0].nombres, "Ana,Ana,Bea");
    assert.equal(c.execute("SELECT DATEDIFF(CURRENT_TIMESTAMP, 'x') AS dias")[0][0].dias, 18);
    assert.equal(c.execute("SELECT GROUP_CONCAT(DISTINCT nombre ORDER\nBY nombre SEPARATOR ',') AS nombres FROM nombres")[0][0].nombres, "Ana,Bea");
  } finally { db.close(); }
});

test("SQA: nombres de exportación largos conservan saneamiento, extensión y límites", () => {
  assert.equal(security.sanitizeExportFilename("reporte" + ". ".repeat(10000)), "reporte.xlsx");
  assert.equal(security.sanitizeExportFilename("reporte?.csv"), "reporte_.xlsx");
  assert.equal(security.sanitizeExportFilename("Reporte.XLSX"), "Reporte.XLSX");
  assert.equal(security.sanitizeExportFilename("... "), "Reporte.xlsx");
  assert.equal(security.sanitizeSheetName("'".repeat(10000) + "Resumen: julio/2026" + "'".repeat(10000)), "Resumen julio 2026");
  assert.equal(security.sanitizeSheetName("'''"), "Reporte");
  assert.equal(security.sanitizeSheetName("x".repeat(100)), "x".repeat(31));
});

test("SQA: paginación devuelve números y puntos suspensivos según el rango real", () => {
  const context = vm.createContext({});
  vm.runInContext(declaration("compartido.js", "getPagerItems"), context);
  assert.deepEqual(Array.from(context.getPagerItems(4, 2)), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(context.getPagerItems(20, 10)), [1, "...", 9, 10, 11, "...", 20]);
  const h = rendererHarness("calificacion-y-panel.js", () => Promise.resolve({ ok: true }));
  h.context.document.body = { appendChild() {} };
  h.context.debounce = fn => fn;
  vm.runInContext("const _searchableSelectInstances = new Set(); const _globalClickHandlers = new Set(); const _globalScrollHandlers = new Set(); const _globalResizeHandlers = new Set();", h.context);
  vm.runInContext(declaration("compartido.js", "createSearchableSelect"), h.context);
  assert.equal(h.context.createSearchableSelect([], "Seleccione").value, "");
  assert.equal(h.context.createSearchableSelect([{ value: 0, label: "Cero" }], "Seleccione", 0).value, "0");
});

test("SQA: los scripts comparten la declaración léxica sin crear session ni catalogos implícitos", () => {
  const shared = fs.readFileSync(path.resolve(__dirname, "../src/renderer/modulos/compartido.js"), "utf8");
  const context = vm.createContext({ window: {}, document: {}, console });
  vm.runInContext(shared, context);
  vm.runInContext("catalogos = { unidades: [1] }; session = { idUsuario: 7 }; let promesaCatalogos = null; let catalogosRequestVersion = 0;", context);
  vm.runInContext(declaration("autenticacion.js", "resetCatalogosState"), context);
  context.resetCatalogosState();
  assert.equal(vm.runInContext("catalogos", context), null);
  assert.equal(vm.runInContext("session.idUsuario", context), 7);
  assert.equal(Object.hasOwn(context, "session"), false);
  assert.equal(Object.hasOwn(context, "catalogos"), false);
});

function rendererHarness(file, responder) {
  const nodes = [], calls = [], pagers = [];
  function el(tag, props = {}, children = []) {
    const node = { tagName: tag.toUpperCase(), props, children: Array.isArray(children) ? [...children] : [children], value: props.value ?? "", textContent: "", innerHTML: "", style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild(child) { this.children.push(child); return child; },
      addEventListener(name, fn) { this[name] = fn; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return { querySelector: () => null }; },
      setAttribute() {}, removeEventListener() {} };
    nodes.push(node); return node;
  }
  const byId = id => nodes.find(n => n.props.id === id) || el("div", { id });
  const context = vm.createContext({ console, el, session: { idUsuario: 1 }, catalogos: { unidades: [], tecnicos: [] },
    cleanupAllDropdowns() {}, can: () => true, getSelectOptions: () => [],
    createSearchableSelect: () => ({ value: "", clear() { this.value = ""; } }),
    getMonthlyRange: () => ({ start: "2026-10-26", end: "2026-11-25" }), mysqlToDateValue: x => x,
    dateToMysqlStartOfDay: x => x, dateToMysqlEndOfDay: x => x,
    getUserErrorMessage: (e, fallback) => e?.message || fallback,
    toast: (message) => calls.push(["toast", message]),
    normalizeExcelTableHeaders() {}, requestAnimationFrame: fn => fn(),
    compactIdHeader: () => "", tableHeadLabel: () => "",
    createTableFooterBar: p => { pagers.push(p); return el("footer"); },
    document: { querySelectorAll: () => [], querySelector: () => el("div"), getElementById: byId, removeEventListener() {} },
    window: { api: new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, args]); return responder(name); } }), moduloProyectosEspeciales: {} }
  });
  const source = fs.readFileSync(path.resolve(__dirname, "../src/renderer/modulos", file), "utf8");
  vm.runInContext(source, context, { filename: path.resolve(__dirname, "../src/renderer/modulos", file) });
  return { context, host: el("div"), nodes, calls, pagers };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("SQA: proyectos muestra rechazo de IPC y permite recuperación desde Buscar y Limpiar", async () => {
  let reject = true;
  const h = rendererHarness("proyectos-especiales/vista-proyectos-especiales.js", () => reject ? Promise.reject(new Error("Falla sintética")) : Promise.resolve({ ok: true, data: [], total: 0 }));
  h.context.window.renderProyectosEspecialesImpl(h.host);
  await settle();
  assert.ok(h.calls.some(c => c[0] === "toast" && c[1] === "Falla sintética"));
  reject = false;
  const button = text => h.nodes.find(n => n.tagName === "BUTTON" && n.children.includes(text));
  button(" Buscar").click(); await settle();
  button(" Limpiar").click(); await settle();
  assert.equal(h.calls.filter(c => c[0] === "proyectos_especiales_list").length, 3);
  assert.ok(h.pagers.length >= 1);
});

test("SQA: calificación y dashboard controlan rechazo de IPC sin promesas sin manejar", async () => {
  const h = rendererHarness("calificacion-y-panel.js", () => Promise.reject(new Error("Falla de panel sintética")));
  h.context.renderCalificacion(h.host);
  h.context.renderDashboard(h.host);
  await settle();
  assert.ok(h.calls.some(c => c[0] === "dashboard_operacion_mensual"));
  assert.ok(h.calls.some(c => c[0] === "toast" && c[1] === "Falla de panel sintética"));
  assert.ok(h.nodes.some(n => n.textContent.includes("Falla de panel sintética")));
});
