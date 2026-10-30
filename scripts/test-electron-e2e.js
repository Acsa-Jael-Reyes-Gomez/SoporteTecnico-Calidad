const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { setTimeout: delay } = require("node:timers/promises");

const projectRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(projectRoot, "assets", "database", "schema.sqlite.sql");
const rendererIndex = path.join(projectRoot, "dist", "renderer", "index.html");
const loginUser = "e2e_admin";
const loginPassword = "E2E-Only-Password-2026";
const requesterName = "Solicitante E2E";
const testDate = "2026-10-26";
const timeoutMs = Number(process.env.SOPORTE_E2E_TIMEOUT_MS) || 45_000;

function seedIsolatedDatabase(databasePath) {
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(fs.readFileSync(schemaPath, "utf8"));
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare("INSERT INTO des_tipo_ruta (idTipoRuta, nombre) VALUES (2, ?)").run("E2E");
    db.prepare("INSERT INTO des_clasificacion (idClasificacion, nombre) VALUES (1, ?), (2, ?)").run(
      "NORMAL",
      "EXTRAORDINARIO"
    );
    db.prepare(
      "INSERT INTO des_estado_calificacion (idEstadoCalificacion, nombre) VALUES (0, ?)"
    ).run("PENDIENTE");
    db.prepare("INSERT INTO rol (idRol, nombre) VALUES (1, 'ADMIN'), (2, 'TECNICO')").run();
    db.prepare("INSERT INTO unidad (idUnidad, nombre, idTipoRuta) VALUES (1, ?, 2)").run(
      "Unidad E2E"
    );
    db.prepare("INSERT INTO puesto (idPuesto, nombre) VALUES (1, ?)").run("Puesto E2E");
    db.prepare("INSERT INTO servicio (idServicio, nombre, idClasificacion) VALUES (1, ?, 1)").run(
      "Servicio E2E"
    );

    const bcrypt = require("bcryptjs");
    const adminHash = bcrypt.hashSync(loginPassword, 4);
    const techHash = bcrypt.hashSync("E2E-technician-never-used", 4);
    db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (1, ?, ?, ?, 1)"
    ).run(loginUser, adminHash, "Administrador E2E");
    db.prepare(
      "INSERT INTO usuario (idUsuario, usuario, pass, nombre, idRol) VALUES (2, ?, ?, ?, 2)"
    ).run("e2e_technician", techHash, "Técnico E2E");
    db.prepare("INSERT INTO usuario_unidad (idUsuario, idUnidad) VALUES (1, 1), (2, 1)").run();

    const permissions = ["TICKETS_CREAR", "TICKETS_VER_TODOS"];
    for (const [index, code] of permissions.entries()) {
      db.prepare("INSERT INTO permiso (idPermiso, code, descripcion) VALUES (?, ?, ?)").run(
        index + 1,
        code,
        code
      );
      db.prepare("INSERT INTO rol_permiso (idRol, idPermiso) VALUES (1, ?)").run(index + 1);
    }
  } finally {
    db.close();
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitForTarget(port, child, logs) {
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Electron terminó (${child.exitCode}).\n${logs.join("")}`);
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(
          (target) => target.type === "page" && target.webSocketDebuggerUrl
        );
        if (page) return page;
      }
    } catch {}
    await delay(250);
  }
  throw new Error(`Electron no publicó una página CDP en ${timeoutMs} ms.\n${logs.join("")}`);
}

function connectCdp(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  ws.addEventListener("close", () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error("La conexión CDP se cerró antes de responder."));
    }
    pending.clear();
  });
  return {
    ws,
    async ready() {
      await opened;
    },
    call(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP no respondió a ${method} antes del tiempo límite.`));
        }, 10_000);
        pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    async evaluate(expression) {
      const result = await this.call("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.exception?.description || result.exceptionDetails.text
        );
      }
      return result.result?.value;
    },
  };
}

