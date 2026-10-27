const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("el historial de envios carga completo y conserva filtros opcionales", () => {
  const mainSource = fs.readFileSync(path.join(__dirname, "../src/main/ipc_envio_equipo.ts"), "utf8");
  const rendererSource = fs.readFileSync(
    path.join(__dirname, "../src/renderer/modulos/equipos-y-envios.js"),
    "utf8"
  );

  assert.doesNotMatch(
    mainSource,
    /if\s*\(!desde\s*&&\s*!hasta\)[\s\S]{0,160}monthlyRangeMysql/,
    "el backend no debe imponer un rango mensual al historial"
  );
  assert.match(mainSource, /if\s*\(desde\)[\s\S]{0,100}ee\.fechaEnvio\s*>=\s*\?/);
  assert.match(mainSource, /if\s*\(hasta\)[\s\S]{0,100}ee\.fechaEnvio\s*<=\s*\?/);

  const historySource = rendererSource.slice(rendererSource.indexOf("function buildHistoryView()"));
  assert.match(historySource, /const defaultDesde = mysqlToDateValue\(defaultRange\.start\)/);
  assert.match(historySource, /const desde = el\("input", \{ type: "date", value: defaultDesde \}\)/);
  assert.match(historySource, /desde\.value = defaultDesde/);
  assert.match(historySource, /desde: desde\.value \? dateToMysqlStartOfDay\(desde\.value\) : null/);
  assert.doesNotMatch(historySource, /Promise\.all\s*\(/);
});

test("serializa las operaciones ODBC para evitar bloqueos del driver 3.51", () => {
  const dbSource = fs.readFileSync(path.join(__dirname, "../src/main/db/db.ts"), "utf8");
  assert.match(dbSource, /await acquireDatabaseTurn\(\)/);
  assert.match(dbSource, /await databaseOperationTail/);
  assert.match(dbSource, /releaseTurn\(\)/);
});

test("el resumen de envios evita parametros dentro de agregados incompatibles con ODBC 3.51", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main/ipc_envio_equipo.ts"), "utf8");
  assert.doesNotMatch(source, /SUM\s*\(\s*CASE\s+WHEN\s+ee\.idEstadoEnvio\s*=\s*\?/i);
  assert.match(source, /GROUP BY ee\.idEstadoEnvio/);
});
