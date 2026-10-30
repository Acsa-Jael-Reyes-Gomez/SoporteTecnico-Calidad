// src/main/main.ts
import { app, BrowserWindow, ipcMain, shell, Menu, session as electronSession, dialog } from "electron";
import path from "path";
import fs from "fs";
import { translateTechnicalErrorToSpanish } from "../shared/user_error";

import { registerAuthHandlers } from "./ipc_auth";
import { registerCoreHandlers } from "./ipc_core";
import { clearAllTrustedSessions, clearTrustedSession, getTrustedSessionStatus } from "./session_store";
import { closePool } from "./db/db";

let mainWindow: BrowserWindow | null = null;
let shutdownStarted = false;
let deferredIpcHandlersPromise: Promise<void> | null = null;
const isDevRuntime = !app.isPackaged;
const gotSingleInstanceLock = app.requestSingleInstanceLock();
const isSecondaryInstance = !gotSingleInstanceLock;

function devInfo(...args: any[]) {
  if (isDevRuntime) console.log(...args);
}

function devError(...args: any[]) {
  if (isDevRuntime) console.error(...args);
}

const BROKEN_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u00f0]/;
const BROKEN_TEXT_MARKERS_REGEX = /[\u00c3\u00c2\u00e2\u00f0]/g;
const CP1252_EXTRA_BYTES_BY_CODE_POINT = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
]);
const COMMON_BROKEN_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ["sesi\uFFFDn", "sesión"],
  ["Sesi\uFFFDn", "Sesión"],
  ["v\uFFFDlida", "válida"],
  ["v\uFFFDlido", "válido"],
  ["inv\uFFFDlida", "inválida"],
  ["inv\uFFFDlido", "inválido"],
  ["cat\uFFFDlogo", "catálogo"],
  ["cat\uFFFDlogos", "catálogos"],
  ["m\uFFFDdulo", "módulo"],
  ["M\uFFFDdulo", "Módulo"],
  ["funci\uFFFDn", "función"],
  ["informaci\uFFFDn", "información"],
  ["Informaci\uFFFDn", "Información"],
  ["configuraci\uFFFDn", "configuración"],
  ["aplicaci\uFFFDn", "aplicación"],
  ["conexi\uFFFDn", "conexión"],
  ["operaci\uFFFDn", "operación"],
  ["Acci\uFFFDn", "Acción"],
  ["acci\uFFFDn", "acción"],
  ["Ocurri\uFFFD", "Ocurrió"],
  ["est\uFFFD", "está"],
  ["hab\uFFFDa", "había"]
];

function countBrokenTextMarkers(text: string) {
  const matches = String(text || "").match(BROKEN_TEXT_MARKERS_REGEX);
  return matches ? matches.length : 0;
}

function applyCommonBrokenTextReplacementsSafe(text: string) {
  let output = String(text || "");
  for (const [source, target] of COMMON_BROKEN_TEXT_REPLACEMENTS) {
    if (output.includes(source)) output = output.split(source).join(target);
  }
  if (output.trim() === "\uFFFD") return "—";
  return output.replace(/ \uFFFD /g, " • ");
}

function encodeBrokenTextBytes(text: string) {
  const bytes: number[] = [];
  for (const char of String(text || "")) {
    const codePoint = char.codePointAt(0) || 0;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }
    const mappedByte = CP1252_EXTRA_BYTES_BY_CODE_POINT.get(codePoint);
    if (mappedByte === undefined) return null;
    bytes.push(mappedByte);
  }
  return Uint8Array.from(bytes);
}

function decodeBrokenTextOnce(text: string) {
  const bytes = encodeBrokenTextBytes(text);
  if (!bytes) return text;
  return new TextDecoder("utf-8").decode(bytes);
}

function normalizeReadableTextSafe(value: any, fallback = "") {
  const baseValue = value === null || value === undefined || value === "" ? fallback : value;
  let text = applyCommonBrokenTextReplacementsSafe(String(baseValue ?? fallback ?? ""));
  if (!BROKEN_TEXT_PATTERN.test(text) && !/[\u00c3\u00c2\u00e2\ufffd]/.test(text)) return text;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeBrokenTextOnce(text);
      if (!decoded || decoded === text) break;
      if (countBrokenTextMarkers(decoded) > countBrokenTextMarkers(text)) break;
      text = applyCommonBrokenTextReplacementsSafe(decoded);
      if (!BROKEN_TEXT_PATTERN.test(text) && !/[\u00c3\u00c2\u00e2\ufffd]/.test(text)) break;
    } catch {
      break;
    }
  }

  return text;
}