async function waitForExpression(cdp, expression, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await cdp.evaluate(expression);
    if (value) return value;
    await delay(250);
  }
  const observedText = await cdp
    .evaluate("document.body?.innerText?.slice(-1200) || ''")
    .catch(() => "renderer unavailable");
  throw new Error(`Tiempo agotado esperando ${description}. Texto visible: ${observedText}`);
}

async function closeElectron(cdp, child) {
  if (cdp?.ws?.readyState === WebSocket.OPEN) {
    try {
      await cdp.call("Browser.close");
    } catch {}
    cdp.ws.close();
  }
  if (child && child.exitCode === null) {
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), delay(5_000)]);
    if (child.exitCode === null) child.kill();
  }
}

async function run() {
  assert.equal(
    process.platform,
    "win32",
    "La prueba E2E de Electron está configurada para Windows."
  );
  assert.ok(fs.existsSync(rendererIndex), "Primero compila la aplicación (npm run build).");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "soporte-e2e-"));
  const databasePath = path.join(tempRoot, "e2e.sqlite");
  const userDataPath = path.join(tempRoot, "electron-user-data");
  seedIsolatedDatabase(databasePath);

  const port = await getFreePort();
  const electronBinary = require("electron");
  const logs = [];
  const electronEnv = {
    ...process.env,
    SOPORTE_DATABASE_PATH: databasePath,
    ELECTRON_ENABLE_LOGGING: "1",
  };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(
    electronBinary,
    [
      projectRoot,
      "--headless=new",
      "--disable-gpu",
      `--user-data-dir=${userDataPath}`,
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
    ],
    {
      cwd: projectRoot,
      env: electronEnv,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  let cdp;
  try {
    const page = await waitForTarget(port, child, logs);
    console.log("E2E: Electron abrió su ventana; conectando con el renderer.");
    cdp = connectCdp(page.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.call("Runtime.enable");

    await waitForExpression(
      cdp,
      `document.querySelector('.loginWrap') && window.api && typeof window.api.login === 'function'`,
      "la pantalla de inicio y el puente Preload"
    );
    console.log("E2E: inicio y puente Preload listos.");

    const loginResult = await cdp.evaluate(`(async () => {
      const fields = document.querySelectorAll('.loginWrap input');
      const user = Array.from(fields).find((field) => field.placeholder === 'Usuario');
      const password = Array.from(fields).find((field) => field.type === 'password');
      if (!user || !password) throw new Error('No se encontraron los campos de inicio de sesión');
      user.value = ${JSON.stringify(loginUser)};
      user.dispatchEvent(new Event('input', { bubbles: true }));
      password.value = ${JSON.stringify(loginPassword)};
      password.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.loginBtn').click();
      return true;
    })()`);
    assert.equal(loginResult, true);

    await waitForExpression(
      cdp,
      `document.querySelector('.sidebar') && document.querySelector('.topbar-user')?.textContent.includes('Administrador E2E')`,
      "el acceso autenticado al shell de Electron"
    );
    console.log("E2E: autenticación real completada.");

    const moduleOpened = await cdp.evaluate(`(() => {
      const button = document.querySelector('[data-label="Módulo Tickets"]');
      if (!button) throw new Error('No se encontró la navegación del módulo de tickets');
      button.click();
      return true;
    })()`);
    assert.equal(moduleOpened, true);
    await waitForExpression(
      cdp,
      `document.querySelector('.module-tickets') && document.querySelector('.module-header-tickets')`,
      "la carga del módulo de tickets"
    );
    console.log("E2E: módulo Tickets cargado.");

    await cdp.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('.module-header-tickets button'))
        .find((item) => item.textContent.includes('Nuevo Ticket'));
      if (!button) throw new Error('No se encontró la acción Nuevo Ticket');
      button.click();
      return true;
    })()`);
    await waitForExpression(
      cdp,
      `document.querySelector('.modalBack')`,
      "el formulario de alta de ticket"
    );
    console.log("E2E: formulario de ticket abierto.");

    const formFilled = await cdp.evaluate(`(() => {
      const modal = document.querySelector('.modalBack');
      const fields = Array.from(modal.querySelectorAll('.field'));
      const applicant = fields.find((field) => field.textContent.includes('Nombre solicitante'))?.querySelector('input');
      if (!applicant) throw new Error('No se encontró el campo del solicitante');
      applicant.value = ${JSON.stringify(requesterName)};
      applicant.dispatchEvent(new Event('input', { bubbles: true }));

      const selects = Array.from(modal.querySelectorAll('.searchable-select-main'));
      const values = ['Puesto E2E', 'Unidad E2E', 'Servicio E2E'];
      if (selects.length < values.length) throw new Error('No se encontraron los selectores del formulario');
      for (const [index, input] of selects.slice(0, values.length).entries()) {
        input.click();
        input.value = values[index];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const option = Array.from(document.querySelectorAll('.searchable-select-option'))
          .find((item) => item.textContent.trim() === values[index]);
        if (!option) throw new Error('No apareció la opción ' + values[index]);
        option.click();
      }

      const openingDate = modal.querySelector('input[type="date"]');
      if (!openingDate) throw new Error('No se encontró la fecha de apertura');
      openingDate.value = ${JSON.stringify(testDate)};
      openingDate.dispatchEvent(new Event('input', { bubbles: true }));
      openingDate.dispatchEvent(new Event('change', { bubbles: true }));

      const technician = Array.from(modal.querySelectorAll('.checkboxGroup label'))
        .find((label) => label.textContent.includes('Técnico E2E'))?.querySelector('input[type="checkbox"]');
      if (!technician) throw new Error('No se encontró el técnico de prueba');
      technician.checked = true;
      technician.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    assert.equal(formFilled, true);
    console.log("E2E: datos del formulario completados.");

    await cdp.evaluate(`(() => {
      const modal = document.querySelector('.modalBack');
      const save = Array.from(modal.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Guardar');
      if (!save) throw new Error('No se encontró el botón para guardar el ticket');
      save.click();
      return true;
    })()`);
    console.log("E2E: envío del formulario solicitado.");
    await delay(1_000);
    const submissionState = await cdp.evaluate(`(() => ({
      modalOpen: Boolean(document.querySelector('.modalBack')),
      notifications: Array.from(document.querySelectorAll('[class*="toast"], [role="alert"]'))
        .map((item) => item.textContent.trim()).filter(Boolean),
      noHandlerErrors: Array.from(document.querySelectorAll('[class*="toast"], [role="alert"]'))
        .some((item) => item.textContent.includes('No handler registered'))
    }))()`);
    console.log(
      `E2E: avisos de interfaz tras guardar: ${JSON.stringify(submissionState.notifications)}`
    );
    assert.equal(
      submissionState.noHandlerErrors,
      false,
      "La ventana debe abrir con los IPC listos."
    );

    await waitForExpression(
      cdp,
      `!document.querySelector('.modalBack') && document.querySelector('.module-tickets')?.textContent.includes(${JSON.stringify(requesterName)})`,
      "el guardado y refresco del ticket creado"
    );
    console.log("E2E: alta guardada y vista actualizada.");

    await closeElectron(cdp, child);
    cdp = null;
    const verification = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = verification
        .prepare("SELECT nombreSolicitante, fechaApertura FROM ticket WHERE nombreSolicitante = ?")
        .get(requesterName);
      assert.equal(
        row?.nombreSolicitante,
        requesterName,
        "El ticket debe persistir en la base aislada de E2E."
      );
      assert.ok(
        String(row.fechaApertura).startsWith(testDate),
        "La fecha de prueba debe respetar el rango del fixture."
      );
    } finally {
      verification.close();
    }

    console.log(
      "E2E Electron aprobado: inicio, Preload/IPC, login, navegación a Tickets y alta de ticket persistida en SQLite aislado."
    );
  } finally {
    await closeElectron(cdp, child);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
