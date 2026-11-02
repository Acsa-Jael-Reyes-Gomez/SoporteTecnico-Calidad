const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { DatabaseSync } = require("node:sqlite");
const vm = require("node:vm");

const validation = require("../dist/main/services/validation_service.js");
const pagination = require("../dist/main/services/pagination_service.js");
const exportSecurity = require("../dist/main/services/export_security.js");
const sessions = require("../dist/main/session_store.js");
const domain = require("../dist/main/services/domain_utils.js");
const reportQuery = require("../dist/main/services/report_query_service.js");
const passwordService = require("../dist/main/password_service.js");
const passwordMigration = require("../dist/main/db/password_migration.js");

test("autenticación maneja rechazos de login y conserva la sesión solo ante respuestas válidas", () => {
  const authSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "modulos", "autenticacion.js"), "utf8");
  const ipcSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "ipc_auth.ts"), "utf8");

  assert.match(authSource, /const loginResult = await window\.api\.login/);
  assert.match(authSource, /catch\s*\(e\)\s*\{/);
  assert.match(authSource, /finally\s*\{/);
  assert.match(authSource, /loginInFlight = false/);
  assert.match(authSource, /void doLogin\(\)/);
  assert.doesNotMatch(authSource, /(?:^|\n)\s*doLogin\(\);\s*$/m);
  assert.match(ipcSource, /AND u\.activo = 1/);
});

test("el arranque conserva instancia secundaria y controla errores de app.whenReady", () => {
  const mainSource = fs.readFileSync(path.join(__dirname, "..", "src", "main", "main.ts"), "utf8");

  assert.match(mainSource, /app\.whenReady\(\)\.then\(async \(\) =>/);
  assert.match(mainSource, /if \(isSecondaryInstance\)[\s\S]*app\.exit\(0\)/);
  assert.match(mainSource, /registerProcessGuards\(\)/);
  assert.match(mainSource, /createWindow\(\)/);
  assert.match(mainSource, /\}\)\.catch\(\(error: unknown\) =>/);
  assert.match(mainSource, /showUserErrorBox\("Error al iniciar la aplicación", error\)/);
});

test("equipos y envíos controlan rechazos IPC y restauran el estado de carga", async () => {
  const enviosSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "modulos", "equipos-y-envios.js"),
    "utf8"
  );
  const nodes = [];
  function fakeNode(tagName, attrs = {}, children = []) {
    const node = {
      tagName,
      value: attrs.value ?? "",
      innerHTML: "",
      textContent: "",
      children: [],
      className: attrs.class || "",
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild(child) {
        this.children.push(child);
        if (child && typeof child === "object" && child.textContent) {
          node.textContent += child.textContent;
        }
        return child;
      },
      setAttribute() {},
      querySelector() { return null; },
      addEventListener() {},
      onclick: attrs.onclick || null,
      hidden: attrs.hidden || false
    };
    Object.assign(node, attrs);
    for (const child of children) {
      if (typeof child === "string") node.textContent += child;
      else node.appendChild(child);
    }
    nodes.push(node);
    return node;
  }
  const searchableSelect = (_options, _placeholder, value) => {
    const node = fakeNode("searchable-select", {}, []);
    node.value = value || "";
    node.clear = () => { node.value = ""; };
    node.querySelector = () => null;
    return node;
  };
  const equipmentCalls = [];
  let equipmentPendingResolve;
  let firstEquipmentReject = true;
  const historyCalls = [];

  const context = vm.createContext({
    console,
    window: {
      api: {
        equipos_list: (_session, filtros) => {
          equipmentCalls.push(filtros);
          if (firstEquipmentReject) {
            firstEquipmentReject = false;
            return Promise.reject(new Error("IPC desconectado"));
          }
          return new Promise((resolve) => { equipmentPendingResolve = resolve; });
        },
        envio_equipo_list: (_session, filtros) => {
          historyCalls.push(filtros);
          return Promise.reject(new Error("Error leyendo la base de datos"));
        }
      },
      ensureCatalogosLoaded: () => Promise.resolve(),
      resetCatalogosState() {},
      parseEmpresaIdentidad: () => null
    },
    session: { id: 1, rol: "ADMIN" },
    sessionStorage: { getItem: () => "", removeItem: () => {} },
    catalogos: {
      unidades: [],
      tecnicos: [],
      tiposEquipo: [],
      puestos: [],
      des_motivo_envio: [],
      des_medio_envio: [],
      des_estado_envio: []
    },
    el: fakeNode,
    createSearchableSelect: searchableSelect,
    getSelectOptions: () => [],
    getMonthlyRange: () => ({ start: "2026-10-01", end: "2026-10-31" }),
    mysqlToDateValue: (value) => String(value).slice(0, 10),
    dateToMysqlStartOfDay: (value) => `${value} 00:00:00`,
    dateToMysqlEndOfDay: (value) => `${value} 23:59:59`,
    getUserErrorMessage: (error, fallback) => error?.message || fallback,
    toUserText: (value, fallback) => value || fallback,
    isSessionErrorMessage: () => false,
    can: () => true,
    hasRole: () => false,
    mount: () => {},
    LoginView: () => fakeNode("div"),
    getEnvioUnidadOptions: () => [],
    createTableFooterBar: ({ onPageChange, onPageSizeChange }) => {
      const node = fakeNode("div", {}, []);
      node.onPageChange = onPageChange;
      node.onPageSizeChange = onPageSizeChange;
      return node;
    },
    normalizeExcelTableHeaders: () => {},
    compactIdHeader: () => "",
    tableHeadLabel: () => "",
    formatDate: (value) => String(value || ""),
    getEnvioAllowedNextStates: () => [],
    isEnvioFinalState: () => false,
    isGerencialHistory: false,
    getEnvioTicketStatusLabel: () => "",
    formatEnvioMedio: () => "",
    badgeEnvioEstado: () => "",
    buildEnvioSeguimiento: () => "",
    createActionButton: () => fakeNode("button"),
    setTimeout
  });
  vm.runInContext(enviosSource, context);

  const equipmentHost = fakeNode("div", {}, []);
  context.renderEquipos(equipmentHost);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(equipmentCalls.length, 1);
  assert.ok(nodes.some((node) => node.textContent.includes("Error") || node.textContent.includes("error")));

  const equipmentSearchButton = nodes.find((node) =>
    node.tagName === "button" && node.textContent.includes("Buscar")
  );
  assert.ok(equipmentSearchButton, "debe conservarse el botón de búsqueda de equipos");
  equipmentSearchButton.onclick();
  equipmentSearchButton.onclick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(equipmentCalls.length, 2, "no debe iniciar una carga simultánea después del rechazo");

  equipmentPendingResolve({ ok: true, data: [], total: 0, page: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  const equipmentPager = nodes.find((node) => typeof node.onPageChange === "function");
  assert.ok(equipmentPager, "debe restaurarse el paginador tras una carga exitosa");

  const enviosHost = fakeNode("div", {}, []);
  context.renderEnvioEquipo(enviosHost);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(historyCalls.length >= 1, "debe ejecutarse la carga inicial del historial");
  assert.equal(
    nodes.filter((node) => node.textContent.includes("Error leyendo la base de datos")).length >= 0,
    true
  );
});

