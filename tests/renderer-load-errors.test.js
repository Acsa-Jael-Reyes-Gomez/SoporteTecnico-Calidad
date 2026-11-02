const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(moduleName, apiName, responder) {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/renderer/modulos", moduleName), "utf8");
  const calls = [];
  const nodes = [];
  const host = { innerHTML: "", children: [], appendChild(node) { this.children.push(node); } };
  function el(tag, props = {}, children = []) {
    const node = { tag, props, children, value: props.value ?? "", textContent: "", innerHTML: "",
      appended: [], appendChild(child) { this.appended.push(child); } };
    nodes.push(node);
    return node;
  }
  const context = vm.createContext({
    el, session: { idUsuario: 1 },
    catalogos: { unidades: [], tecnicos: [], tiposEquipo: [] },
    can: () => true, isTecnico: () => false, isRutaSelectableTecnico: () => true,
    getSelectOptions: () => [],
    createSearchableSelect: () => ({ value: "", clear() { this.value = ""; } }),
    getMonthlyRange: () => ({ start: "2026-11-01", end: "2026-11-30" }),
    mysqlToDateValue: x => x, dateToMysqlStartOfDay: x => x + " 00:00:00",
    dateToMysqlEndOfDay: x => x + " 23:59:59",
    toUserText: (x, fallback) => String(x || fallback),
    getUserErrorMessage: (x, fallback) => x?.message || fallback,
    isSessionErrorMessage: x => /sesión|session/i.test(String(x || "")),
    LoginView: () => ({ login: true }),
    mount: x => calls.push(["mount", x]),
    formatDate: x => x || "—",
    compactIdHeader: () => [], tableHeadLabel: () => [],
    createTableFooterBar: config => { calls.push(["pager", config]); return el("footer"); },
    normalizeExcelTableHeaders: () => {},
    window: { api: { [apiName]: (...args) => { calls.push(["api", args]); return responder(...args); } },
      resetCatalogosState: () => calls.push(["reset"]) }
  });
  const names = Object.keys(context).filter(name => name !== "window");
  names.push("window");
  const factory = vm.runInThisContext(`(function(${names.join(",")}) {\n${source}\nreturn { renderEquipos: typeof renderEquipos === 'function' ? renderEquipos : undefined, renderRutas: typeof renderRutas === 'function' ? renderRutas : undefined, get session() { return session; } };\n})`, { filename: path.resolve(__dirname, "../src/renderer/modulos", moduleName) });
  const exposed = factory(...names.map(name => context[name]));
  context.renderEquipos = exposed.renderEquipos;
  context.renderRutas = exposed.renderRutas;
  Object.defineProperty(context, "session", { get: () => exposed.session, configurable: true });
  return { context, host, nodes, calls };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function textNode(h, value) { return h.nodes.find(n => n.textContent.includes(value)); }
function buttons(h, word) {
  return h.nodes.filter(n => n.tag === "button" && JSON.stringify(n.children).includes(word));
}

test("equipos: rechazo de API muestra error recuperable y permite reintentar", async () => {
  let count = 0;
  const h = setup("equipos-y-envios.js", "equipos_list", () => {
    if (++count === 1) return Promise.reject(new Error("Falla sintética de red"));
    return Promise.resolve({ ok: true, page: 1, total: 0, data: [] });
  });
  h.context.renderEquipos(h.host);
  await settle();
  assert.ok(textNode(h, "Falla sintética de red"));
  assert.ok(h.nodes.some(n => n.props.class === "card small error"));
  buttons(h, "Buscar")[0].props.onclick();
  await settle();
  assert.ok(textNode(h, "Página 1"));
  assert.equal(count, 2);
});

test("equipos: búsqueda y paginación ignoran acciones repetidas durante carga", async () => {
  let release;
  const h = setup("equipos-y-envios.js", "equipos_list", () => new Promise(resolve => { release = resolve; }));
  h.context.renderEquipos(h.host);
  const search = buttons(h, "Buscar")[0];
  search.props.onclick();
  assert.equal(h.calls.filter(x => x[0] === "api").length, 1);
  release({ ok: true, page: 1, total: 0, data: [] });
  await settle();
  const pager = h.calls.find(x => x[0] === "pager")[1];
  pager.onPageChange(1);
  assert.equal(h.calls.filter(x => x[0] === "api").length, 1);
  pager.onPageSizeChange(50);
  assert.equal(h.calls.filter(x => x[0] === "api").length, 2);
  release({ ok: true, page: 1, total: 0, data: [] });
  await settle();
});

test("equipos: limpiar filtros restaura fechas y ejecuta nueva consulta", async () => {
  const h = setup("equipos-y-envios.js", "equipos_list", async () => ({ ok: true, page: 1, total: 0, data: [] }));
  h.context.renderEquipos(h.host);
  await settle();
  const dates = h.nodes.filter(n => n.tag === "input" && n.props.type === "date");
  dates[0].value = "2026-01-01";
  buttons(h, "Limpiar")[0].props.onclick();
  await settle();
  assert.equal(dates[0].value, "2026-11-01");
  assert.equal(h.calls.filter(x => x[0] === "api").length, 2);
});

test("rutas: fallo de consulta muestra error sin bloquear un nuevo intento", async () => {
  let count = 0;
  const h = setup("rutas-y-reportes.js", "rutas_list", async () => {
    if (++count === 1) throw new Error("Falla sintética de rutas");
    return { ok: true, page: 1, total: 0, data: [] };
  });
  h.context.renderRutas(h.host);
  await settle();
  assert.ok(textNode(h, "Falla sintética de rutas"));
  buttons(h, "Buscar")[0].props.onclick();
  await settle();
  assert.ok(textNode(h, "Página 1"));
});

test("rutas: sesión expirada restablece catálogos y muestra acceso", async () => {
  const h = setup("rutas-y-reportes.js", "rutas_list", async () => {
    throw new Error("Sesión inválida");
  });
  h.context.renderRutas(h.host);
  await settle();
  assert.ok(h.calls.some(x => x[0] === "reset"));
  assert.ok(h.calls.some(x => x[0] === "mount"));
  assert.equal(h.context.session, null);
});

test("rutas: paginación y limpieza de filtros mantienen búsquedas operativas", async () => {
  const h = setup("rutas-y-reportes.js", "rutas_list", async () => ({ ok: true, page: 1, total: 0, data: [] }));
  h.context.renderRutas(h.host);
  await settle();
  const pager = h.calls.find(x => x[0] === "pager")[1];
  pager.onPageChange(2);
  await settle();
  assert.equal(h.calls.filter(x => x[0] === "api").length, 2);
  pager.onPageSizeChange(50);
  await settle();
  buttons(h, "Limpiar")[0].props.onclick();
  await settle();
  assert.equal(h.calls.filter(x => x[0] === "api").length, 4);
});