function translateCommonErrorMessageSafe(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("err_failed") &&
    lower.includes("index.html") &&
    lower.includes("loading") &&
    lower.includes("file://")
  ) {
    return "La aplicación ya está abierta en esta sesión. Usa la ventana que ya está en ejecución.";
  }

  if (
    lower.includes("sesion invalida") ||
    lower.includes("sesión inválida") ||
    lower.includes("invalid session") ||
    lower.includes("session invalid")
  ) {
    return "La sesión ya no es válida. Inicia sesión nuevamente.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "No se pudo completar la operación por un problema de conexión.";
  }
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("ehostunreach") ||
    lower.includes("etimedout") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("socket hang up") ||
    lower.includes("connection refused")
  ) {
    return "No fue posible conectarse al sistema o a la base de datos.";
  }
  if (lower.includes("cannot read properties") || lower.includes("cannot set properties")) {
    return "Ocurrió un error interno al procesar la información.";
  }
  if (
    lower.includes("unexpected token") ||
    lower.includes("unexpected identifier") ||
    lower.includes("unexpected end of input")
  ) {
    return "Ocurrió un error interno al cargar un módulo de la interfaz.";
  }
  if (lower.includes("is not a function")) {
    return "Ocurrió un error interno porque una función requerida no está disponible.";
  }
  if (lower.includes("sin permiso") || lower.includes("access denied") || lower.includes("permission denied")) {
    return "No tienes permiso para realizar esta acción.";
  }
  if (lower.includes("falta api:")) {
    const apiName = message.split(":").slice(1).join(":").trim();
    return apiName
      ? `Falta una función interna requerida: ${apiName}.`
      : "Falta una función interna requerida para completar la acción.";
  }
  if (lower.includes("duplicate entry")) {
    return "Ya existe un registro con esos datos.";
  }
  if (
    lower.includes("foreign key constraint") ||
    lower.includes("cannot add or update a child row") ||
    lower.includes("a foreign key constraint fails")
  ) {
    return "No se puede completar la operación porque hay registros relacionados.";
  }
  if (
    lower.includes("sql syntax") ||
    lower.includes("er_parse_error") ||
    lower.includes("unknown column")
  ) {
    return "Ocurrió un error interno al consultar la base de datos.";
  }
  if (lower.includes("er_access_denied_error") || lower.includes("access denied for user")) {
    return "No fue posible conectarse a la base de datos con la configuración actual.";
  }
  if (lower.includes("unknown database") || lower.includes("er_bad_db_error")) {
    return "No se encontró la base de datos configurada.";
  }
  if (lower.includes("enoent") || lower.includes("no such file or directory")) {
    return "Falta un archivo requerido para completar la operación.";
  }
  if (lower.includes("object has been destroyed") || lower.includes("browser has been closed")) {
    return "La ventana de la aplicación ya no estaba disponible.";
  }
  if ((lower.includes("target page") || lower.includes("target browser")) && lower.includes("closed")) {
    return "La ventana de la aplicación ya se había cerrado.";
  }
  if (lower.includes("invalid url") || lower.includes("url vacia") || lower.includes("url inválida")) {
    return "El enlace proporcionado no es válido.";
  }

  return message;
}

function getMainUserErrorMessageSafe(error: any, fallback = "Ocurrió un error interno en la aplicación.") {
  const rawMessage =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? error.message
        : fallback;

  let message = normalizeReadableTextSafe(rawMessage, fallback).trim();
  if (!message) message = fallback;

  return translateTechnicalErrorToSpanish(
    translateCommonErrorMessageSafe(message),
    "No se pudo completar la operación. Comunícate con Sistemas."
  );
}

function showUserErrorBox(title: string, message: any) {
  dialog.showErrorBox(normalizeReadableTextSafe(title), getMainUserErrorMessageSafe(message));
}

function fastShutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;

  clearAllTrustedSessions();

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.removeAllListeners("close");
      mainWindow.removeAllListeners("closed");
      mainWindow.destroy();
    }
  } catch {}

  // Cerrar la BD en segundo plano, sin bloquear la salida del usuario.
  void closePool().catch(() => {});

  setImmediate(() => {
    app.exit(0);
  });
}

/* ======================================================
   RUTAS ROBUSTAS
   Usa app.getAppPath() para evitar errores con __dirname
====================================================== */
function getPreloadPath() {
  return path.resolve(app.getAppPath(), "dist", "preload", "preload.js");
}

