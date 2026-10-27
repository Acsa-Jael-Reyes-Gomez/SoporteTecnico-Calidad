const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const validation = require("../dist/main/services/validation_service.js");
const pagination = require("../dist/main/services/pagination_service.js");
const exportSecurity = require("../dist/main/services/export_security.js");
const sessions = require("../dist/main/session_store.js");
const domain = require("../dist/main/services/domain_utils.js");
const reportQuery = require("../dist/main/services/report_query_service.js");

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
