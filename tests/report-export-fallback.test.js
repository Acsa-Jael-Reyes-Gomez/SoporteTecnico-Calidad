const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
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

test("recupera la exportación individual cuando falla Excel interactivo", async () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sqa-export-")
  );

  try {
    const filePath = path.join(tempDir, "reporte.xlsx");
    const exports = {};

    const fakeRequire = (moduleName) => {
      if (moduleName === "electron") {
        return {
          dialog: {
            async showSaveDialog() {
              return { canceled: false, filePath };
            }
          }
        };
      }

      if (moduleName === "../ticket_excel_export") {
        return {
          async exportInteractiveTicketWorkbook() {
            throw new Error("Excel no disponible");
          },
          async exportInteractiveTicketWorkbookMulti() {
            throw new Error("Excel no disponible");
          }
        };
      }

      if (moduleName === "./export_security") {
        return require("../dist/main/services/export_security.js");
      }

      throw new Error(`Dependencia inesperada: ${moduleName}`);
    };

    const source = fs.readFileSync(servicePath, "utf8");

    vm.runInNewContext(
      source,
      {
        exports,
        require: fakeRequire,
        process: { platform: "win32" },
        console
      },
      {
        filename: servicePath,
        importModuleDynamically(specifier) {
          if (specifier !== "write-excel-file/node") {
            throw new Error(`Importación inesperada: ${specifier}`);
          }
          return import(specifier);
        }
      }
    );

    const result = await exports.exportReport(
      "reporte.xlsx",
      {
        sheet: "Tickets",
        data: [
          [{ value: "Ticket", type: String }],
          [{ value: "T-001", type: String }]
        ]
      },
      [["Ticket"], ["T-001"]]
    );

    assert.equal(result.ok, true);
    assert.equal(result.filePath, filePath);
    assert.equal(fs.existsSync(filePath), true);
    assert.ok(fs.statSync(filePath).size > 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