function getIndexHtmlPath() {
  return path.resolve(app.getAppPath(), "dist", "renderer", "index.html");
}

function getIconPath() {
  return path.resolve(app.getAppPath(), "assets", "icon.ico");
}

/* ======================================================
   VALIDACIÓN DE ARCHIVOS ANTES DE CARGAR
====================================================== */
function validateRequiredFiles(): boolean {
  const preloadPath = getPreloadPath();
  const indexHtmlPath = getIndexHtmlPath();

  if (!fs.existsSync(preloadPath)) {
    const errorMsg = `[ERROR] No se encontró el archivo preload: ${preloadPath}`;
    showUserErrorBox("Error de carga", errorMsg);
    return false;
  }

  if (!fs.existsSync(indexHtmlPath)) {
    const errorMsg = `[ERROR] No se encontró el archivo index.html: ${indexHtmlPath}`;
    showUserErrorBox("Error de carga", errorMsg);
    return false;
  }

  return true;
}

/* ======================================================
   SEGURIDAD DE NAVEGACIÓN
====================================================== */
function hardenNavigation(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://")) return;
    event.preventDefault();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url).catch(() => {});
    }
  });
}

function configureSpellcheck(win: BrowserWindow) {
  try {
    const spellSession = win.webContents.session;
    const preferred = ["es-ES", "es-MX", "en-US"];
    const available = Array.isArray((spellSession as any).availableSpellCheckerLanguages)
      ? (spellSession as any).availableSpellCheckerLanguages
      : [];
    const selected = preferred.filter((lang) => available.includes(lang));

    if (selected.length && typeof spellSession.setSpellCheckerLanguages === "function") {
      spellSession.setSpellCheckerLanguages(selected);
    }
  } catch {}

  win.webContents.on("context-menu", (_event, params) => {
    const template: any[] = [];
    const suggestions = Array.isArray(params.dictionarySuggestions)
      ? params.dictionarySuggestions.slice(0, 6)
      : [];

    if (params.misspelledWord) {
      if (suggestions.length) {
        template.push(
          ...suggestions.map((word) => ({
            label: word,
            click: () => win.webContents.replaceMisspelling(word)
          }))
        );
      } else {
        template.push({ label: "Sin sugerencias", enabled: false });
      }

      if (params.isEditable) {
        template.push({ type: "separator" });
      }
    }

    if (params.isEditable) {
      template.push(
        { role: "undo", label: "Deshacer" },
        { role: "redo", label: "Rehacer" },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        { role: "selectAll", label: "Seleccionar todo" }
      );
    }

    if (!template.length) return;
    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

/* ======================================================
   LISTENERS DE DIAGNÓSTICO DEL RENDERER
====================================================== */
function registerDiagnosticListeners(win: BrowserWindow) {
  if (!isDevRuntime) return;

  win.webContents.on("console-message", (event) => {
    const payload = (event as any);
    devInfo("[RENDERER CONSOLE]", {
      level: payload.level,
      message: payload.message,
      line: payload.lineNumber,
      sourceId: payload.sourceId
    });
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    devError("[RENDERER ERROR] did-fail-load:", {
      errorCode,
      errorDescription,
      url: win.webContents.getURL()
    });
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    devError("[RENDERER ERROR] render-process-gone:", {
      reason: details.reason,
      exitCode: details.exitCode
    });
  });
}

/* ======================================================
   HANDLER: session:clear
====================================================== */
function registerSessionHandlers() {
  ipcMain.removeHandler("session:clear");

  ipcMain.handle("session:clear", async (event) => {
    try {
      clearTrustedSession(event);
      const ses = electronSession.defaultSession;

      await ses.clearCache().catch(() => {});
      await ses.clearStorageData().catch(() => {});
      await ses.clearHostResolverCache?.().catch?.(() => {});

      return { ok: true };
    } catch (err: any) {
      devError("session:clear error:", err);
      return { ok: false, message: "No se pudo limpiar la sesión." };
    }
  });

  ipcMain.removeHandler("session:status");
  ipcMain.handle("session:status", async (event) => getTrustedSessionStatus(event));
}

async function registerDeferredIpcHandlers() {
  if (deferredIpcHandlersPromise) return deferredIpcHandlersPromise;

  deferredIpcHandlersPromise = (async () => {
    const [
      ticketsModule,
      rutasModule,
      reportsModule,
      equiposModule,
      proyectosModule,
      envioModule,
      utilsModule
    ] = await Promise.all([
      import("./ipc_tickets.js"),
      import("./ipc_rutas.js"),
      import("./ipc_reports.js"),
      import("./ipc_equipos.js"),
      import("./ipc_proyectos_especiales.js"),
      import("./ipc_envio_equipo.js"),
      import("./ipc_utils.js")
    ]);

    ticketsModule.registerTicketsHandlers(ipcMain);
    rutasModule.registerRutasHandlers(ipcMain);
    reportsModule.registerReportsHandlers(ipcMain);
    equiposModule.registerEquiposHandlers(ipcMain);
    proyectosModule.registerProyectosEspecialesHandlers(ipcMain);
    envioModule.registerEnvioEquipoHandlers(ipcMain);
    utilsModule.registerUtilsHandlers(ipcMain);
  })().catch((error) => {
    deferredIpcHandlersPromise = null;
    throw error;
  });

  return deferredIpcHandlersPromise;
}

/* ======================================================
   CREAR VENTANA
====================================================== */
function createWindow() {
  if (isSecondaryInstance || shutdownStarted) return;

  if (!validateRequiredFiles()) {
    app.quit();
    return;
  }

  const preloadPath = getPreloadPath();
  const indexPath = getIndexHtmlPath();
  const iconPath = getIconPath();

mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    frame: false,
    minWidth: 1000,
    minHeight: 680,
    show: true,
    backgroundColor: "#0b1220",
    transparent: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: false
    }
  });

  try {
    Menu.setApplicationMenu(null);
    mainWindow.setMenu(null);
  } catch {}

  registerDiagnosticListeners(mainWindow);
  hardenNavigation(mainWindow);
  configureSpellcheck(mainWindow);

  let windowShown = true;
  const showWindow = () => {
    if (windowShown) return;
    windowShown = true;
    mainWindow?.show();
  };

  mainWindow.webContents.once("dom-ready", showWindow);
  mainWindow.once("ready-to-show", showWindow);

  mainWindow.loadFile(indexPath).catch((err) => {
    const rawMessage = String(err?.message || err || "");

    if (shutdownStarted || isSecondaryInstance) return;

    if (
      /ERR_FAILED\s*\(-2\)/i.test(rawMessage) &&
      rawMessage.includes("index.html") &&
      rawMessage.includes("file://")
    ) {
      showUserErrorBox("Aplicación ya abierta", rawMessage);
      return;
    }

    showUserErrorBox("Error de carga", `Error al cargar index.html: ${rawMessage}\n\nRuta: ${indexPath}`);
  });

  mainWindow.on("closed", () => {
    clearAllTrustedSessions();
    mainWindow = null;
  });
}