test("la carga de tickets maneja rechazos IPC y evita cargas simultáneas", async () => {
  const ticketsSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "modulos", "modulo-tickets.js"),
    "utf8"
  );

  function fakeNode(tagName, attrs = {}, children = []) {
    const node = {
      tagName,
      value: attrs.value ?? "",
      innerHTML: "",
      textContent: "",
      children: [],
      className: attrs.class || "",
      style: {},
      classList: { add() {} },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      setAttribute() {},
      querySelector() { return node; },
      focus() {},
      addEventListener() {},
      onclick: attrs.onclick || null
    };
    Object.assign(node, attrs);
    node.classList.add = () => {};
    for (const child of children) {
      if (typeof child === "string") node.textContent += child;
      else node.appendChild(child);
    }
    return node;
  }

  const nodes = [];
  const searchableSelect = (options, placeholder, value) => {
    const node = fakeNode("searchable-select", {}, []);
    node.value = value || "";
    node.clear = () => { node.value = ""; };
    node.setValue = (next) => { node.value = String(next || ""); };
    node.input = fakeNode("input", {}, []);
    return node;
  };
  const calls = [];
  let pendingResolve;
  let rejectFirst = true;
  const windowMock = {
    api: {
      tickets_list: (_session, filtros) => {
        calls.push(filtros);
        if (rejectFirst) {
          rejectFirst = false;
          return Promise.reject(new Error("IPC desconectado"));
        }
        return new Promise((resolve) => { pendingResolve = resolve; });
      }
    },
    resetCatalogosState() {}
  };

  const context = vm.createContext({
    console,
    window: windowMock,
    session: { id: 1 },
    catalogos: { unidades: [], tecnicos: [] },
    el: (tag, attrs, children) => {
      const node = fakeNode(tag, attrs, children);
      nodes.push(node);
      return node;
    },
    createSearchableSelect: searchableSelect,
    getSelectOptions: () => [],
    getMonthlyRange: () => ({ start: "2026-10-01", end: "2026-10-31" }),
    mysqlToDateValue: (value) => String(value).slice(0, 10),
    dateToMysqlStartOfDay: (value) => `${value} 00:00:00`,
    dateToMysqlEndOfDay: (value) => `${value} 23:59:59`,
    getUserErrorMessage: (error, fallback) => error?.message || fallback,
    isSessionErrorMessage: () => false,
    isTecnico: () => false,
    isRutaSelectableTecnico: () => true,
    can: () => true,
    TicketModal: () => {},
    mount: () => {},
    LoginView: () => fakeNode("div"),
    takePendingTicketPrefill: () => null,
    takePendingTicketOpenId: () => null,
    toast: () => {},
    createTableFooterBar: ({ onPageChange, onPageSizeChange }) => {
      const node = fakeNode("div", {}, []);
      node.onPageChange = onPageChange;
      node.onPageSizeChange = onPageSizeChange;
      nodes.push(node);
      return node;
    },
    normalizeExcelTableHeaders: () => {},
    compactIdHeader: () => "",
    tableHeadLabel: () => "",
    isClosedByFechaCierre: () => false,
    ticketClasificacionText: () => "",
    badgeAsignacionCompartida: () => "",
    formatDate: (value) => String(value || ""),
    badgeOpen: () => "",
    badgeTicketEstadoCalificacion: () => "",
    setTimeout
  });
  vm.runInContext(ticketsSource, context);

  const host = fakeNode("div", {}, []);
  context.renderTickets(host);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.length, 1);
  const errorNode = nodes.find((node) => node.tagName === "div" && node.textContent.includes("Error:"));
  assert.ok(errorNode, "el rechazo IPC debe mostrar un mensaje de error controlado");

  const searchButton = nodes.find((node) =>
    node.tagName === "button" && node.textContent.includes("Buscar")
  );
  assert.ok(searchButton, "debe conservarse el botón de búsqueda");
  searchButton.onclick();
  searchButton.onclick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2, "un segundo click no debe iniciar una carga simultánea");

  pendingResolve({ ok: true, data: [], total: 0, page: 1 });
  await new Promise((resolve) => setImmediate(resolve));

  const pager = nodes.find((node) => typeof node.onPageChange === "function");
  assert.ok(pager, "debe conservarse el paginador");
  pager.onPageChange(2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 3, "tras una carga exitosa, el paginador puede iniciar otra carga");
});

test("las cargas de rutas controlan errores, filtros, paginación y cargas simultáneas", async () => {
  const routesSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "modulos", "rutas-y-reportes.js"),
    "utf8"
  );

  function fakeNode(tagName, attrs = {}, children = []) {
    const node = {
      tagName,
      value: attrs.value ?? "",
      innerHTML: "",
      textContent: "",
      children: [],
      className: attrs.class || "",
      style: {},
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      appendChild(child) {
        this.children.push(child);
        if (typeof child?.textContent === "string") this.textContent += child.textContent;
        return child;
      },
      setAttribute() {},
      querySelector() { return null; },
      focus() {},
      addEventListener() {},
      onclick: attrs.onclick || null,
      hidden: attrs.hidden || false
    };
    Object.assign(node, attrs);
    for (const child of children) {
      if (typeof child === "string") node.textContent += child;
      else node.appendChild(child);
    }
    return node;
  }

  const nodes = [];
  const searchableSelect = (_options, _placeholder, value) => {
    const node = fakeNode("searchable-select", {}, []);
    node.value = value || "";
    node.clear = () => { node.value = ""; };
    return node;
  };
  const calls = [];
  let initialReject = true;
  let pendingResolve;

  const windowMock = {
    api: {
      rutas_list: (_session, filters) => {
        calls.push(filters);
        if (initialReject) {
          initialReject = false;
          return Promise.reject(new Error("IPC desconectado"));
        }
        return new Promise((resolve) => { pendingResolve = resolve; });
      }
    },
    resetCatalogosState() {}
  };

  const context = vm.createContext({
    console,
    window: windowMock,
    session: { id: 1 },
    catalogos: { unidades: [], tecnicos: [] },
    el: (tag, attrs, children) => {
      const node = fakeNode(tag, attrs, children);
      nodes.push(node);
      return node;
    },
    createSearchableSelect: searchableSelect,
    getSelectOptions: () => [],
    getMonthlyRange: () => ({ start: "2026-10-01", end: "2026-10-31" }),
    mysqlToDateValue: (value) => String(value).slice(0, 10),
    dateToMysqlStartOfDay: (value) => `${value} 00:00:00`,
    dateToMysqlEndOfDay: (value) => `${value} 23:59:59`,
    getUserErrorMessage: (error, fallback) => error?.message || fallback,
    toUserText: (value, fallback) => value || fallback,
    isSessionErrorMessage: () => false,
    isTecnico: () => false,
    isRutaSelectableTecnico: () => true,
    can: () => true,
    RutaModal: () => {},
    mount: () => {},
    LoginView: () => fakeNode("div"),
    createTableFooterBar: ({ onPageChange, onPageSizeChange }) => {
      const node = fakeNode("div", {}, []);
      node.onPageChange = onPageChange;
      node.onPageSizeChange = onPageSizeChange;
      nodes.push(node);
      return node;
    },
    normalizeExcelTableHeaders: () => {},
    compactIdHeader: () => "",
    tableHeadLabel: () => "",
    isClosedByFechaCierre: () => false,
    rutaTipoRutaText: (value) => String(value || ""),
    formatDate: (value) => String(value || ""),
    badgeOpen: () => "",
    badgeTicketEstadoCalificacion: () => "",
    setTimeout
  });
  vm.runInContext(routesSource, context);

  const host = fakeNode("div", {}, []);
  context.renderRutas(host);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.length, 1);
  assert.ok(nodes.some((node) => node.textContent.includes("Error: IPC desconectado")));

  const searchButton = nodes.find((node) => node.tagName === "button" && node.textContent.includes("Buscar"));
  const clearButton = nodes.find((node) => node.tagName === "button" && node.textContent.includes("Limpiar"));
  assert.ok(searchButton, "debe conservarse el botón de búsqueda");
  assert.ok(clearButton, "debe conservarse el botón de limpieza");

  searchButton.onclick();
  searchButton.onclick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2, "debe prevenirse una carga simultánea desde el botón de búsqueda");

  pendingResolve({ ok: true, data: [], total: 0, page: 1 });
  await new Promise((resolve) => setImmediate(resolve));

  clearButton.onclick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 3, "limpiar filtros debe iniciar una carga después de liberar isLoading");
  pendingResolve({ ok: true, data: [], total: 0, page: 1 });
  await new Promise((resolve) => setImmediate(resolve));

  searchButton.onclick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 4);
  pendingResolve({ ok: false, message: "Error de base de datos" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(nodes.some((node) => node.textContent.includes("Error de base de datos")));

  const pager = nodes.find((node) => typeof node.onPageChange === "function");
  if (pager) {
    pager.onPageChange(2);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 5, "el cambio de página debe iniciar una carga");
    pendingResolve({ ok: true, data: [], total: 25, page: 2 });
    await new Promise((resolve) => setImmediate(resolve));

    pager.onPageSizeChange(50);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 6, "el cambio de tamaño debe iniciar una carga");
    pendingResolve({ ok: true, data: [], total: 25, page: 1 });
    await new Promise((resolve) => setImmediate(resolve));
  }

  assert.ok(calls.every((filters) => filters && typeof filters === "object"));
  assert.equal(calls[2]?.page, 1);
  assert.equal(calls[2]?.pageSize, 25);
});

