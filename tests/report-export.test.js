const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const servicePath = path.join(
  __dirname,
  "..",
  "dist",
  "main",
  "services",
  "report_export_service.js"
);

function loadReportService() {
  const source = fs.readFileSync(servicePath, "utf8");

  const dialogCalls = [];

  const fakeElectron = {
    dialog: {
      async showSaveDialog(options) {
        dialogCalls.push(options);
        return { canceled: true };
      }
    }
  };

  const fakeRequire = (moduleName) => {
    if (moduleName === "electron") {
      return fakeElectron;
    }

    if (moduleName === "../ticket_excel_export") {
      return {
        exportInteractiveTicketWorkbook: async () => {
          throw new Error("No debe ejecutarse");
        },
        exportInteractiveTicketWorkbookMulti: async () => {
          throw new Error("No debe ejecutarse");
        }
      };
    }

    if (moduleName === "./export_security") {
      return require("../dist/main/services/export_security.js");
    }

    throw new Error(`Dependencia inesperada: ${moduleName}`);
  };

  const exports = {};

  vm.runInNewContext(source, {
    exports,
    require: fakeRequire,
    process,
    console
  }, {
    filename: servicePath
  });

  return { service: exports, dialogCalls };
}

test("cancelar exportación individual no genera archivo", async () => {
  const { service, dialogCalls } = loadReportService();

  const result = await service.exportReport("reporte.xlsx", {
    sheet: "Tickets",
    data: []
  });

  assert.equal(result.ok, false);
  assert.equal(result.canceled, true);
  assert.equal(dialogCalls.length, 1);
  assert.equal(dialogCalls[0].title, "Guardar reporte Excel");
});

test("cancelar exportación de varias hojas no genera archivo", async () => {
  const { service, dialogCalls } = loadReportService();

  const result = await service.exportReportWorkbook("reporte-global.xlsx", [
    { sheet: "Tickets", data: [] },
    { sheet: "Rutas", data: [] }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.canceled, true);
  assert.equal(dialogCalls.length, 1);
  assert.equal(dialogCalls[0].title, "Guardar reporte global Excel");
});

test("exportación interactiva individual devuelve la ruta correctamente", async () => {
  const source = fs.readFileSync(servicePath, "utf8");
  const expectedPath = "C:\\Temp\\reporte-prueba.xlsx";
  const calls = [];
  const exports = {};

  const fakeRequire = (moduleName) => {
    if (moduleName === "electron") {
      return {
        dialog: {
          async showSaveDialog() {
            return { canceled: false, filePath: expectedPath };
          }
        }
      };
    }

    if (moduleName === "../ticket_excel_export") {
      return {
        async exportInteractiveTicketWorkbook(filePath, data) {
          calls.push({ filePath, data });
        },
        async exportInteractiveTicketWorkbookMulti() {
          throw new Error("No debe ejecutarse");
        }
      };
    }

    if (moduleName === "./export_security") {
      return require("../dist/main/services/export_security.js");
    }

    throw new Error(`Dependencia inesperada: ${moduleName}`);
  };

  vm.runInNewContext(source, {
    exports,
    require: fakeRequire,
    process: { platform: "win32" },
    console
  }, {
    filename: servicePath
  });

  const result = await exports.exportReport(
    "reporte-prueba.xlsx",
    { sheet: "Tickets", data: [] },
    [["Ticket", "Estado"], ["T-001", "Cerrado"]]
  );

  assert.equal(result.ok, true);
  assert.equal(result.filePath, expectedPath);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].filePath, expectedPath);
  assert.equal(calls[0].data[1][0], "T-001");
});

test("exportación interactiva de varias hojas devuelve la ruta correctamente", async () => {
  const source = fs.readFileSync(servicePath, "utf8");
  const expectedPath = "C:\\Temp\\reporte-global-prueba.xlsx";
  const calls = [];
  const exports = {};

  const fakeRequire = (moduleName) => {
    if (moduleName === "electron") {
      return {
        dialog: {
          async showSaveDialog() {
            return { canceled: false, filePath: expectedPath };
          }
        }
      };
    }

    if (moduleName === "../ticket_excel_export") {
      return {
        async exportInteractiveTicketWorkbook() {
          throw new Error("No debe ejecutarse");
        },
        async exportInteractiveTicketWorkbookMulti(filePath, sheets) {
          calls.push({ filePath, sheets });
        }
      };
    }

    if (moduleName === "./export_security") {
      return require("../dist/main/services/export_security.js");
    }

    throw new Error(`Dependencia inesperada: ${moduleName}`);
  };

  vm.runInNewContext(source, {
    exports,
    require: fakeRequire,
    process: { platform: "win32" },
    console
  }, {
    filename: servicePath
  });

  const result = await exports.exportReportWorkbook(
    "reporte-global-prueba.xlsx",
    [
      { sheet: "Tickets", data: [] },
      { sheet: "Rutas", data: [] }
    ],
    [
      { sheet: "Tickets", data: [["T-001"]] },
      { sheet: "Rutas", data: [["R-001"]] }
    ]
  );

  assert.equal(result.ok, true);
  assert.equal(result.filePath, expectedPath);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].filePath, expectedPath);
  assert.equal(calls[0].sheets.length, 2);
});