/* ======================================================
   UNA SOLA INSTANCIA
====================================================== */
if (!gotSingleInstanceLock) {
  app.exit(0);
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* ======================================================
   IPC REGISTRO
====================================================== */
function registerIpcHandlers() {
  registerSessionHandlers();

  /* Window controls handlers - moved from ipc_utils.ts */
  ipcMain.handle("window:minimize", async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
      return { ok: true };
    }
    return { ok: false, message: "Ventana no disponible" };
  });

  ipcMain.handle("window:maximize", async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return { ok: true };
    }
    return { ok: false, message: "Ventana no disponible" };
  });

  ipcMain.handle("window:close", async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      fastShutdown();
      return { ok: true };
    }
    return { ok: false, message: "Ventana no disponible" };
  });
  /* End window controls */

  registerAuthHandlers(ipcMain);
  registerCoreHandlers(ipcMain);
}

/* ======================================================
   GUARDAS GLOBALES
====================================================== */
function registerProcessGuards() {
  process.on("uncaughtException", (err) => {
    devError("uncaughtException:", err);
    if (!isDevRuntime) {
      showUserErrorBox("Error interno", err);
    }
  });

  process.on("unhandledRejection", (reason) => {
    devError("unhandledRejection:", reason);
    if (!isDevRuntime) {
      showUserErrorBox("Error interno", reason);
    }
  });
}

/* ======================================================
   APP READY
====================================================== */
app.whenReady().then(async () => {
  if (isSecondaryInstance) {
    app.exit(0);
    return;
  }

  registerProcessGuards();

  try {
    app.setAppUserModelId("IT_TICKETS");
  } catch {}

  registerIpcHandlers();
  await registerDeferredIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* ======================================================
   CIERRE
====================================================== */
app.on("before-quit", () => {
  if (shutdownStarted) return;
  shutdownStarted = true;
  clearAllTrustedSessions();
  void closePool().catch(() => {});
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") fastShutdown();
});