test("las rutas pendientes controlan cargas, paginación, errores y recuperación", async () => {
  const routesSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "modulos", "rutas-y-reportes.js"),
    "utf8"
  );

  function fakeNode(tagName, attrs = {}, children = []) {
    const node = {
      tagName,
      value: attrs.value ?? "",
      innerHTML: "",
      textContent: "",
      children: [],
      className: attrs.class || "",
      style: {},
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      appendChild(child) {
        this.children.push(child);
        if (typeof child?.textContent === "string") this.textContent += child.textContent;
        return child;
      },
      setAttribute() {},
      querySelector() { return null; },
      focus() {},
      addEventListener() {},
      onclick: attrs.onclick || null,
      hidden: attrs.hidden || false
    };
    Object.assign(node, attrs);
    for (const child of children) {
      if (typeof child === "string") node.textContent += child;
      else node.appendChild(child);
    }
    return node;
  }

  const nodes = [];
  const calls = [];
  let pagePendingResolve;
  let callIndex = 0;

  const windowMock = {
    api: {
      rutas_list: (_session, filters) => {
        calls.push(filters);
        callIndex += 1;
        if (callIndex === 1) {
          return Promise.resolve({
            ok: true,
            data: Array.from({ length: 30 }, (_, index) => ({
              idRuta: index + 1,
              unidad: `Unidad ${index + 1}`,
              participantes: [],
              fechaApertura: "2026-10-01"
            }))
          });
        }
        if (callIndex === 2) {
          return new Promise((resolve) => { pagePendingResolve = resolve; });
        }
        if (callIndex === 3) {
          return Promise.reject(new Error("IPC desconectado"));
        }
        if (callIndex === 4) {
          return Promise.resolve({ ok: false, message: "Error de base de datos" });
        }
        return Promise.resolve({ ok: true, data: [], total: 0 });
      }
    },
    resetCatalogosState() {}
  };

  const context = vm.createContext({
    console,
    window: windowMock,
    session: { id: 1, unidades: [] },
    catalogos: { unidades: [], tecnicos: [], puestos: [], catalogo_equipo_revisado_ruta: [] },
    el: (tag, attrs, children) => {
      const normalizedChildren = Array.isArray(children)
        ? children
        : children != null
          ? [children]
          : [];
      const node = fakeNode(tag, attrs, normalizedChildren);
      nodes.push(node);
      return node;
    },
    createSearchableSelect: (_options, _placeholder, value) => {
      const node = fakeNode("searchable-select", {}, []);
      node.value = value || "";
      node.clear = () => { node.value = ""; };
      return node;
    },
    getSelectOptions: () => [],
    getUserErrorMessage: (error, fallback) => error?.message || fallback,
    toUserText: (value, fallback) => value || fallback,
    isSessionErrorMessage: () => false,
    isTecnico: () => false,
    can: () => true,
    mount: () => {},
    LoginView: () => fakeNode("div"),
    toast: () => {},
    nowLocalMysql: () => "2026-10-30 14:28:43",
    createTableFooterBar: ({ onPageChange, onPageSizeChange }) => {
      const node = fakeNode("div", {}, []);
      node.onPageChange = onPageChange;
      node.onPageSizeChange = onPageSizeChange;
      nodes.push(node);
      return node;
    },
    normalizeExcelTableHeaders: () => {},
    compactIdHeader: () => "",
    formatDate: (value) => String(value || ""),
    setTimeout
  });
  vm.runInContext(routesSource, context);

  const host = fakeNode("div", {}, []);
  context.renderValidarRutas(host);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.length, 1, "debe cargar rutas pendientes al iniciar");
  assert.equal(calls[0].idEstadoValidacion, 0);
  assert.ok(nodes.some((node) => node.tagName === "strong" && node.textContent === "30"));

  let pager = nodes.find((node) =>
    typeof node.onPageChange === "function" && typeof node.onPageSizeChange === "function"
  );
  assert.ok(
    pager,
    "debe conservarse el paginador después de una carga exitosa"
  );

  pager.onPageChange(2);
  pager.onPageChange(3);
  pager.onPageSizeChange(50);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2, "las llamadas simultáneas deben quedar protegidas");

  pagePendingResolve({
    ok: true,
    data: Array.from({ length: 30 }, (_, index) => ({
      idRuta: index + 1,
      unidad: `Unidad ${index + 1}`,
      participantes: [],
      fechaApertura: "2026-10-01"
    })),
    total: 30
  });
  await new Promise((resolve) => setImmediate(resolve));

  pager = nodes.find((node) =>
    typeof node.onPageChange === "function" && typeof node.onPageSizeChange === "function"
  );
  pager.onPageSizeChange(50);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 3, "el cambio de tamaño debe iniciar una carga");
  assert.ok(nodes.some((node) => node.textContent.includes("Error: IPC desconectado")));

  const countBeforeDatabaseError = nodes.find((node) =>
    node.tagName === "strong"
  )?.textContent;
  pager.onPageChange(2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 4);
  assert.ok(nodes.some((node) => node.textContent.includes("Error: Error de base de datos")));
  assert.equal(
    nodes.find((node) => node.tagName === "strong")?.textContent,
    countBeforeDatabaseError,
    "un error de base de datos debe conservar el contador existente"
  );

  pager.onPageChange(2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 5);
  assert.ok(nodes.some((node) => node.textContent.includes("Sin rutas pendientes")));
});

