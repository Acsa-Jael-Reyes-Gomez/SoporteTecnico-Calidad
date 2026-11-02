const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../src/renderer/modulos/equipos-y-envios.js");
const source = fs.readFileSync(sourcePath, "utf8");

function setup({ allowed = true } = {}) {
  const notices = [];
  const modals = [];
  function el(tag, props = {}, children = []) {
    return { tag, props, children, value: props.value ?? "", textContent: "", innerHTML: "" };
  }
  const context = vm.createContext({
    el,
    can: () => allowed,
    toast: (...args) => notices.push(args),
    Modal: (title, body, actions) => {
      const modal = { title, body, actions };
      modals.push(modal);
      return modal;
    },
    catalogos: {
      unidades: [{ idUnidad: 1, nombre: "Sucursal prueba" }],
      tecnicos: [{ idUsuario: 2, nombre: "Técnico ficticio" }],
      tiposEquipo: [{ idTipoEquipo: 3, nombre: "Laptop" }]
    },
    formatDate: (value) => value || "—"
  });
  const names = ["el", "can", "toast", "Modal", "catalogos", "formatDate"];
  const factory = vm.runInThisContext(`(function(${names.join(",")}) {\n${source}\nreturn { EquipoModal, renderEquipos };\n})`, { filename: sourcePath });
  Object.assign(context, factory(...names.map(name => context[name])));
  return { context, notices, modals };
}

function flatten(node) {
  if (node == null) return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (typeof node !== "object") return [String(node)];
  return flatten(node.children);
}

test("EquipoModal informa cuando no existe equipo sin abrir ventana", () => {
  const h = setup();
  assert.equal(h.context.EquipoModal(null), null);
  assert.equal(h.modals.length, 0);
  assert.match(h.notices[0][0], /No se encontró información/);
});

test("EquipoModal presenta información real del equipo y catálogos", () => {
  const h = setup();
  const modal = h.context.EquipoModal({
    idTicket: 18, numeroEquipo: "EQ-18", idUnidad: 1,
    idTecnicoAsignado: 2, idTipoEquipo: 3,
    fechaRecibido: "2026-11-01", estado: "EN_TALLER"
  });
  assert.match(modal.title, /EQ-18.*EN_TALLER/);
  const rendered = flatten(modal.body).join(" ");
  for (const expected of ["#18", "EQ-18", "Sucursal prueba", "Técnico ficticio", "Laptop", "2026-11-01", "PENDIENTE"]) {
    assert.ok(rendered.includes(expected), expected);
  }
  assert.ok(!rendered.includes("Salida"));
});

test("EquipoModal muestra fecha de salida y resultado de solución", () => {
  const h = setup();
  const modal = h.context.EquipoModal({
    numeroEquipo: "EQ-19", estado: "ENTREGADO",
    fechaRecibido: "2026-10-01", fechaSalida: "2026-10-03",
    resultado: "CON_SOLUCION"
  });
  const rendered = flatten(modal.body).join(" ");
  assert.ok(rendered.includes("Salida"));
  assert.ok(rendered.includes("2026-10-03"));
  assert.ok(rendered.includes("CON_SOLUCION"));
});

test("EquipoModal muestra resultado sin solución y valores de respaldo", () => {
  const h = setup();
  const modal = h.context.EquipoModal({
    idEquipoControl: 77, resultado: "SIN_SOLUCION"
  });
  assert.match(modal.title, /77.*EN_TALLER/);
  assert.ok(flatten(modal.body).join(" ").includes("SIN_SOLUCION"));
});

test("renderEquipos bloquea el acceso sin permiso antes de consultar datos", () => {
  const h = setup({ allowed: false });
  const host = { innerHTML: "" };
  h.context.renderEquipos(host);
  assert.match(host.innerHTML, /Sin acceso/);
  assert.match(host.innerHTML, /EQUIPOS_VIEW/);
});