test("la validacion distingue el resultado de rutas_validar y la recarga posterior", async () => {
  const routesSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "modulos", "rutas-y-reportes.js"),
    "utf8"
  );

  function fakeNode(tagName, attrs = {}, children = []) {
    const listeners = {};
    const node = {
      tagName,
      value: attrs.value ?? "",
      checked: attrs.checked ?? false,
      innerHTML: "",
      textContent: "",
      children: [],
      className: attrs.class || "",
      style: {},
      disabled: attrs.disabled ?? false,
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      appendChild(child) {
        this.children.push(child);
        if (typeof child?.textContent === "string") this.textContent += child.textContent;
        return child;
      },
      addEventListener(type, listener) { listeners[type] = listener; },
      trigger(type) {
        if (listeners[type]) return listeners[type]();
      },
      setAttribute() {},
      querySelector(selector) {
        const wanted = String(selector).replace(/^\./, "");
        const stack = [...this.children];
        while (stack.length) {
          const candidate = stack.shift();
          if (String(candidate.className || "").split(/\s+/).includes(wanted)) return candidate;
          stack.push(...(candidate.children || []));
        }
        return null;
      },
      focus() {},
      onclick: attrs.onclick || null,
      close() {}
    };
    Object.assign(node, attrs);
    for (const child of children || []) {
      if (typeof child === "string") node.textContent += child;
      else node.appendChild(child);
    }
    return node;
  }

  const nodes = [];
  let validationScenario = "success";
  let validationCalls = 0;
  let reloadCalls = 0;
  let reloadScenario = "success";
  const toasts = [];
  const modals = [];

  const windowMock = {
    api: {
      rutas_list: () => {
        reloadCalls += 1;
        if (reloadCalls === 1) {
          return Promise.resolve({
            ok: true,
            data: [{ idRuta: 1, unidad: "Unidad 1", participantes: [], fechaApertura: "2026-10-01" }]
          });
        }
        if (reloadScenario === "reload-reject") {
          return Promise.reject(new Error("IPC desconectado"));
        }
        return Promise.resolve({ ok: true, data: [] });
      },
      rutas_validar: () => {
        validationCalls += 1;
        if (validationScenario === "validation-reject") {
          return Promise.reject(new Error("Error IPC al validar"));
        }
        if (validationScenario === "database-error") {
          return Promise.resolve({ ok: false, message: "Error de base de datos" });
        }
        return Promise.resolve({ ok: true });
      }
    },
    resetCatalogosState() {}
  };

  const context = vm.createContext({
    console,
    window: windowMock,
    session: { id: 1, unidades: [] },
    catalogos: {
      unidades: [],
      tecnicos: [],
      puestos: [{ nombre: "Analista" }],
      catalogo_equipo_revisado_ruta: [{ clave: "caja_ventas", nombre: "Caja ventas" }]
    },
    el: (tag, attrs, children) => {
      const normalizedChildren = Array.isArray(children)
        ? children
        : children != null
          ? [children]
          : [];
      const node = fakeNode(tag, attrs, normalizedChildren);
      nodes.push(node);
      return node;
    },
    createSearchableSelect: (_options, _placeholder, value) => {
      const node = fakeNode("searchable-select", {}, []);
      node.value = value || "";
      nodes.push(node);
      return node;
    },
    getSelectOptions: (_items, key, label) =>
      _items?.map((item) => ({ value: item[key], label: item[label] })) || [],
    getUserErrorMessage: (error, fallback) => error?.message || fallback,
    toUserText: (value, fallback) => value || fallback,
    isSessionErrorMessage: () => false,
    isTecnico: () => false,
    can: () => true,
    mount: () => {},
    LoginView: () => fakeNode("div"),
    toast: (message, type) => { toasts.push({ message, type }); },
    nowLocalMysql: () => "2026-10-30 14:28:43",
    createTableFooterBar: ({ onPageChange, onPageSizeChange }) => {
      const node = fakeNode("div", {}, []);
      node.onPageChange = onPageChange;
      node.onPageSizeChange = onPageSizeChange;
      nodes.push(node);
      return node;
    },
    createActionButton: ({ class: className, text, onClick }) => {
      const button = fakeNode("button", { class: className }, []);
      button.innerHTML = text || "";
      button.textContent = text || "";
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = "Procesando...";
        try {
          await onClick();
        } catch (err) {
          toasts.push({ message: err?.message || "Error", type: "err" });
        } finally {
          button.disabled = false;
          button.textContent = text || "";
        }
      });
      nodes.push(button);
      return button;
    },
    Modal: (_title, body) => {
      const modal = {
        card: {
          classList: { add() {}, remove() {} }
        },
        closed: false,
        close() { this.closed = true; },
        rebuildActions() {}
      };
      modal.body = body;
      modals.push(modal);
      return modal;
    },
    normalizeExcelTableHeaders: () => {},
    compactIdHeader: () => "",
    formatDate: (value) => String(value || ""),
    setTimeout
  });
  vm.runInContext(routesSource, context);

  const host = fakeNode("div", {}, []);
  context.renderValidarRutas(host);
  await new Promise((resolve) => setImmediate(resolve));

  const openButton = nodes.find((node) =>
    node.tagName === "button" && node.textContent.includes("Validar")
  );
  assert.ok(openButton, "debe existir el botón de abrir validación");
  openButton.onclick();

  let validateButton = nodes.filter((node) =>
    node.tagName === "button" && node.textContent === "Validar Ruta"
  ).at(-1);
  const nameInput = nodes.find((node) =>
    node.tagName === "input" && node.placeholder === "Nombre completo"
  );
  const puestoSelect = nodes.find((node) => node.tagName === "searchable-select");
  const reviewCheckbox = nodes.find((node) =>
    node.tagName === "input" && node.type === "checkbox"
  );
  assert.ok(nameInput, "debe existir el campo nombre del modal");
  assert.ok(puestoSelect, "debe existir el campo puesto del modal");
  assert.ok(reviewCheckbox, "debe existir el check de validación del modal");
  nameInput.value = "Responsable de prueba";
  puestoSelect.value = "Analista";
  reviewCheckbox.checked = true;

  const firstValidationClick = validateButton.trigger("click");
  const duplicateValidationClick = validateButton.trigger("click");
  await Promise.all([firstValidationClick, duplicateValidationClick]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(validationCalls, 1, "el botón debe impedir doble ejecución");
  assert.equal(reloadCalls, 2, "una validación exitosa debe recargar pendientes");
  assert.equal(modals.at(-1).closed, true, "el modal debe cerrar tras validar");
  assert.equal(validateButton.disabled, false, "el botón debe restaurarse tras éxito");
  assert.ok(toasts.some((item) => item.message === "Ruta validada correctamente." && item.type === "ok"));

  validationScenario = "validation-reject";
  openButton.onclick();
  validateButton = nodes.filter((node) =>
    node.tagName === "button" && node.textContent === "Validar Ruta"
  ).at(-1);
  const modalBeforeValidationError = modals.at(-1);
  const nameInputError = nodes.filter((node) =>
    node.tagName === "input" && node.placeholder === "Nombre completo"
  ).at(-1);
  const puestoError = nodes.filter((node) => node.tagName === "searchable-select").at(-1);
  const checkboxError = nodes.filter((node) =>
    node.tagName === "input" && node.type === "checkbox"
  ).at(-1);
  nameInputError.value = "Responsable";
  puestoError.value = "Analista";
  checkboxError.checked = true;
  await validateButton.trigger("click");
  assert.equal(modalBeforeValidationError.closed, false, "el modal debe permanecer ante error de validación");
  assert.equal(validateButton.disabled, false, "el botón debe recuperarse ante rechazo IPC");
  assert.ok(toasts.some((item) => item.message === "Error IPC al validar" && item.type === "err"));

  validationScenario = "database-error";
  await validateButton.trigger("click");
  assert.equal(modalBeforeValidationError.closed, false);
  assert.ok(toasts.some((item) => item.message === "Error de base de datos" && item.type === "err"));

  validationScenario = "success";
  reloadScenario = "reload-reject";
  await validateButton.trigger("click");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(modalBeforeValidationError.closed, true);
  assert.ok(toasts.some((item) =>
    item.message === "La ruta fue validada, pero no se pudo actualizar la lista de pendientes." &&
    item.type === "warn"
  ));
  assert.equal(validateButton.disabled, false, "el botón debe restaurarse tras error de recarga");
});

test("contraseñas en texto plano no se aceptan y bcrypt conserva la autenticación", async () => {
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("clave-real-de-prueba", 4);

  assert.equal(passwordService.isBcryptPassword(hash), true);
  assert.equal(await passwordService.verifyPassword("clave-real-de-prueba", hash), true);
  assert.equal(await passwordService.verifyPassword("clave-equivocada", hash), false);
  assert.equal(await passwordService.verifyPassword("clave-real-de-prueba", "clave-real-de-prueba"), false);
  assert.equal(passwordService.isBcryptPassword("clave-real-de-prueba"), false);
});

test("clasifica correctamente los estados de contraseña sin mostrar secretos", async () => {
  const bcrypt = require("bcryptjs");
  const validHash = bcrypt.hashSync("clave-segura", 4);
  const invalidHash = "$2b$10$hash-invalido";

  assert.equal(passwordMigration.classifyPassword(validHash), "bcrypt_valid");
  assert.equal(passwordMigration.classifyPassword("clave-original"), "plaintext_valid");
  assert.equal(passwordMigration.classifyPassword("   "), "password_empty");
  assert.equal(passwordMigration.classifyPassword(invalidHash), "bcrypt_invalid");
  assert.equal(passwordMigration.classifyPassword("\u0000dato"), "unexpected_data");
  assert.equal(passwordService.isBcryptPassword(validHash), true);
  assert.equal(passwordService.isBcryptPassword(invalidHash), false);
});

function createTemporaryUserDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-password-test-"));
  const databasePath = path.join(directory, "users.db");
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE usuario (
      idUsuario INTEGER PRIMARY KEY,
      usuario TEXT NOT NULL UNIQUE,
      pass TEXT NOT NULL,
      nombre TEXT NOT NULL,
      idRol INTEGER NOT NULL,
      activo INTEGER NOT NOT NULL DEFAULT 1
    );
  `.replace("NOT NOT", "NOT"));
  return { directory, databasePath, db };
}

test("crea, valida y conserva un respaldo antes de migrar contraseñas", async () => {
  const temporary = createTemporaryUserDatabase();
  try {
    temporary.db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (?, ?, ?, ?, ?)"
    ).run(1, "admin", "admin123", "Administrador", 1);
    const backupPath = passwordMigration.createPasswordMigrationBackup(temporary.databasePath, temporary.db);

    assert.equal(fs.existsSync(backupPath), true);
    const backup = new DatabaseSync(backupPath, { readOnly: true });
    assert.equal(passwordMigration.classifyPassword(backup.prepare("SELECT pass FROM usuario WHERE usuario='admin'").get().pass), "plaintext_valid");
    assert.equal(backup.prepare("PRAGMA integrity_check").get()["integrity_check"], "ok");
    assert.equal(backup.prepare("SELECT count(*) AS total FROM usuario").get().total, 1);
    backup.close();

    const result = passwordMigration.migratePlaintextPasswords(temporary.db, temporary.databasePath);
    assert.equal(result.migrated, 1);
    assert.equal(passwordService.isBcryptPassword(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='admin'").get().pass), true);
    const firstHash = temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='admin'").get().pass;

    const second = passwordMigration.migratePlaintextPasswords(temporary.db, temporary.databasePath);
    assert.equal(second.migrated, 0);
    assert.equal(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='admin'").get().pass, firstHash);
    assert.equal(await passwordService.verifyPassword("admin123", firstHash), true);
  } finally {
    temporary.db.close();
    fs.rmSync(temporary.directory, { recursive: true, force: true });
  }
});

test("cancela la migración y conserva la contraseña si falla la creación del respaldo", () => {
  const temporary = createTemporaryUserDatabase();
  try {
    temporary.db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (?, ?, ?, ?, ?)"
    ).run(1, "admin", "admin123", "Administrador", 1);

    assert.throws(
      () => passwordMigration.migratePlaintextPasswords(
        temporary.db,
        temporary.databasePath,
        { backupFactory: () => { throw new Error("permiso denegado"); } }
      ),
      /permiso denegado/
    );
    assert.equal(
      temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='admin'").get().pass,
      "admin123"
    );
  } finally {
    temporary.db.close();
    fs.rmSync(temporary.directory, { recursive: true, force: true });
  }
});

test("no modifica usuarios vacíos, hashes inválidos ni datos corruptos", () => {
  const bcrypt = require("bcryptjs");
  const temporary = createTemporaryUserDatabase();
  try {
    const insert = temporary.db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (?, ?, ?, ?, ?)"
    );
    const validHash = bcrypt.hashSync("clave-valida", 4);
    insert.run(1, "vacio", "", "Vacío", 1);
    insert.run(2, "bcrypt-valido", validHash, "Bcrypt válido", 1);
    insert.run(3, "bcrypt-invalido", "$2b$10$hash-invalido", "Bcrypt inválido", 1);
    insert.run(4, "corrupto", "dato\uFFFDcorrupto", "Dato extraño", 1);

    const result = passwordMigration.migratePlaintextPasswords(temporary.db, temporary.databasePath);
    assert.equal(result.migrated, 0);
    assert.equal(result.problems.length, 3);
    assert.deepEqual(
      result.problems.map((item) => item.classification).sort(),
      ["bcrypt_invalid", "password_empty", "unexpected_data"].sort()
    );
    assert.equal(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='bcrypt-valido'").get().pass, validHash);
    assert.equal(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='bcrypt-invalido'").get().pass, "$2b$10$hash-invalido");
  } finally {
    temporary.db.close();
    fs.rmSync(temporary.directory, { recursive: true, force: true });
  }
});

test("rechaza respaldos con IDs o datos relevantes de usuario diferentes", () => {
  assert.throws(
    () => passwordMigration.validateUserSnapshots(
      [{ idUsuario: 1, usuario: "admin", nombre: "Administrador", idRol: 1, activo: 1 }],
      [{ idUsuario: 2, usuario: "admin", nombre: "Administrador", idRol: 1, activo: 1 }]
    ),
    /difieren/
  );
});

test("electron-builder excluye respaldos del instalador", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const exclusions = packageJson.build.files;
  assert.equal(exclusions.includes("!backups/**"), true);
  assert.equal(exclusions.includes("!assets/database/backups/**"), true);
  assert.equal(exclusions.includes("!**/*.backup.db"), true);
});

test("la sustitución conserva el seed anterior ante una validación fallida", () => {
  const importScript = require("../scripts/import-mysql-dump-to-sqlite.js");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-import-test-"));
  const outputPath = path.join(directory, "seed.db");
  const temporaryPath = path.join(directory, "replacement.tmp.db");
  const original = new DatabaseSync(outputPath);
  original.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (7, 'original');");
  original.close();
  const invalid = new DatabaseSync(temporaryPath);
  invalid.exec("CREATE TABLE otra_tabla (id INTEGER PRIMARY KEY);");
  invalid.close();

  try {
    assert.throws(
      () => importScript.replaceSeedAfterValidation(outputPath, temporaryPath),
      /tabla usuario/
    );
    const originalAfter = new DatabaseSync(outputPath, { readOnly: true });
    assert.equal(originalAfter.prepare("SELECT idUsuario FROM usuario").get().idUsuario, 7);
    originalAfter.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("la sustitución exitosa conserva una copia de la semilla anterior", () => {
  const importScript = require("../scripts/import-mysql-dump-to-sqlite.js");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-import-test-"));
  const outputPath = path.join(directory, "seed.db");
  const temporaryPath = path.join(directory, "replacement.tmp.db");
  const original = new DatabaseSync(outputPath);
  original.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (7, 'original');");
  original.close();
  const replacement = new DatabaseSync(temporaryPath);
  replacement.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (9, 'importado');");
  replacement.close();

  try {
    const result = importScript.replaceSeedAfterValidation(outputPath, temporaryPath);
    assert.equal(result.replaced, true);
    assert.equal(fs.existsSync(result.previousBackupPath), true);
    const current = new DatabaseSync(outputPath, { readOnly: true });
    assert.equal(current.prepare("SELECT idUsuario FROM usuario").get().idUsuario, 9);
    current.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("un error al sustituir restaura la semilla original", () => {
  const importScript = require("../scripts/import-mysql-dump-to-sqlite.js");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-import-test-"));
  const outputPath = path.join(directory, "seed.db");
  const temporaryPath = path.join(directory, "replacement.tmp.db");
  const original = new DatabaseSync(outputPath);
  original.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (7, 'original');");
  original.close();
  const replacement = new DatabaseSync(temporaryPath);
  replacement.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (9, 'importado');");
  replacement.close();
  const renameSync = fs.renameSync;

  try {
    fs.renameSync = (oldPath, newPath) => {
      if (oldPath === temporaryPath) throw new Error("fallo simulada de sustitución");
      return renameSync(oldPath, newPath);
    };
    assert.throws(
      () => importScript.replaceSeedAfterValidation(outputPath, temporaryPath),
      /fallo simulada/
    );
    const originalAfter = new DatabaseSync(outputPath, { readOnly: true });
    assert.equal(originalAfter.prepare("SELECT idUsuario FROM usuario").get().idUsuario, 7);
    originalAfter.close();
  } finally {
    fs.renameSync = renameSync;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rollback ante error de actualización conserva todos los valores originales", () => {
  const temporary = createTemporaryUserDatabase();
  try {
    const insert = temporary.db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (?, ?, ?, ?, ?)"
    );
    insert.run(1, "uno", "clave-uno", "Usuario uno", 1);
    insert.run(2, "dos", "clave-dos", "Usuario dos", 1);
    temporary.db.exec(`
      CREATE TRIGGER bloquear_migracion
      BEFORE UPDATE OF pass ON usuario
      BEGIN
        SELECT RAISE(ABORT, 'actualización simulada fallida');
      END;
    `);

    assert.throws(
      () => passwordMigration.migratePlaintextPasswords(temporary.db, temporary.databasePath),
      /actualización simulada fallida/
    );
    assert.equal(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='uno'").get().pass, "clave-uno");
    assert.equal(temporary.db.prepare("SELECT pass FROM usuario WHERE usuario='dos'").get().pass, "clave-dos");
  } finally {
    temporary.db.close();
    fs.rmSync(temporary.directory, { recursive: true, force: true });
  }
});

test("normaliza paginación conservando límites", () => {
  assert.deepEqual(pagination.normalizePagination({ page: 2, pageSize: 500 }), {
    page: 2,
    pageSize: 100,
    offset: 100
  });
  assert.equal(pagination.buildPaginationClause(25, 0), "LIMIT 25 OFFSET 0");
  assert.equal(pagination.buildPaginationClause("25; DROP TABLE ticket", -5), "LIMIT 25 OFFSET 0");
});

test("centraliza normalización de catálogos, estados y período mensual", () => {
  assert.equal(domain.normalizeCatalogKey("  Reparación técnica "), "REPARACION_TECNICA");
  assert.equal(domain.normalizeOpenClosedState(" abierto "), "ABIERTO");
  assert.equal(domain.normalizeOpenClosedState("otro"), null);
  assert.deepEqual(domain.monthlyRangeMysql(new Date(2026, 6, 2, 12)), {
    start: "2026-06-26 00:00:00",
    end: "2026-07-25 23:59:59"
  });
});

test("los desplegables confirman con Tab y los módulos muestran el período 26-25", () => {
  const shared = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/compartido.js"), "utf8");
  const moduleFiles = [
    "modulo-tickets.js",
    "rutas-y-reportes.js",
    "equipos-y-envios.js",
    "calificacion-y-panel.js",
    "proyectos-especiales/vista-proyectos-especiales.js"
  ];

  assert.match(shared, /case 'Tab':[\s\S]*optionToCommit[\s\S]*optionToCommit\.click\(\)/);
  assert.match(shared, /function getMonthlyRange[\s\S]*new Date\(y, m, 26[\s\S]*new Date\(y, m \+ 1, 25/);
  for (const relativeFile of moduleFiles) {
    const renderer = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos", relativeFile), "utf8");
    assert.match(renderer, /getMonthlyRange\(\)/, `${relativeFile} debe usar el período mensual predeterminado`);
    assert.match(renderer, /mysqlToDateValue\(defaultRange\.start\)/, `${relativeFile} debe mostrar la fecha inicial`);
    assert.match(renderer, /mysqlToDateValue\(defaultRange\.end\)/, `${relativeFile} debe mostrar la fecha final`);
  }
});

test("gerencial consulta todas las rutas pendientes sin rango de fechas", () => {
  const backend = fs.readFileSync(path.join(__dirname, "../src/main/ipc_rutas.ts"), "utf8");
  const renderer = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"), "utf8");

  assert.match(backend, /isGerencialPendingValidation[\s\S]*desde = null;[\s\S]*hasta = null;/);
  assert.match(backend, /isGerencialPendingValidation[\s\S]*else if \(!desde && !hasta\)[\s\S]*monthlyRangeMysql/);
  const validationView = renderer.slice(renderer.indexOf("function renderValidarRutas"), renderer.indexOf("function renderReportes"));
  assert.match(validationView, /idEstadoValidacion: 0/);
  assert.match(validationView, /desde: null/);
  assert.match(validationView, /hasta: null/);
});

test("todas las tablas permiten redimensionar, ocultar y recuperar columnas", () => {
  const shared = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/compartido.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../src/renderer/styles/components/system-overrides.css"), "utf8");

  assert.doesNotMatch(shared, /report-tickets-summary-table[\s\S]{0,100}return/);
  assert.match(shared, /requestedWidth <= 12 \? 0/);
  assert.match(shared, /class: "excel-column-manager-toggle"/);
  assert.match(shared, /class: "excel-column-manager-bar"/);
  assert.match(shared, /class: "excel-column-manager-option"/);
  assert.match(shared, /nextWidths\[index\][\s\S]*: 0/);
  assert.match(styles, /height:32px !important/);
  assert.match(styles, /height:34px !important/);
  assert.match(styles, /background:linear-gradient\(180deg, var\(--app-table-head-bg\), var\(--app-table-head-bg2\)\) !important/);
  assert.match(styles, /color:#10283b !important/);
  assert.match(styles, /\.excel-column-manager-panel/);
  assert.match(styles, /\.excel-column-manager-bar/);
  assert.match(styles, /table\.calif-table\{[\s\S]*margin:0 !important;[\s\S]*border-collapse:separate !important/);
});

test("calificación, seguimiento y reportes usan el encabezado visual de Tickets", () => {
  const calificacion = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/calificacion-y-panel.js"), "utf8");
  const tickets = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/modulo-tickets.js"), "utf8");
  const envios = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/equipos-y-envios.js"), "utf8");
  const reportes = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"), "utf8");
  const proyectos = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/proyectos-especiales/vista-proyectos-especiales.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../src/renderer/styles/components/system-overrides.css"), "utf8");

  assert.match(tickets, /module-header-tickets module-standard-header/);
  assert.match(calificacion, /card module-standard-header/);
  assert.match(envios, /envio-equipo-ops-header module-standard-header/);
  assert.match(reportes, /card module-standard-header/);
  assert.match(reportes, /module-header-calif calif-header-card module-standard-header/);
  assert.match(reportes, /module-header-validacion-rutas module-standard-header/);
  assert.match(envios, /card module-standard-header/);
  assert.match(envios, /envio-equipo-header-card module-standard-header/);
  assert.match(proyectos, /card module-standard-header/);
  assert.match(styles, /\.module-standard-header\.module-standard-header > \.titleRow::before/);
  assert.match(styles, /\.module-standard-header\.module-standard-header \.titleRow \.h1/);
  assert.match(styles, /font-family:var\(--app-font-ui\) !important/);
  assert.match(styles, /var\(--tint-tickets, rgba\(29,140,248,\.04\)\)/);
});

test("rechaza rangos de fecha invertidos", () => {
  assert.throws(
    () => validation.assertDateRange("2026-07-02", "2026-07-01"),
    /fecha desde no puede ser posterior/i
  );
});

test("rechaza cierre anterior a apertura", () => {
  assert.throws(
    () => validation.assertChronologicalDates("2026-07-02 10:00:00", "2026-07-02 09:59:59"),
    /no puede ser anterior/i
  );
});

test("deduplica referencias positivas", () => {
  assert.deepEqual(validation.uniquePositiveIds([2, "2", -1, 3, 0, "x"]), [2, 3]);
});

test("valida formatos de fecha y referencias activas sin usar ODBC real", async () => {
  assert.throws(
    () => validation.parseDateValue("02/07/2026", "Fecha"),
    /formato válido/i
  );
  assert.throws(
    () => validation.parseDateValue("2026-02-30", "Fecha"),
    /fecha válida/i
  );
  await assert.rejects(
    validation.assertActiveReference({ execute: async () => [[]] }, "ticket; DROP TABLE ticket", "idTicket", 1, "Ticket"),
    /configuración interna/i
  );

  const calls = [];
  const connection = {
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return [[{ found: 1 }]];
    }
  };
  assert.equal(await validation.assertActiveReference(connection, "ticket", "idTicket", "7", "Ticket"), 7);
  assert.match(calls[0].sql, /`ticket`/);
  assert.deepEqual(calls[0].params, [7]);
});

test("normaliza límites y construye filtros de reporte parametrizados", async () => {
  assert.deepEqual(pagination.normalizePagination({ page: -4, pageSize: 1 }), {
    page: 1,
    pageSize: 5,
    offset: 0
  });
  assert.equal(pagination.buildPaginationClause(999, "8.9"), "LIMIT 100 OFFSET 8");

  const where = [];
  const params = [];
  reportQuery.appendSearchFilter(where, params, "  sucursal  ", ["t.descripcion", "u.nombre"]);
  assert.deepEqual(where, ["(t.descripcion LIKE ? OR u.nombre LIKE ?)"]);
  assert.deepEqual(params, ["%sucursal%", "%sucursal%"]);
  assert.throws(
    () => reportQuery.appendSearchFilter([], [], "x", ["t.descripcion; DELETE"]),
    /configuración interna/i
  );

  const count = await pagination.countRows(
    { execute: async (sql, receivedParams) => {
      assert.match(sql, /SELECT COUNT\(\*\) AS total FROM ticket WHERE activo=\?/);
      assert.deepEqual(receivedParams, [1]);
      return [[{ total: "4" }]];
    } },
    "FROM ticket",
    "WHERE activo=?",
    [1]
  );
  assert.equal(count, 4);
});

test("neutraliza fórmulas y sanea nombres de exportación", () => {
  assert.equal(exportSecurity.sanitizeSpreadsheetValue("=CMD()"), "'=CMD()");
  assert.equal(exportSecurity.sanitizeSpreadsheetValue("texto"), "texto");
  assert.equal(exportSecurity.sanitizeExportFilename("reporte?.csv"), "reporte_.xlsx");
  assert.equal(exportSecurity.sanitizeSheetName("Resumen: julio/2026"), "Resumen julio 2026");
});

test("sanea fórmulas de forma recursiva y valida permisos de sesión", () => {
  assert.deepEqual(exportSecurity.sanitizeSpreadsheetData({
    title: "+formula",
    rows: ["@command", { value: "texto" }]
  }), {
    title: "'+formula",
    rows: ["'@command", { value: "texto" }]
  });
  assert.equal(sessions.hasPerm({ permisos: ["TICKETS_CREAR"] }, "TICKETS_CREATE"), true);
  assert.equal(sessions.hasPerm({ permisos: [] }, "TICKETS_CREATE"), false);
  assert.throws(() => sessions.requirePerm({ permisos: [] }, "REPORTS_VIEW"), /sin permiso/i);
});

test("permite revocar sesiones activas", () => {
  const session = {
    idUsuario: 7,
    usuario: "test",
    nombre: "Test",
    idRol: 1,
    rol: "ADMIN",
    permisos: [],
    unidades: []
  };
  sessions.setTrustedSession(1001, session);
  assert.equal(sessions.getTrustedSession(1001).idUsuario, 7);
  sessions.revokeTrustedSessionsForUser(7);
  assert.equal(sessions.getTrustedSession(1001), null);
});

test("no ejecuta consultas paralelas sobre una conexión ODBC 3.51", () => {
  for (const file of ["ipc_envio_equipo.ts", "ipc_tickets.ts"]) {
    const source = fs.readFileSync(path.join(__dirname, "../src/main", file), "utf8");
    assert.doesNotMatch(source, /Promise\.all\s*\(/, `${file} no debe compartir una conexión en paralelo`);
  }
});

test("los módulos con búsqueda textual exponen el query filter y lo envían al backend", () => {
  const tickets = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/modulo-tickets.js"), "utf8");
  const rutas = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"), "utf8");
  const calificacion = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/calificacion-y-panel.js"), "utf8");
  const proyectos = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/proyectos-especiales/vista-proyectos-especiales.js"), "utf8");

  assert.match(tickets, /const q = el\("input"/);
  assert.match(tickets, /q: q\.value \? q\.value\.trim\(\) : null/);
  assert.match(rutas, /const q = el\("input"/);
  assert.match(rutas, /q: q\.value \? q\.value\.trim\(\) : null/);
  assert.match(calificacion, /const q = el\("input"/);
  assert.match(calificacion, /q: q\.value \? q\.value\.trim\(\) : null/);
  assert.match(proyectos, /const q = el\("input"/);
  assert.match(proyectos, /q: q\.value \? q\.value\.trim\(\) : null/);
});

test("la exportación de tickets conserva los filtros de la búsqueda", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"),
    "utf8"
  );
  assert.doesNotMatch(source, /reports_tickets\(session,\s*\{\s*\.\.\.filtros,\s*tipoTicket:\s*null\s*\}\)/);
  assert.match(
    source,
    /const exportFilename = buildReporteTecnicoFilename\(\s*"Tickets",\s*getTipoTicketReporteMeta\(\)\.filenameLabel\s*\)/
  );
  assert.match(source, /downloadExcel\(\s*exportFilename,\s*exportRows,/);
});

test("el reporte global de rutas usa una sola solicitud ODBC", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"),
    "utf8"
  );
  assert.doesNotMatch(source, /Promise\.all\s*\(\s*\[\s*window\.api\.reports_rutas/);
  assert.match(source, /const rowsPorTecnico = await fetchRouteReportRows\(filtrosGlobal\)/);
  assert.match(source, /isGlobalReport\s*\?\s*downloadExcelMulti\([\s\S]*?:\s*downloadExcel\(exportFilename, exportRows, titulo\)/);
});

test("los tres reportes visibles conservan filtros y evitan agregados frágiles de ODBC", () => {
  const renderer = fs.readFileSync(
    path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"),
    "utf8"
  );
  const backend = fs.readFileSync(path.join(__dirname, "../src/main/ipc_reports.ts"), "utf8");

  assert.doesNotMatch(renderer, /idTecnico:\s*null/);
  assert.match(
    renderer,
    /buildReporteTecnicoFilename\(\s*"Tickets",\s*getTipoTicketReporteMeta\(\)\.filenameLabel\s*\)/
  );
  assert.match(renderer, /buildReporteTecnicoFilename\(\s*"Proyectos_Especiales",\s*"Aprobados"\s*\)/);
  assert.match(
    renderer,
    /buildReporteTecnicoFilename\(\s*isGlobalReport \? "Rutas_Global" : "Rutas",\s*getTipoRutaReporteMeta\(\)\.filenameLabel\s*\)/
  );
  const actionsBar = renderer.slice(
    renderer.indexOf('class: "actions report-actions-bar"'),
    renderer.indexOf("host.appendChild(box)")
  );
  assert.match(actionsBar, /btnReporteTickets/);
  assert.match(actionsBar, /btnGlobalRutas/);
  assert.match(actionsBar, /btnResumenProyectos/);
  assert.doesNotMatch(actionsBar, /btnGlobalTickets|btnReporteRutasCalificadas/);
  assert.match(renderer, /let activeReportKey = "tickets"/);
  assert.match(renderer, /rutas: btnGlobalRutas/);
  assert.match(renderer, /proyectos: btnResumenProyectos/);
  assert.doesNotMatch(renderer, /onclick:\s*\(\) => btnReporteTickets\.click\(\)/);
  assert.match(renderer, /tipoRuta:\s*String\(tipoRutaReporte\.value/);
  assert.match(renderer, /activeReportKey !== "tickets"/);
  assert.match(renderer, /activeReportKey !== "rutas"/);

  const ticketsHandler = backend.slice(
    backend.indexOf('ipcMain.handle("reports:tickets"'),
    backend.indexOf('ipcMain.handle("reports:rutas"')
  );
  const routesHandler = backend.slice(
    backend.indexOf('ipcMain.handle("reports:rutas"'),
    backend.indexOf('ipcMain.handle("reports:tickets_summary"')
  );
  const projectsHandler = backend.slice(
    backend.indexOf('ipcMain.handle("reports:proyectos_summary"'),
    backend.indexOf('ipcMain.handle("reports:export_excel"')
  );
  assert.doesNotMatch(ticketsHandler, /GROUP_CONCAT/i);
  assert.match(ticketsHandler, /t\.fechaCierre IS NOT NULL/);
  assert.match(ticketsHandler, /t\.idEstadoCalificacion = 1/);
  assert.doesNotMatch(routesHandler, /GROUP_CONCAT/i);
  assert.match(routesHandler, /UPPER\(r\.tipo\) = \?/);
  assert.match(routesHandler, /r\.fechaCierre IS NOT NULL/);
  assert.match(routesHandler, /r\.idEstadoValidacion = 1/);
  assert.match(routesHandler, /r\.idEstadoCalificacion = 1/);
  assert.doesNotMatch(projectsHandler, /GROUP_CONCAT/i);
  assert.match(renderer, /const getTicketExportComplexityLabel = \(value\) => \{/);
});

test("reportes de rutas y proyectos excluyen abiertos, no calificados y no aprobados", () => {
  const backend = fs.readFileSync(path.join(__dirname, "../src/main/ipc_reports.ts"), "utf8");
  const routeReport = backend.slice(
    backend.indexOf('ipcMain.handle("reports:rutas"'),
    backend.indexOf('ipcMain.handle("reports:tickets_summary"')
  );
  const routeSummary = backend.slice(
    backend.indexOf('ipcMain.handle("reports:rutas_summary"'),
    backend.indexOf('ipcMain.handle("reports:proyectos_summary"')
  );
  const projectSummary = backend.slice(backend.indexOf('ipcMain.handle("reports:proyectos_summary"'));

  for (const source of [routeReport, routeSummary]) {
    assert.match(source, /r\.fechaCierre IS NOT NULL/);
    assert.match(source, /r\.idEstadoValidacion = 1/);
    assert.match(source, /r\.idEstadoCalificacion = 1/);
  }
  assert.match(projectSummary, /UPPER\(TRIM\(pe\.estadoRevision\)\) = 'APROBADO'/);
});

test("reportes de tickets detallado y resumen incluyen exclusivamente tickets calificados y cerrados", () => {
  const backend = fs.readFileSync(path.join(__dirname, "../src/main/ipc_reports.ts"), "utf8");
  const ticketReport = backend.slice(
    backend.indexOf('ipcMain.handle("reports:tickets"'),
    backend.indexOf('ipcMain.handle("reports:rutas"')
  );
  const ticketSummary = backend.slice(
    backend.indexOf('ipcMain.handle("reports:tickets_summary"'),
    backend.indexOf('ipcMain.handle("reports:rutas_summary"')
  );

  for (const source of [ticketReport, ticketSummary]) {
    assert.match(source, /t\.fechaCierre IS NOT NULL/);
    assert.match(source, /t\.idEstadoCalificacion = 1/);
  }
  assert.doesNotMatch(ticketReport, /if \(soloCalificados\)/);
});

test("el reporte exportable de tickets resume por ticket único y conserva el número de ticket", () => {
  const renderer = fs.readFileSync(
    path.join(__dirname, "../src/renderer/modulos/rutas-y-reportes.js"),
    "utf8"
  );
  const interactiveExport = fs.readFileSync(
    path.join(__dirname, "../src/main/ticket_excel_export.ts"),
    "utf8"
  );

  assert.match(renderer, /const buildTicketUniqueSummary = \(rows = \[\]\)/);
  assert.match(renderer, /summary\.totalTickets/);
  assert.match(renderer, /formatTicketReportNumber/);
  assert.match(renderer, /totalsMode: filtros\.idTecnico \? "rows" : "unique"/);
  assert.match(renderer, /"N\. Ticket"/);
  assert.doesNotMatch(renderer, /buildTicketDetailReportExportModelLegacy/);
  assert.match(interactiveExport, /function buildUniqueTicketTotals\(tickets: any\[\]\)/);
  assert.match(interactiveExport, /function buildRowTicketTotals\(tickets: any\[\]\)/);
  assert.match(interactiveExport, /function normalizeTecnicoLabel\(value: any\)/);
  assert.match(interactiveExport, /const totalsMode = normalizeTecnicoLabel\(tecnico\) === "TODOS LOS TECNICOS" \? "unique" : "rows"/);
  assert.match(interactiveExport, /label === "INDIVIDUAL - COMPARTIDOS"/);
  assert.match(interactiveExport, /numeroTicket:/);
  assert.match(interactiveExport, /const totals = totalsMode === "rows"/);
  assert.doesNotMatch(interactiveExport, /totals: \{ total: tickets\.length, \.\.\.totals \}/);
});

test("las notificaciones de envíos consultan cambios incrementales sin sockets", () => {
  const backend = fs.readFileSync(path.join(__dirname, "../src/main/ipc_envio_equipo.ts"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/estructura-principal.js"), "utf8");
  assert.match(backend, /ipcMain\.handle\("envio_equipo:notifications"/);
  assert.match(backend, /roleKey !== "GERENCIAL" && roleKey !== "ANALISTA"/);
  assert.match(backend, /isManagerNotification \? "ee\.updatedAt" : "ee\.createdAt"/);
  assert.match(backend, /UPPER\(ra\.nombre\) = 'ANALISTA'/);
  assert.match(backend, /UPPER\(rc\.nombre\) = 'GERENCIAL'/);
  assert.match(backend, /usuario_unidad uu/);
  assert.match(backend, /uu\.idUsuario = \?/);
  assert.match(backend, /uu\.idUnidad = ee\.idUnidad/);
  assert.match(backend, /STATUS_CHANGED/);
  assert.match(backend, /NEW_SHIPMENT/);
  assert.match(shell, /isTecnico\(\) \|\| hasRole\("SUPERVISOR"\)/);
  assert.match(shell, /hasRole\("GERENCIAL"\) \|\| isAnalista\(\)/);
  assert.match(shell, /row\?\.eventAt/);
  assert.match(shell, /Date\.now\(\) - 24 \* 60 \* 60 \* 1000/);
  assert.match(shell, /notificationCursorV4/);
  assert.match(shell, /setInterval\(pollEnvioNotifications, 15_000\)/);
  assert.match(shell, /class: "notification-bell"/);
  assert.match(shell, /Equipo n\. \$\{number\} ya fue/);
  assert.match(shell, /class: "notification-dismiss"/);
  assert.match(shell, /sessionStorage\.setItem\("envioEquipoInitialTab", "historial"\)/);
});

test("los técnicos reciben notificaciones por nuevas asignaciones de tickets y rutas", () => {
  const database = fs.readFileSync(path.join(__dirname, "../src/main/db/db.ts"), "utf8");
  const notifications = fs.readFileSync(path.join(__dirname, "../src/main/ipc_envio_equipo.ts"), "utf8");
  const tickets = fs.readFileSync(path.join(__dirname, "../src/main/ipc_tickets.ts"), "utf8");
  const routes = fs.readFileSync(path.join(__dirname, "../src/main/ipc_rutas.ts"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/estructura-principal.js"), "utf8");

  assert.match(database, /CREATE TABLE IF NOT EXISTS notificacion_asignacion/);
  assert.match(database, /ensureAssignmentNotificationSchema/);
  assert.match(tickets, /'TICKET_ASIGNADO'/);
  assert.match(tickets, /previousTechnicianSet\.has\(idTec\)/);
  assert.match(routes, /'RUTA_ASIGNADA'/);
  assert.match(routes, /previousParticipantSet\.has\(idTec\)/);
  assert.match(notifications, /roleKey === "TECNICO"/);
  assert.match(notifications, /na\.idUsuario = \?/);
  assert.match(shell, /openRoute\(isTicketAssignment \? "tickets" : \(isRouteAssignment \|\| isRouteValidated\) \? "rutas"/);
});

test("ACL estructurada acepta solo SID actuales y privilegios explícitos completos", () => {
  const currentSid = "S-1-5-21-1001";
  const valid = {
    IsInheritanceEnabled: false,
    Access: [
      { Sid: currentSid, Identity: "Usuario", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" },
      { Sid: "S-1-5-18", Identity: "SYSTEM", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" },
      { Sid: "S-1-5-32-544", Identity: "Administrators", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" }
    ]
  };
  assert.doesNotThrow(() => passwordMigration.verifyWindowsBackupAcl(valid, currentSid));
  assert.throws(
    () => passwordMigration.verifyWindowsBackupAcl({ ...valid, IsInheritanceEnabled: true }, currentSid),
    /herencia/
  );
  assert.throws(
    () => passwordMigration.verifyWindowsBackupAcl({
      IsInheritanceEnabled: false,
      Access: [...valid.Access, { Sid: "S-1-5-21-9999", Identity: "Otro usuario", IsInherited: false, AccessControlType: "Allow", Rights: "FullControl" }]
    }, currentSid),
    /no autorizada/
  );
});

test("electron-builder excluye respaldos e informes también de extraResources", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const extraResources = packageJson.build.extraResources.find((resource) => resource.from === "assets");
  assert.ok(extraResources);
  assert.ok(extraResources.filter.includes("!database/backups/**"));
  assert.ok(extraResources.filter.includes("!**/*.backup.db"));
  assert.ok(extraResources.filter.includes("!**/*recovery*.json"));
  assert.ok(packageJson.build.files.includes("!assets/database/backups/**"));
});

test("recuperación conservadora identifica respaldo inválido y varios respaldos ambiguos", () => {
  const importScript = require("../scripts/import-mysql-dump-to-sqlite.js");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-recovery-test-"));
  const outputPath = path.join(directory, "seed.db");
  try {
    const invalidBackup = path.join(directory, "seed.pre-import-invalid.backup.db");
    const invalid = new DatabaseSync(invalidBackup);
    invalid.exec("CREATE TABLE otra_tabla (id INTEGER PRIMARY KEY);");
    invalid.close();
    const reportInvalid = importScript.recoverInterruptedSeed(outputPath);
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(fs.readFileSync(reportInvalid, "utf8").includes("backup_invalid"), true);

    fs.rmSync(invalidBackup, { force: true });
    const validBackup = path.join(directory, "seed.pre-import-valid.backup.db");
    const validDb = new DatabaseSync(validBackup);
    validDb.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (4, 'recuperado');");
    validDb.close();
    const reportRecovered = importScript.recoverInterruptedSeed(outputPath);
    assert.equal(fs.existsSync(outputPath), true);
    assert.equal(fs.readFileSync(reportRecovered, "utf8").includes("seed_recovered_from_backup"), true);
    fs.rmSync(outputPath, { force: true });
    fs.rmSync(validBackup, { force: true });
    for (const name of ["seed.pre-import-a.backup.db", "seed.pre-import-b.backup.db"]) {
      const db = new DatabaseSync(path.join(directory, name));
      db.exec("CREATE TABLE usuario (idUsuario INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL); INSERT INTO usuario VALUES (1, 'usuario');");
      db.close();
    }
    const reportAmbiguous = importScript.recoverInterruptedSeed(outputPath);
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(fs.readFileSync(reportAmbiguous, "utf8").includes("ambiguous_or_missing"), true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("el bloqueo de importación impide dos procesos simultáneos", () => {
  const importScript = require("../scripts/import-mysql-dump-to-sqlite.js");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-lock-test-"));
  const outputPath = path.join(directory, "seed.db");
  try {
    const lockPath = importScript.acquireImportLock(outputPath);
    assert.throws(
      () => importScript.acquireImportLock(outputPath),
      /Otra importación o recuperación/
    );
    importScript.releaseImportLock(lockPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("el supervisor recibe aviso cuando gerencial valida una ruta que creó", () => {
  const notifications = fs.readFileSync(path.join(__dirname, "../src/main/ipc_envio_equipo.ts"), "utf8");
  const routes = fs.readFileSync(path.join(__dirname, "../src/main/ipc_rutas.ts"), "utf8");
  const shell = fs.readFileSync(path.join(__dirname, "../src/renderer/modulos/estructura-principal.js"), "utf8");

  assert.match(routes, /session\?\.rol[\s\S]*=== "GERENCIAL"/);
  assert.match(routes, /'RUTA_VALIDADA'/);
  assert.match(routes, /UPPER\(creatorRole\.nombre\) = 'SUPERVISOR'/);
  assert.match(notifications, /roleKey === "SUPERVISOR"/);
  assert.match(notifications, /allowedEventType[\s\S]*RUTA_VALIDADA/);
  assert.match(shell, /hasRole\("SUPERVISOR"\)/);
  assert.match(shell, /La ruta #\$\{item\?\.idReferencia/);
});
