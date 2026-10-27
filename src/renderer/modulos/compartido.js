// UI: Login + Tickets + Rutas + Reportes + Export Excel (IPC).

let session = null;
let catalogos = null;
let pendingTicketPrefill = null;
let pendingTicketOpenId = null;
let modalWindowSequence = 0;

const MODAL_DOCK_ROOT_ID = "modalDockRoot";

function getModalDockRoot() {
  let root = document.getElementById(MODAL_DOCK_ROOT_ID);
  if (!root) {
    root = el("div", { id: MODAL_DOCK_ROOT_ID, class: "modal-dock-root is-empty" }, []);
    document.body.appendChild(root);
  }
  return root;
}

function refreshModalDockRootState() {
  const root = document.getElementById(MODAL_DOCK_ROOT_ID);
  if (!root) return;
  root.classList.toggle("is-empty", root.childElementCount === 0);
}

function bringModalWindowToFront(back) {
  if (!(back instanceof HTMLElement)) return;
  modalWindowSequence += 1;
  back.style.zIndex = String(9999 + modalWindowSequence);
}

function setPendingTicketPrefill(data) {
  pendingTicketPrefill = data ? { ...data } : null;
}

function takePendingTicketPrefill() {
  const snapshot = pendingTicketPrefill;
  pendingTicketPrefill = null;
  return snapshot;
}

function setPendingTicketOpenId(idTicket) {
  const value = Number(idTicket || 0);
  pendingTicketOpenId = value > 0 ? value : null;
}

function takePendingTicketOpenId() {
  const snapshot = pendingTicketOpenId;
  pendingTicketOpenId = null;
  return snapshot;
}

const $ = (sel) => document.querySelector(sel);





function translateUnhandledTechnicalMessage(message) {
  const text = String(message || "").trim();
  if (!text) return "No se pudo completar la operación.";
  return /\b(command failed|exception|failed|cannot|could not|unknown|not found|doesn't exist|sqlstate|odbc|mysql|hresult|stack trace)\b/i.test(text)
    ? "No se pudo completar la operación. Intenta nuevamente o comunícate con Sistemas."
    : text;
}




const BROKEN_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u00f0]/;
const BROKEN_TEXT_MARKERS_REGEX = /[\u00c3\u00c2\u00e2\u00f0]/g;
const CP1252_EXTRA_BYTES_BY_CODE_POINT = new Map([
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
const COMMON_BROKEN_TEXT_REPLACEMENTS = [
  ["sesi\uFFFDn", "sesión"],
  ["Sesi\uFFFDn", "Sesión"],
  ["v\uFFFDlida", "válida"],
  ["v\uFFFDlido", "válido"],
  ["inv\uFFFDlida", "inválida"],
  ["inv\uFFFDlido", "inválido"],
  ["cat\uFFFDlogo", "catálogo"],
  ["cat\uFFFDlogos", "catálogos"],
  ["Contrase\uFFFDa", "Contraseña"],
  ["contrase\uFFFDa", "contraseña"],
  ["m\uFFFDdulo", "módulo"],
  ["M\uFFFDdulo", "Módulo"],
  ["funci\uFFFDn", "función"],
  ["informaci\uFFFDn", "información"],
  ["Informaci\uFFFDn", "Información"],
  ["T\uFFFDcnico", "Técnico"],
  ["t\uFFFDcnico", "técnico"],
  ["t\uFFFDcnicos", "técnicos"],
  ["env\uFFFDo", "envío"],
  ["Env\uFFFDo", "Envío"],
  ["n\uFFFDmero", "número"],
  ["N\uFFFDmero", "Número"],
  ["Tel\uFFFDfono", "Teléfono"],
  ["tel\uFFFDfono", "teléfono"],
  ["veh\uFFFDculo", "vehículo"],
  ["Veh\uFFFDculo", "Vehículo"],
  ["P\uFFFDgina", "Página"],
  ["p\uFFFDgina", "página"],
  ["bot\uFFFDn", "botón"],
  ["autom\uFFFDtico", "automático"],
  ["revisi\uFFFDn", "revisión"],
  ["Revisi\uFFFDn", "Revisión"],
  ["soluci\uFFFDn", "solución"],
  ["Soluci\uFFFDn", "Solución"],
  ["configuraci\uFFFDn", "configuración"],
  ["aplicaci\uFFFDn", "aplicación"],
  ["conexi\uFFFDn", "conexión"],
  ["operaci\uFFFDn", "operación"],
  ["vinculaci\uFFFDn", "vinculación"],
  ["reparaci\uFFFDn", "reparación"],
  ["Reparaci\uFFFDn", "Reparación"],
  ["Cami\uFFFDn", "Camión"],
  ["cami\uFFFDn", "camión"],
  ["atenci\uFFFDn", "atención"],
  ["validaci\uFFFDn", "validación"],
  ["Validaci\uFFFDn", "Validación"],
  ["Descripci\uFFFDn", "Descripción"],
  ["descripci\uFFFDn", "descripción"],
  ["Acci\uFFFDn", "Acción"],
  ["acci\uFFFDn", "acción"],
  ["T\uFFFDtulo", "Título"],
  ["t\uFFFDtulo", "título"],
  ["m\uFFFDnimo", "mínimo"],
  ["quedar\uFFFD", "quedará"],
  ["podr\uFFFD", "podrá"],
  ["tambi\uFFFDn", "también"],
  ["m\uFFFDs", "más"],
  ["est\uFFFD", "está"],
  ["hab\uFFFDa", "había"],
  ["Ocurri\uFFFD", "Ocurrió"]
];
let readableTextObserverStarted = false;

function countBrokenTextMarkers(text) {
  const matches = String(text || "").match(BROKEN_TEXT_MARKERS_REGEX);
  return matches ? matches.length : 0;
}

function applyCommonBrokenTextReplacementsSafe(text) {
  let output = String(text || "");
  for (const [source, target] of COMMON_BROKEN_TEXT_REPLACEMENTS) {
    if (output.includes(source)) output = output.split(source).join(target);
  }
  if (output.trim() === "\uFFFD") return "—";
  return output.replace(/ \uFFFD /g, " • ");
}

function encodeBrokenTextBytes(text) {
  const bytes = [];
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

function decodeBrokenTextOnce(text) {
  const bytes = encodeBrokenTextBytes(text);
  if (!bytes) return text;
  return new TextDecoder("utf-8").decode(bytes);
}

function repairUnreadableText(text) {
  let value = applyCommonBrokenTextReplacementsSafe(String(text || ""));
  if (!BROKEN_TEXT_PATTERN.test(value) && !/[\u00c3\u00c2\u00e2\ufffd]/.test(value)) return value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeBrokenTextOnce(value);
      if (!decoded || decoded === value) break;
      if (countBrokenTextMarkers(decoded) > countBrokenTextMarkers(value)) break;
      value = applyCommonBrokenTextReplacementsSafe(decoded);
      if (!BROKEN_TEXT_PATTERN.test(value) && !/[\u00c3\u00c2\u00e2\ufffd]/.test(value)) break;
    } catch {
      break;
    }
  }

  return value;
}

function toUserText(value, fallback = "") {
  const baseValue = value === null || value === undefined || value === "" ? fallback : value;
  return repairUnreadableText(String(baseValue ?? fallback ?? ""));
}

function translateCommonErrorMessage(message) {
  const lower = message.toLowerCase();

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
    lower.includes("can't connect to mysql server") ||
    lower.includes("can not connect to mysql server") ||
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
  if (lower.includes("window is not defined") || lower.includes("document is not defined")) {
    return "Ocurrió un error interno al iniciar la interfaz.";
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

  return translateUnhandledTechnicalMessage(message);
}

function getUserErrorMessage(error, fallback = "Ocurrió un error inesperado.") {
  const rawMessage =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? error.message
        : fallback;

  let message = toUserText(rawMessage, fallback).trim();
  if (!message) message = toUserText(fallback);

  return translateCommonErrorMessage(message);
}

function isSessionErrorMessage(value) {
  const lower = toUserText(value).trim().toLowerCase();
  return (
    lower.includes("sesion invalida") ||
    lower.includes("sesión inválida") ||
    lower.includes("invalid session") ||
    lower.includes("session invalid")
  );
}

function normalizeReadableDomNode(node) {
  if (!(node instanceof Node)) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const currentText = node.nodeValue || "";
    const repairedText = repairUnreadableText(currentText);
    if (repairedText !== currentText) node.nodeValue = repairedText;
    return;
  }

  if (!(node instanceof Element)) return;

  for (const attrName of ["placeholder", "title", "aria-label", "data-label"]) {
    if (!node.hasAttribute(attrName)) continue;
    const currentValue = node.getAttribute(attrName) || "";
    const repairedValue = repairUnreadableText(currentValue);
    if (repairedValue !== currentValue) node.setAttribute(attrName, repairedValue);
  }

  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    const canNormalizeValue =
      node.readOnly ||
      node.disabled ||
      ["button", "submit", "reset", "search"].includes(String(node.type || "").toLowerCase());

    if (canNormalizeValue && typeof node.value === "string") {
      const repairedValue = repairUnreadableText(node.value);
      if (repairedValue !== node.value) node.value = repairedValue;
    }
  }

  for (const child of node.childNodes) {
    normalizeReadableDomNode(child);
  }
}

function startReadableTextObserver() {
  if (readableTextObserverStarted) return;
  readableTextObserverStarted = true;

  const attachObserver = () => {
    if (!document.documentElement) return;
    normalizeReadableDomNode(document.body || document.documentElement);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" || mutation.type === "attributes") {
          normalizeReadableDomNode(mutation.target);
          continue;
        }

        for (const addedNode of mutation.addedNodes) {
          normalizeReadableDomNode(addedNode);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "data-label", "value"]
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachObserver, { once: true });
    return;
  }

  attachObserver();
}

startReadableTextObserver();

/**
 * Helper DOM builder (robusto para attrs booleanos como checked/selected/disabled)
 */
const el = (tag, attrs = {}, children = []) => {
  const n = document.createElement(tag);
  const normalizedChildren = Array.isArray(children) ? children : [children];
  const attrBag = attrs || {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(attrBag, key);

  for (const [k, v] of Object.entries(attrBag)) {
    if (k === "class") {
      n.className = v || "";
      continue;
    }
    if (k === "html") {
      n.innerHTML = toUserText(v ?? "");
      continue;
    }
    if (k.startsWith("on") && typeof v === "function") {
      n.addEventListener(k.substring(2), v);
      continue;
    }
    if (k === "style") {
      n.setAttribute("style", v ?? "");
      continue;
    }

    // Boolean properties
    if (k === "checked") {
      n.checked = !!v;
      continue;
    }
    if (k === "selected") {
      n.selected = !!v;
      continue;
    }
    if (k === "disabled") {
      n.disabled = !!v;
      continue;
    }
    if (k === "spellcheck") {
      n.spellcheck = !!v;
      continue;
    }

    if (k === "value") {
      n.value = typeof v === "string" ? toUserText(v) : (v ?? "");
      continue;
    }

    if (v === undefined || v === null) continue;
    n.setAttribute(k, typeof v === "string" ? toUserText(v) : String(v));
  }

  const tagName = String(tag || "").toLowerCase();
  if (tagName === "textarea") {
    if (!hasOwn("spellcheck")) n.spellcheck = true;
    if (!hasOwn("autocorrect")) n.setAttribute("autocorrect", "on");
    if (!hasOwn("autocapitalize")) n.setAttribute("autocapitalize", "sentences");
  }

  if (tagName === "input") {
    const inputType = String(attrBag.type || "text").toLowerCase();
    const canSpellcheck = inputType === "text" || inputType === "search";
    if (canSpellcheck) {
      if (!hasOwn("spellcheck")) n.spellcheck = true;
      if (!hasOwn("autocorrect")) n.setAttribute("autocorrect", "on");
      if (!hasOwn("autocapitalize")) n.setAttribute("autocapitalize", "sentences");
    }
  }

  for (const c of normalizedChildren) {
    if (c === null || c === undefined) continue;
    if (Array.isArray(c)) {
      // Allow passing nested arrays of children
      for (const cc of c) {
        if (cc === null || cc === undefined) continue;
        n.appendChild(cc instanceof Node ? cc : document.createTextNode(toUserText(cc)));
      }
      continue;
    }
    n.appendChild(c instanceof Node ? c : document.createTextNode(toUserText(c)));
  }
  return n;
};

function compactIdHeader(iconClass, fullLabel, shortLabel, forceCompact = false) {
  const compactClass = forceCompact ? " is-compact" : "";
  return [
    el("i", { class: iconClass }),
    el("span", { class: `id-head-full${compactClass}` }, [fullLabel]),
    el("span", { class: `id-head-short${compactClass}`, title: fullLabel }, [shortLabel || fullLabel])
  ];
}

function tableHeadLabel(iconClass, fullLabel, shortLabel = null) {
  const visibleLabel = String(shortLabel || fullLabel || "");
  const title = String(fullLabel || visibleLabel || "");
  return el("span", { class: "table-head-label", title }, [
    el("i", { class: iconClass, title }),
    el("span", { class: "table-head-text", title }, [visibleLabel])
  ]);
}

const TABLE_HEADER_ABBREVIATIONS = {
  "Fecha aprobación": "F. Aprobación",
  "Fecha registro": "F. Registro",
  "Fecha apertura": "Fecha",
  "Fecha cierre": "F. Cierre",
  "Cambio Complejidad": "C. Complejidad",
  "Fecha Validación": "F. Validación",
  "Nombre Validador": "Validador",
  "Puesto Validador": "Puesto",
  "Link Documento": "Documento",
  "Observación": "Obs.",
  "Observaciones": "Obs.",
  "Calificar": "Calif."
};

function normalizeExcelTableHeaders(root = document) {
  const scope = root && typeof root.querySelectorAll === "function" ? root : document;
  scope.querySelectorAll('.tableWrap thead th, .calif-table thead th').forEach((th) => {
    if (!(th instanceof HTMLElement)) return;

    const idHeader = th.querySelector('.id-head-full, .id-head-short');
    if (idHeader) {
      const fullText = th.querySelector('.id-head-full')?.textContent?.trim() || th.title || th.textContent?.trim() || "";
      if (fullText) th.title = fullText;
      return;
    }

    const existingLabel = th.querySelector('.table-head-text');
    const fullLabel = String(
      th.dataset.fullLabel ||
      th.title ||
      existingLabel?.getAttribute('title') ||
      th.textContent ||
      ""
    ).replace(/\s+/g, ' ').trim();

    if (!fullLabel) return;

    const shortLabel = TABLE_HEADER_ABBREVIATIONS[fullLabel] || fullLabel;
    const iconClass = th.querySelector('i')?.className || "";
    const hasStructuredHeader = !!existingLabel || !!iconClass;

    th.dataset.fullLabel = fullLabel;
    th.title = fullLabel;
    if (!hasStructuredHeader) return;
    th.innerHTML = "";
    th.appendChild(tableHeadLabel(iconClass, fullLabel, shortLabel));
  });
  initResizableExcelTables(scope);
}

function getPagerItems(totalPages, page) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push("...");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push("...");
  items.push(totalPages);
  return items;
}

function createTableFooterBar({
  page = 1,
  pageSize = 25,
  total = 0,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className = ""
}) {
  const safeTotal = Math.max(0, Number(total || 0));
  const safePageSize = Math.max(1, Number(pageSize || 25));
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page || 1)), totalPages);
  const from = safeTotal ? (safePage - 1) * safePageSize + 1 : 0;
  const to = safeTotal ? Math.min(safeTotal, safePage * safePageSize) : 0;
  const footerClassName = ["table-footer-bar", className].filter(Boolean).join(" ");

  const pagerButtons = getPagerItems(totalPages, safePage).map((item) => {
    if (item === "...") {
      return el("span", { class: "table-page-dots", "aria-hidden": "true" }, ["..."]);
    }

    return el("button", {
      class: `btn table-page-btn${Number(item) === safePage ? " is-active" : ""}`,
      type: "button",
      onclick: () => typeof onPageChange === "function" && onPageChange(Number(item))
    }, [String(item)]);
  });

  const pageSizeSelect = el("select", {
    class: "table-page-size",
    "aria-label": "Resultados por página"
  }, []);

  Array.from(new Set([...(Array.isArray(pageSizeOptions) ? pageSizeOptions : []), safePageSize]))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
    .forEach((value) => {
      pageSizeSelect.appendChild(el("option", {
        value,
        selected: value === safePageSize
      }, [`${value} por página`]));
    });

  pageSizeSelect.onchange = () => {
    if (typeof onPageSizeChange === "function") {
      onPageSizeChange(Number(pageSizeSelect.value || safePageSize));
    }
  };

  return el("div", { class: footerClassName }, [
    el("div", { class: "table-footer-meta" }, [`Mostrando ${from} a ${to} de ${safeTotal} resultados`]),
    el("div", { class: "table-footer-controls" }, [
      el("div", { class: "table-pager" }, [
        el("button", {
          class: "btn table-page-btn table-page-btn-nav",
          type: "button",
          disabled: safePage <= 1,
          onclick: () => typeof onPageChange === "function" && onPageChange(safePage - 1)
        }, [el("i", { class: "fas fa-chevron-left" }), " Anterior"]),
        ...pagerButtons,
        el("button", {
          class: "btn table-page-btn table-page-btn-nav",
          type: "button",
          disabled: safePage >= totalPages,
          onclick: () => typeof onPageChange === "function" && onPageChange(safePage + 1)
        }, ["Siguiente ", el("i", { class: "fas fa-chevron-right" })])
      ]),
      pageSizeSelect
    ])
  ]);
}

const _excelResizableTables = new WeakMap();

function getExcelTables(root = document) {
  const scope = root && typeof root.querySelectorAll === "function" ? root : document;
  const tables = new Set();
  const addTable = (node) => {
    if (!(node instanceof HTMLTableElement)) return;
    if (!node.tHead || !node.tHead.rows || !node.tHead.rows.length) return;
    if (node.closest(".dashboardWrap")) return;
    if (!node.closest(".tableWrap")) return;
    tables.add(node);
  };

  if (scope instanceof HTMLTableElement) addTable(scope);
  if (scope instanceof HTMLElement && scope.matches(".tableWrap")) {
    scope.querySelectorAll("table").forEach(addTable);
  }
  if (scope instanceof HTMLElement && scope.matches(".tableWrap table, table.calif-table")) {
    addTable(scope);
  }
  scope.querySelectorAll?.(".tableWrap table, table.calif-table").forEach(addTable);

  return Array.from(tables);
}

function getExcelTableHeaders(table) {
  return Array.from(table?.tHead?.rows?.[0]?.cells || []).filter((cell) => cell instanceof HTMLTableCellElement);
}

function getExcelResizeStorageKey(table, headers = getExcelTableHeaders(table)) {
  const wrap = table.closest(".tableWrap");
  const wrapKey = String(wrap?.className || table.className || "excel-table")
    .replace(/\s+/g, " ")
    .trim();
  const labels = headers
    .map((th) => String(th.dataset.fullLabel || th.getAttribute("title") || th.textContent || "").replace(/\s+/g, " ").trim())
    .join("|");
  return `excel-resize:${wrapKey}:${labels}`;
}

function readExcelResizeWidths(key, count) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== count) return null;
    const widths = parsed.map((value) => Math.max(0, Math.round(Number(value) || 0)));
    return widths.length === count ? widths : null;
  } catch {
    return null;
  }
}

function writeExcelResizeWidths(key, widths) {
  try {
    localStorage.setItem(key, JSON.stringify(widths.map((value) => Math.round(Number(value) || 0))));
  } catch {}
}

function getExcelResizeMinWidth(th) {
  return 8;
}

function ensureExcelResizeColgroup(table, count) {
  let colgroup = Array.from(table.children).find(
    (child) => child.tagName === "COLGROUP" && child.classList.contains("excel-resize-colgroup")
  );
  if (!colgroup) {
    colgroup = document.createElement("colgroup");
    colgroup.className = "excel-resize-colgroup";
    table.insertBefore(colgroup, table.firstChild);
  }

  while (colgroup.children.length < count) {
    colgroup.appendChild(document.createElement("col"));
  }
  while (colgroup.children.length > count) {
    colgroup.removeChild(colgroup.lastChild);
  }

  return Array.from(colgroup.children);
}

function applyExcelTableWidths(table, widths, { persist = true } = {}) {
  const headers = getExcelTableHeaders(table);
  if (!headers.length || widths.length !== headers.length) return;

  const cols = ensureExcelResizeColgroup(table, headers.length);
  const previousState = _excelResizableTables.get(table);
  const normalizedWidths = widths.map((value, index) => {
    const numericWidth = Math.round(Number(value) || 0);
    return numericWidth <= 0 ? 0 : Math.max(getExcelResizeMinWidth(headers[index]), numericWidth);
  });
  const restoreWidths = normalizedWidths.map((width, index) =>
    width > 0
      ? width
      : previousState?.restoreWidths?.[index] || previousState?.widths?.[index] || Math.max(80, Math.ceil(headers[index].scrollWidth || 0))
  );

  let totalWidth = 0;
  normalizedWidths.forEach((width, index) => {
    const hidden = width === 0;
    cols[index].style.display = hidden ? "none" : "";
    cols[index].style.width = hidden ? "0px" : `${width}px`;
    headers[index].style.display = hidden ? "none" : "";
    headers[index].style.width = hidden ? "0px" : `${width}px`;
    headers[index].style.minWidth = "";
    Array.from(table.rows || []).forEach((row) => {
      const cell = row.cells?.[index];
      if (cell && cell !== headers[index]) cell.style.display = hidden ? "none" : "";
    });
    totalWidth += width;
  });

  table.style.minWidth = "";
  table.style.width = `${totalWidth}px`;
  table.classList.add("excel-resizable-table");

  const key = getExcelResizeStorageKey(table, headers);
  _excelResizableTables.set(table, { widths: normalizedWidths, restoreWidths, key });
  if (persist) writeExcelResizeWidths(key, normalizedWidths);
}

function ensureExcelColumnManager(table) {
  const wrap = table.closest(".tableWrap");
  if (!wrap) return;
  wrap.querySelector(":scope > .excel-column-manager-bar")?.remove();

  const managerBar = el("div", { class: "excel-column-manager-bar" }, []);
  const panel = el("div", { class: "excel-column-manager-panel", hidden: true }, []);
  const toggle = el("button", {
    class: "excel-column-manager-toggle",
    type: "button",
    title: "Mostrar u ocultar columnas",
    "aria-label": "Mostrar u ocultar columnas"
  }, [el("i", { class: "fas fa-table-columns" }), el("span", {}, [" Columnas"])]);

  const renderManager = () => {
    const headers = getExcelTableHeaders(table);
    const state = _excelResizableTables.get(table);
    panel.innerHTML = "";
    panel.appendChild(el("div", { class: "excel-column-manager-title" }, ["Columnas visibles"]));
    headers.forEach((th, index) => {
      const label = String(th.dataset.fullLabel || th.title || th.textContent || `Columna ${index + 1}`).replace(/\s+/g, " ").trim();
      const checkbox = el("input", { type: "checkbox", checked: Number(state?.widths?.[index] || 0) > 0 });
      checkbox.onchange = () => {
        const currentState = _excelResizableTables.get(table);
        if (!currentState) return;
        const nextWidths = [...currentState.widths];
        nextWidths[index] = checkbox.checked
          ? currentState.restoreWidths?.[index] || 100
          : 0;
        applyExcelTableWidths(table, nextWidths);
      };
      panel.appendChild(el("label", { class: "excel-column-manager-option" }, [checkbox, el("span", {}, [label])]));
    });
  };

  toggle.onclick = (event) => {
    event.stopPropagation();
    renderManager();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      window.setTimeout(() => {
        document.addEventListener("click", () => { panel.hidden = true; }, { once: true });
      }, 0);
    }
  };
  panel.onclick = (event) => event.stopPropagation();
  managerBar.appendChild(toggle);
  managerBar.appendChild(panel);
  wrap.insertBefore(managerBar, wrap.firstChild);
}

function bindExcelResizeHandle(table, th, index) {
  if (th.querySelector(":scope > .excel-resize-handle")) return;

  const handle = el("button", {
    class: "excel-resize-handle",
    type: "button",
    tabindex: "-1",
    "aria-hidden": "true"
  });

  handle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    const headers = getExcelTableHeaders(table);
    if (!headers.length || index >= headers.length) return;

    const state = _excelResizableTables.get(table);
    const startWidths = state?.widths?.length === headers.length
      ? [...state.widths]
      : headers.map((header) => Math.max(getExcelResizeMinWidth(header), Math.ceil(header.getBoundingClientRect().width || header.offsetWidth || 0)));

    const startWidth = startWidths[index];
    if (!startWidth) return;

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const minWidth = getExcelResizeMinWidth(headers[index]);

    event.preventDefault();
    event.stopPropagation();
    document.body.classList.add("excel-columns-resizing");

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const delta = moveEvent.clientX - startX;
      const nextWidths = [...startWidths];
      const requestedWidth = startWidth + delta;
      nextWidths[index] = requestedWidth <= 12 ? 0 : Math.max(minWidth, requestedWidth);
      applyExcelTableWidths(table, nextWidths, { persist: false });
    };

    const stopResize = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      document.body.classList.remove("excel-columns-resizing");
      const finalState = _excelResizableTables.get(table);
      if (finalState?.key && finalState?.widths) {
        writeExcelResizeWidths(finalState.key, finalState.widths);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    handle.setPointerCapture?.(pointerId);
  });

  th.appendChild(handle);
}

function initResizableExcelTables(root = document) {
  getExcelTables(root).forEach((table) => {
    const headers = getExcelTableHeaders(table);
    if (!headers.length) return;

    const storageKey = getExcelResizeStorageKey(table, headers);
    const storedWidths = readExcelResizeWidths(storageKey, headers.length);
    const measuredWidths = headers.map((th) => Math.ceil(th.getBoundingClientRect().width || th.offsetWidth || th.scrollWidth || 0));
    const canMeasure = measuredWidths.every((width) => width > 0);

    if (!storedWidths && !canMeasure) return;

    applyExcelTableWidths(table, storedWidths || measuredWidths, { persist: !storedWidths });
    headers.forEach((th, index) => bindExcelResizeHandle(table, th, index));
    ensureExcelColumnManager(table);
  });
}

/**
 * Debounce function - evita múltiples llamadas rápidas a funciones
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Retraso en ms
 * @returns {Function} - Función con debounce aplicado
 */
function debounce(fn, delay = 300) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Cleanup GLOBAL de todos los dropdowns de filtros
 * Cierra y elimina todos los .searchable-select-dropdown del body
 * Debe llamarse cada vez que se cambia de módulo/vista
 */
function cleanupAllDropdowns() {
  // 1. Cerrar todos los dropdowns visualmente
  const allDropdowns = document.querySelectorAll('.searchable-select-dropdown');
  allDropdowns.forEach(dropdown => {
    dropdown.classList.remove('show');
  });

  // 2. Eliminar todos los dropdowns del body
  const bodyDropdowns = document.querySelectorAll('body > .searchable-select-dropdown');
  bodyDropdowns.forEach(dropdown => {
    if (dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
  });

  // 3. Limpiar TODOS los handlers globales registrados en los Sets
  _globalClickHandlers.forEach(handler => {
    try { document.removeEventListener('click', handler); } catch(e) {}
  });
  _globalClickHandlers.clear();
  
  _globalScrollHandlers.forEach(handler => {
    try { window.removeEventListener('scroll', handler, false); } catch(e) {}
  });
  _globalScrollHandlers.clear();
  
  _globalResizeHandlers.forEach(handler => {
    try { window.removeEventListener('resize', handler); } catch(e) {}
  });
  _globalResizeHandlers.clear();
  _searchableSelectInstances.clear();
  clearPendingTimeouts();
}

// Variables globales para cleanup de listeners - usando Sets para manejar múltiples handlers
const _globalClickHandlers = new Set();
const _globalScrollHandlers = new Set();
const _globalResizeHandlers = new Set();
const _searchableSelectInstances = new Set();

const _pendingTimeouts = new Set();
let proyectosScriptPromise = null;

function clearPendingTimeouts() {
  _pendingTimeouts.forEach(id => {
    if (id !== null) clearTimeout(id);
  });
  _pendingTimeouts.clear();
}

/**
 * Crea un select con búsqueda integrada
 * Permite filtrar las opciones escribiendo en un input
 * @param {Array} options - Array de objetos {value, label}
 * @param {string} placeholder - Texto placeholder
 * @param {string|number} currentValue - Valor actual seleccionado
 * @param {Function} onChange - Función callback cuando cambia la selección
 * @returns {HTMLElement} - Contenedor con input de búsqueda y lista de opciones
 */
function createSearchableSelect(options, placeholder, currentValue, onChange) {
  const container = el("div", { class: "searchable-select" }, []);
  let globalHandlersAttached = false;
  _searchableSelectInstances.add(container);
  
  // Store the current value separately from search text
  // This prevents search text from overwriting the selected value
  container._selectedValue = currentValue !== undefined ? String(currentValue) : "";
  
  // Define a getter so container.value always returns the selected value
  Object.defineProperty(container, 'value', {
    get: function() {
      return this._selectedValue;
    },
    set: function(newVal) {
      this._selectedValue = newVal !== undefined ? String(newVal) : "";
    },
    configurable: true
  });
  
  container._closeAllDropdowns = function() {
    _searchableSelectInstances.forEach(instance => {
      if (!instance || instance === container) return;
      if (!document.body.contains(instance)) {
        _searchableSelectInstances.delete(instance);
        return;
      }
      if (typeof instance.closeDropdown === "function") {
        instance.closeDropdown();
      }
    });
  };
  
  // Input principal - siempre visible y editable para escribir/buscar
  const input = el("input", { 
    type: "text", 
    class: "searchable-select-main",
    placeholder: placeholder,
    value: "",
    spellcheck: false,
    autocorrect: "off",
    autocapitalize: "off"
  });

  // Cuando el usuario escribe para buscar, el input refleja texto de búsqueda,
  // pero el valor real seleccionado vive en container._selectedValue.
  // Al cerrar el dropdown, normalizamos el input para evitar que quede texto "no seleccionado"
  // (eso rompe formularios porque parece seleccionado, pero value sigue vacío).
  function restoreInputToSelected() {
    const selected = options.find(o => String(o.value) === String(container._selectedValue));
    input.value = selected ? selected.label : "";
  }

  function finalizeInput() {
    const typed = String(input.value || "").trim();

    // Si no hay texto, solo restaurar el seleccionado (o vacío)
    if (!typed) {
      restoreInputToSelected();
      return;
    }

    // Si el texto escrito coincide EXACTO con una opción (case-insensitive),
    // lo tomamos como selección (evita "no me deja guardar" por no hacer click).
    const exact = options.find(o => String(o.label || "").trim().toLowerCase() === typed.toLowerCase());
    if (exact) {
      container._selectedValue = String(exact.value);
      container.value = container._selectedValue;
      input.value = exact.label;
      if (onChange) onChange(exact.value);
      return;
    }

    // Si no coincide, restaurar al valor seleccionado o limpiar.
    restoreInputToSelected();
  }
  
  // Indicador visual del dropdown: ya no funciona como botón separado.
  const toggleBtn = el("span", {
    class: "searchable-select-toggle",
    "aria-hidden": "true"
  }, [el("i", { class: "fas fa-chevron-down", "aria-hidden": "true" })]);
  
  // Contenedor del dropdown - se creará pero se appendará al body
  const dropdown = el("div", { class: "searchable-select-dropdown" }, []);
  
  // Lista de opciones
  const optionsList = el("div", { class: "searchable-select-options" }, []);
  dropdown.appendChild(optionsList);
  
  // Función para calcular y aplicar posición del dropdown
  function calculateDropdownPosition() {
    // Use the full filter container so the dropdown always matches the visible control.
    const controlRect = container.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate available space below and above
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 240; // max-height del dropdown
    const spaceBelow = viewportHeight - controlRect.bottom;
    const spaceAbove = controlRect.top;
    
    // Decide whether to show below or above
    const showBelow = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;
    
    if (showBelow) {
      // Position below the input
      dropdown.style.top = (controlRect.bottom + scrollTop + 4) + "px";
      dropdown.style.bottom = "auto";
    } else {
      // Position above the input
      dropdown.style.top = "auto";
      dropdown.style.bottom = (viewportHeight - controlRect.top + scrollTop + 4) + "px";
    }
    
    // Horizontal position
    dropdown.style.left = (controlRect.left + scrollLeft) + "px";
    dropdown.style.width = Math.round(controlRect.width) + "px";
  }

  function openDropdown() {
    container._closeAllDropdowns.call(container);
    calculateDropdownPosition();
    if (!dropdown.classList.contains("show")) {
      dropdown.classList.add("show");
      dropdown.dispatchEvent(new Event("show"));
    }
  }
  
  // Función para renderizar opciones filtradas
  function renderOptions(filterText = "") {
    optionsList.innerHTML = "";
    const filtered = options.filter(opt => 
      opt.label.toLowerCase().includes(filterText.toLowerCase())
    );
    
    if (filtered.length === 0) {
      optionsList.appendChild(el("div", { 
        class: "searchable-select-no-results",
        style: "padding:10px; color:#999; text-align:center;"
      }, ["Sin coincidencias"]));
      activeIndex = -1; // Reset active
      return;
    }
    
    filtered.forEach((opt, index) => {
      const isSelected = String(opt.value) === String(container._selectedValue);
      const isActive = index === activeIndex;
      const optionEl = el("div", {
        class: `searchable-select-option${isSelected ? " selected" : ""}${isActive ? " active" : ""}`,
        onclick: (e) => {
          e.stopPropagation();
          // Actualizar valor seleccionado (no el de búsqueda)
          container._selectedValue = String(opt.value);
          container.value = container._selectedValue;
          input.value = opt.label;
          dropdown.classList.remove("show");
          // Dispatch hide event
          dropdown.dispatchEvent(new Event("hide"));
          // Trigger callback if provided
          if (onChange) onChange(opt.value);
        },
        onmouseenter: () => {
          // Mouse hover solo visual (CSS .hover), no re-render pesado
          Array.from(optionsList.children).forEach((opt, i) => {
            opt.classList.toggle('hover-active', i === index);
          });
          activeIndex = index; // Solo track index, no re-render
        }

      }, [opt.label]);
      optionsList.appendChild(optionEl);
    });
    
    // Restaurar activeIndex visual si estaba activo
    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const activeOpt = optionsList.children[activeIndex];
      if (activeOpt) activeOpt.classList.add('active');
    }
  }
  
  // Mostrar valor seleccionado inicialmente
  const selectedOpt = options.find(o => String(o.value) === String(currentValue));
  if (selectedOpt) {
    input.value = selectedOpt.label;
  }
  
  // Evento de búsqueda con debounce - filtra mientras escribe
  const debouncedSearch = debounce((text) => {
    renderOptions(text);
    // Auto-mostrar dropdown mientras escribe
    if (text && !dropdown.classList.contains("show")) {
      openDropdown();
    }
  }, 150);
  
  input.addEventListener("input", (e) => {
    const text = e.target.value;
    // Don't update container._selectedValue - that's the selected value, not search text
    // The container.value property is used by the filters, so we keep _selectedValue intact
    debouncedSearch(text);
    activeIndex = -1; // Reset nav on new search
  });
  
  // Al hacer click en el input, mostrar dropdown
  input.addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown();
    input.focus();
  });

  // El filtro completo se comporta como un solo control clickeable.
  container.addEventListener("click", (e) => {
    if (e.target === input || dropdown.contains(e.target)) {
      return;
    }
    e.stopPropagation();
    openDropdown();
    input.focus();
  });
  
  // Cerrar dropdown al hacer click fuera
  function handleClickOutside(e) {
    if (!container.contains(e.target) && !dropdown.contains(e.target)) {
      finalizeInput();
      dropdown.classList.remove("show");
      // Dispatch hide event
      dropdown.dispatchEvent(new Event("hide"));
    }
  }
  
  // Cerrar al hacer scroll SOLO si NO es dentro del dropdown
  function handleScroll(e) {
    // ✅ Si el scroll es dentro del dropdown o sus opciones, NO cerrar
    if (dropdown.contains(e.target) || optionsList.contains(e.target)) {
      return; // Permitir scroll nativo del dropdown
    }
    
    if (dropdown.classList.contains("show")) {
      finalizeInput();
      dropdown.classList.remove("show");
      dropdown.dispatchEvent(new Event("hide"));
    }
  }
  
  // Cerrar al redimensionar
  function handleResize() {
    if (dropdown.classList.contains("show")) {
      finalizeInput();
      dropdown.classList.remove("show");
      // Dispatch hide event
      dropdown.dispatchEvent(new Event("hide"));
    }
  }

  function attachGlobalHandlers() {
    if (globalHandlersAttached) return;
    globalHandlersAttached = true;
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll, false); // ✅ Bubbling phase - permite wheel nativo en dropdown
    window.addEventListener("resize", handleResize);
    _globalClickHandlers.add(handleClickOutside);
    _globalScrollHandlers.add(handleScroll);
    _globalResizeHandlers.add(handleResize);
  }

  function detachGlobalHandlers() {
    if (!globalHandlersAttached) return;
    globalHandlersAttached = false;
    document.removeEventListener("click", handleClickOutside);
    window.removeEventListener("scroll", handleScroll, false);
    window.removeEventListener("resize", handleResize);
    _globalClickHandlers.delete(handleClickOutside);
    _globalScrollHandlers.delete(handleScroll);
    _globalResizeHandlers.delete(handleResize);
  }
  
  // Guardar referencias para cleanup
  container._handleClickOutside = handleClickOutside;
  container._handleScroll = handleScroll;
  container._handleResize = handleResize;
  container.dropdown = dropdown;
  container.optionsList = optionsList;
  container.input = input;
  
  // Agregar event listeners globales cuando se abre el dropdown
  dropdown.addEventListener("show", () => {
    attachGlobalHandlers();
  });
  
  dropdown.addEventListener("hide", () => {
    detachGlobalHandlers();
  });
  
// Navegación por teclado completa + TAB handling
  let activeIndex = -1; // Índice de opción activa (-1 = ninguna)

  const keyboardHandler = (e) => {
    const visibleOptions = Array.from(optionsList.querySelectorAll('.searchable-select-option:not(.searchable-select-no-results)'));
    
    if (!dropdown.classList.contains('show') || visibleOptions.length === 0) {
      activeIndex = -1;
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, visibleOptions.length - 1);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && visibleOptions[activeIndex]) {
          visibleOptions[activeIndex].click();
        }
        return;
      
      case 'Tab':
        {
          const typed = String(input.value || "").trim();
          const selected = options.find(opt => String(opt.value) === String(container._selectedValue));
          const unchangedSelection = selected && String(selected.label || "").trim() === typed;
          const optionToCommit = activeIndex >= 0
            ? visibleOptions[activeIndex]
            : (!unchangedSelection && typed ? visibleOptions[0] : null);
          if (optionToCommit) optionToCommit.click();
          else {
            finalizeInput();
            dropdown.classList.remove("show");
            dropdown.dispatchEvent(new Event("hide"));
          }
        }
        activeIndex = -1;
        return;
        
      case 'Escape':
        finalizeInput();
        dropdown.classList.remove("show");
        dropdown.dispatchEvent(new Event("hide"));
        activeIndex = -1;
        return;
    }

// Actualizar visual active + scroll solo si cambió
    const wasActive = document.querySelector('.searchable-select-option.active');
    visibleOptions.forEach((opt, i) => {
      opt.classList.toggle('active', i === activeIndex);
    });

    if (activeIndex >= 0 && visibleOptions[activeIndex] !== wasActive) {
      // Solo scroll si cambió la activa
      const activeEl = visibleOptions[activeIndex];
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      activeEl.focus();
    }
  };


  input.addEventListener("keydown", keyboardHandler);
  dropdown.addEventListener("show", () => {
    input.focus();
    activeIndex = -1;
  });
  
  // Función para limpiar/resetear el select
  container.clear = function() {
    container._selectedValue = "";
    container.value = "";
    input.value = "";
    renderOptions();
    // Cerrar dropdown si está abierto
    if (dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
      dropdown.dispatchEvent(new Event("hide"));
    }
    if (onChange) onChange("");
  };
  
  // Función para establecer valor
  container.setValue = function(val) {
    container._selectedValue = String(val);
    container.value = container._selectedValue;
    const opt = options.find(o => String(o.value) === String(val));
    input.value = opt ? opt.label : "";
    renderOptions();
  };
  
  // Función para cerrar dropdown
  container.closeDropdown = function() {
    finalizeInput();
    dropdown.classList.remove("show");
    dropdown.dispatchEvent(new Event("hide"));
  };
  
  // Función cleanup para el container - llama cuando se destruye el componente
  container._cleanup = function() {
    // Cerrar dropdown
    finalizeInput();
    dropdown.classList.remove("show");
    detachGlobalHandlers();
    _searchableSelectInstances.delete(container);
    // Remover dropdown del body si está anexado
    if (dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
  };
  
  // Construir estructura
  container.appendChild(input);
  container.appendChild(toggleBtn);
  container.appendChild(dropdown);
  
  // Append dropdown to body to ensure it's not clipped by any parent container
  document.body.appendChild(dropdown);
  
  // Renderizar opciones iniciales (todas)
  renderOptions();
  // Asegurar que el input muestre el valor seleccionado inicial (si existe)
  restoreInputToSelected();
  
  return container;
}

/**
 * Obtiene las opciones de un catálogo para el select buscable
 */
function getSelectOptions(catalog, valueField, labelField) {
  return (catalog || []).map(item => ({
    value: item[valueField],
    label: item[labelField]
  }));
}

const PERMISSION_CODE_ALIASES = {
  TICKETS_CREATE: "TICKETS_CREAR",
  TICKETS_EDIT: "TICKETS_EDITAR",
  TICKETS_DELETE: "TICKETS_BORRAR",
  TICKETS_CLOSE: "TICKETS_CERRAR",
  TICKETS_REOPEN: "TICKETS_REABRIR",
  TICKETS_VIEW_ALL: "TICKETS_VER_TODOS",
  RUTAS_CREATE: "RUTAS_CREAR",
  RUTAS_EDIT: "RUTAS_EDITAR",
  RUTAS_DELETE: "RUTAS_BORRAR",
  RUTAS_CLOSE: "RUTAS_CERRAR",
  RUTAS_REOPEN: "RUTAS_REABRIR",
  RUTAS_VIEW_ALL: "RUTAS_VER_TODAS",
  REPORTS_VIEW: "REPORTES_VER",
  REPORTS_EXPORT: "REPORTES_EXPORTAR",
  TICKETS_RATE: "TICKETS_CALIFICAR",
  EQUIPOS_CREATE: "EQUIPOS_CREAR",
  EQUIPOS_EDIT: "EQUIPOS_EDITAR",
  EQUIPOS_DELETE: "EQUIPOS_BORRAR",
  EQUIPOS_VIEW: "EQUIPOS_VER",
  PROYECTOS_ESPECIALES_CREATE: "PROYECTOS_ESPECIALES_CREAR",
  PROYECTOS_ESPECIALES_EDIT: "PROYECTOS_ESPECIALES_EDITAR",
  PROYECTOS_ESPECIALES_VIEW_ALL: "PROYECTOS_ESPECIALES_VER_TODOS",
  PROYECTOS_ESPECIALES_REVIEW: "PROYECTOS_ESPECIALES_REVISAR",
  PROYECTOS_ESPECIALES_DOWNLOAD: "PROYECTOS_ESPECIALES_DESCARGAR",
  CALIFICACION_VIEW: "CALIFICACION_VER",
  CALIFICACION_TICKETS: "CALIFICAR_TICKETS",
  CALIFICACION_RUTAS: "CALIFICAR_RUTAS",
  VALIDACION_VIEW: "VALIDACION_VER",
  VALIDACION_RUTAS: "VALIDAR_RUTAS",
  ENVIO_EQUIPO_VIEW: "ENVIO_EQUIPO_VER",
  ENVIO_EQUIPO_CREATE: "ENVIO_EQUIPO_CREAR",
  ENVIO_EQUIPO_UPDATE: "ENVIO_EQUIPO_ACTUALIZAR"
};

function can(perm) {
  const alias = PERMISSION_CODE_ALIASES[perm];
  return !!session?.permisos?.includes(perm) || (!!alias && !!session?.permisos?.includes(alias));
}

function hasRole(roleName) {
  return String(session?.rol || "").trim().toUpperCase() === String(roleName || "").trim().toUpperCase();
}

/**
 * Verifica si el usuario logueado es TÉCNICO
 */
function isTecnico() {
  return hasRole("TECNICO");
}

function isAnalista() {
  return hasRole("ANALISTA");
}

function getInitialRoute() {
  return "dashboard";
}

function isSessionValid() {
  return session && session.idUsuario && session.permisos && Array.isArray(session.permisos);
}

function badgeOpen(isClosed) {
  const closed = !!isClosed;
  const title = closed ? "CERRADO" : "ABIERTO";
  return el("span", {
    class: "status-lock-badge " + (closed ? "status-closed" : "status-open"),
    title,
    "aria-label": title
  }, [
    el("i", { class: closed ? "fas fa-lock" : "fas fa-lock-open", "aria-hidden": "true" })
  ]);
}

function badgeAsignacionCompartida(isShared) {
  const shared = !!isShared;
  const title = shared ? "COMPARTIDO" : "INDIVIDUAL";
  return el("span", {
    class: "assignment-people-badge " + (shared ? "assignment-shared" : "assignment-single"),
    title,
    "aria-label": title
  }, [
    el("i", { class: shared ? "fas fa-users" : "fas fa-user", "aria-hidden": "true" })
  ]);
}

function ticketClasificacionText(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const key = text.toUpperCase();
  const tone =
    key.includes("BASICO") ? "ticket-clasif-basico" :
    key.includes("INTERMEDIO") ? "ticket-clasif-intermedio" :
    key.includes("COMPLEJO") ? "ticket-clasif-complejo" :
    key.includes("EXTRAORDINARIO") ? "ticket-clasif-extraordinario" :
    "";
  const shortText =
    key.includes("BASICO") ? "B" :
    key.includes("INTERMEDIO") ? "I" :
    key.includes("COMPLEJO") ? "C" :
    key.includes("EXTRAORDINARIO") ? "E" :
    text;
  return el("span", {
    class: `ticket-clasificacion-text${tone ? ` ${tone}` : ""}`,
    title: text
  }, [shortText]);
}

function rutaTipoRutaText(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const key = text.toUpperCase();
  const tone =
    key.includes("CERCANA") ? "ruta-tipo-cercana" :
    key.includes("INTERMEDIA") ? "ruta-tipo-intermedia" :
    key.includes("LEJANA") ? "ruta-tipo-lejana" :
    "";
  const shortText =
    key.includes("CERCANA") ? "C" :
    key.includes("INTERMEDIA") ? "M" :
    key.includes("LEJANA") ? "L" :
    text;
  return el("span", {
    class: `ruta-tipo-text${tone ? ` ${tone}` : ""}`,
    title: text
  }, [shortText]);
}

function formatEnvioEstado(estado) {
  const key = String(estado || "").trim().toUpperCase();
  return ({
    ENVIADO: "Enviado",
    RECIBIDO: "Recibido",
    EN_REVISION: "En revisión",
    REPARADO: "Reparado",
    ENTREGADO: "Entregado",
    EXTRAVIADO: "Extraviado"
  })[key] || "—";
}

function formatEnvioMedio(medio) {
  const key = String(medio || "").trim().toUpperCase();
  return ({
    CAMION: "Camión",
    PERSONAL_SUCURSAL: "Personal sucursal",
    PERSONAL_IT: "Personal IT"
  })[key] || "—";
}

function badgeEnvioEstado(estado) {
  const key = String(estado || "").trim().toUpperCase();
  const tone =
    key === "ENTREGADO" ? "envio-estado-entregado" :
    key === "EXTRAVIADO" ? "envio-estado-extraviado" :
    key === "REPARADO" ? "envio-estado-reparado" :
    key === "EN_REVISION" ? "envio-estado-revision" :
    key === "RECIBIDO" ? "envio-estado-recibido" :
    "envio-estado-enviado";
  const icon =
    key === "ENTREGADO" ? "fas fa-box-open" :
    key === "EXTRAVIADO" ? "fas fa-triangle-exclamation" :
    key === "REPARADO" ? "fas fa-screwdriver-wrench" :
    key === "EN_REVISION" ? "fas fa-magnifying-glass" :
    key === "RECIBIDO" ? "fas fa-inbox" :
    "fas fa-truck";
  const label = formatEnvioEstado(key);
  return el("span", {
    class: `envio-estado-pill ${tone}`,
    title: label,
    "aria-label": label
  }, [
    el("i", { class: icon, "aria-hidden": "true" }),
    el("span", {}, [label])
  ]);
}

function buildEnvioSeguimiento(row) {
  const estado = String(row?.estadoActual || "").trim().toUpperCase();
  const steps = estado === "EXTRAVIADO"
    ? [
        { key: "ENVIADO", label: "Enviado", icon: "fas fa-paper-plane" },
        { key: "EXTRAVIADO", label: "Extraviado", icon: "fas fa-triangle-exclamation" },
        { key: "RECIBIDO", label: "Recibido", icon: "fas fa-inbox" },
        { key: "EN_REVISION", label: "Revisión", icon: "fas fa-magnifying-glass" },
        { key: "REPARADO", label: "Reparado", icon: "fas fa-screwdriver-wrench" },
        { key: "ENTREGADO", label: "Entregado", icon: "fas fa-box-open" }
      ]
    : [
        { key: "ENVIADO", label: "Enviado", icon: "fas fa-paper-plane" },
        { key: "RECIBIDO", label: "Recibido", icon: "fas fa-inbox" },
        { key: "EN_REVISION", label: "Revisión", icon: "fas fa-magnifying-glass" },
        { key: "REPARADO", label: "Reparado", icon: "fas fa-screwdriver-wrench" },
        { key: "ENTREGADO", label: "Entregado", icon: "fas fa-box-open" }
      ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === estado));

  return el("div", { class: "envio-seguimiento", title: formatEnvioEstado(estado) }, steps.map((step, idx) => {
    const isCurrent = idx === currentIndex;
    const isPending = idx > currentIndex;
    const toneClass =
      isPending ? "is-pending" :
      step.key === "EXTRAVIADO" && isCurrent ? "is-danger" :
      step.key === "EN_REVISION" && isCurrent ? "is-warning" :
      step.key === "ENVIADO" && isCurrent ? "is-info" :
      "is-positive";

    const children = [
      el("div", { class: `envio-seguimiento-step ${toneClass}${isCurrent ? " is-current" : ""}` }, [
        el("span", { class: "envio-seguimiento-icon" }, [el("i", { class: step.icon })]),
        el("span", { class: "envio-seguimiento-label" }, [step.label])
      ])
    ];

    if (idx < steps.length - 1) {
      children.push(
        el("span", {
          class: `envio-seguimiento-line${idx < currentIndex ? " is-active" : ""}${
            estado === "EXTRAVIADO" && idx === currentIndex ? " is-danger" : ""
          }`
        })
      );
    }

    return el("div", { class: "envio-seguimiento-node" }, children);
  }));
}

function getEnvioAllowedNextStates(row) {
  const estado = String(row?.estadoActual || "").trim().toUpperCase();
  switch (estado) {
    case "ENVIADO":
      return ["RECIBIDO", "EXTRAVIADO"];
    case "RECIBIDO":
      return ["EXTRAVIADO"];
    case "EN_REVISION":
      return ["EXTRAVIADO"];
    case "REPARADO":
      return ["ENTREGADO", "EXTRAVIADO"];
    default:
      return [];
  }
}

function isEnvioFinalState(estado) {
  const key = String(estado || "").trim().toUpperCase();
  return key === "ENTREGADO" || key === "EXTRAVIADO";
}

function getEnvioStateDate(row, estado = row?.estadoActual) {
  const key = String(estado || "").trim().toUpperCase();
  const fallback = row?.fechaEnvio || null;

  switch (key) {
    case "ENVIADO":
      return row?.fechaEnvio || null;
    case "RECIBIDO":
      return row?.fechaRecepcion || row?.fechaEnvio || null;
    case "EN_REVISION":
      return row?.fechaRevision || row?.fechaRecepcion || row?.fechaEnvio || null;
    case "REPARADO":
      return row?.fechaReparacion || row?.fechaRevision || row?.fechaRecepcion || row?.fechaEnvio || null;
    case "ENTREGADO":
      return row?.fechaEntrega || row?.fechaReparacion || row?.fechaRevision || row?.fechaRecepcion || row?.fechaEnvio || null;
    case "EXTRAVIADO":
      return row?.fechaExtravio || row?.fechaRevision || row?.fechaRecepcion || row?.fechaEnvio || null;
    default:
      return fallback;
  }
}

function formatEnvioTicketLabel(ticket) {
  if (!ticket) return "";
  const parts = [
    `TK-${ticket.idTicket}`,
    ticket.nombreSolicitante || "Sin solicitante",
    ticket.servicioNombre || "Sin servicio"
  ].filter(Boolean);
  return parts.join(" · ");
}

function getEnvioUnidadOptions() {
  const allUnits = Array.isArray(catalogos?.unidades) ? catalogos.unidades : [];
  if (!hasRole("GERENCIAL")) {
    return getSelectOptions(allUnits, "idUnidad", "nombre");
  }

  const assigned = Array.isArray(session?.unidades) ? session.unidades : [];
  const assignedIds = new Set(assigned.map((u) => Number(u?.idUnidad || 0)).filter(Boolean));
  const source = assignedIds.size
    ? allUnits.filter((u) => assignedIds.has(Number(u?.idUnidad || 0)))
    : allUnits;
  return getSelectOptions(source, "idUnidad", "nombre");
}

function normalizeCatalogKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function getPendingAsignarTecnicoId() {
  const metaId = Number(catalogos?.meta_catalogos?.pendienteAsignarId || 0);
  if (metaId > 0) return metaId;

  const sources = [
    ...(Array.isArray(catalogos?.usuarios) ? catalogos.usuarios : []),
    ...(Array.isArray(catalogos?.tecnicos) ? catalogos.tecnicos : [])
  ];
  const match = sources.find((item) => {
    const nombre = normalizeCatalogKey(item?.nombre || "");
    const usuario = normalizeCatalogKey(item?.usuario || "");
    return nombre === "PENDIENTE_ASIGNAR" || usuario === "PENDIENTE_ASIGNAR";
  });
  return Number(match?.idUsuario || match?.idTecnico || 0) || 0;
}

function isPendingAsignarTecnico(tecnico) {
  const id = Number(tecnico?.idUsuario || tecnico?.idTecnico || 0);
  const nombre = normalizeCatalogKey(tecnico?.nombre || "");
  const usuario = normalizeCatalogKey(tecnico?.usuario || "");
  const pendingId = getPendingAsignarTecnicoId();
  return (pendingId > 0 && id === pendingId) || nombre === "PENDIENTE_ASIGNAR" || usuario === "PENDIENTE_ASIGNAR";
}

function isSelectableRealTecnico(tecnico) {
  const id = Number(tecnico?.idUsuario || tecnico?.idTecnico || 0);
  return !!id && !isPendingAsignarTecnico(tecnico);
}

function badgeTicketEstadoCalificacion(row) {
  const done = isCalificado(row);
  const title = done ? "CALIFICADO" : "PENDIENTE";
  return el("span", {
    class: `ticket-calif-badge ${done ? "ticket-calif-calificado" : "ticket-calif-pendiente"}`,
    title,
    "aria-label": title
  }, done
    ? [
        el("i", { class: "fas fa-certificate ticket-calif-main-icon", "aria-hidden": "true" }),
        el("i", { class: "fas fa-check ticket-calif-accent-icon", "aria-hidden": "true" })
      ]
    : [
        el("i", { class: "fas fa-hourglass-half", "aria-hidden": "true" })
      ]);
}

/**
 * Fuente única de verdad para estado:
 * CERRADO si fechaCierre tiene valor
 */
function isClosedByFechaCierre(row) {
  const fc = row?.fechaCierre;
  if (fc === null || fc === undefined || fc === "") return false;
  if (typeof fc === "string" && fc.trim() === "") return false;
  return true;
}

/**
 * Verifica si un ticket ya está calificado
 * Retorna true si su estado de calificación es CALIFICADO
 */
function isCalificado(row) {
  if (Number(row?.idEstadoCalificacion) === 1) return true;
  return String(row?.estadoCalificacion || "").trim().toUpperCase() === "CALIFICADO";
}

function getTicketCalificacionBlockReason(row) {
  if (!isClosedByFechaCierre(row)) {
    return "No se puede calificar el ticket porque sigue abierto. Debe cerrarlo antes de calificarlo.";
  }

  const tecnicos = Array.isArray(row?.tecnicos) ? row.tecnicos : [];
  const hasPendingAsignar = tecnicos.some((t) => isPendingAsignarTecnico(t));
  const hasRealTech = tecnicos.some((t) => isSelectableRealTecnico(t));

  if (hasPendingAsignar || !hasRealTech) {
    return "No se puede calificar el ticket porque tiene 'Pendiente Asignar'. Debe asignar un técnico real antes de calificarlo.";
  }

  return null;
}

function isRutaSelectableTecnico(tecnico) {
  return isSelectableRealTecnico(tecnico);
}

/**
 * Botón con protección doble clic
 * - deshabilita al click
 * - SIEMPRE re-activa después de completar (éxito o error)
 * - No lanza errores para evitar bloquear la UI
 */
function createActionButton({ class: className, icon, text, onClick, disabled = false }) {
  const btn = el(
    "button",
    { class: className, disabled },
    [icon ? el("i", { class: icon }) : null, text ? " " + text : ""].filter(Boolean)
  );

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;

    // Bloquear botón mientras procesa
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = (icon ? `<i class="${icon}"></i> ` : "") + "Procesando...";

    try {
      await onClick();
    } catch (err) {
      toast(err?.message || "Error", "err");
    } finally {
      // SIEMPRE restaurar estado del botón - éxito, error o early return
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });

  return btn;
}

function nowLocalDtLocal() {
  const d = new Date();
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  // datetime-local espera hora LOCAL (no UTC)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

function dtLocalToMysql(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  // datetime-local -> mysql datetime
  if (s.includes("T")) return s.replace("T", " ") + ":00";

  // date-only -> default 00:00:00 (usar helpers dateToMysql* si necesitas hora automática)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;

  // ya viene en formato mysql (con o sin segundos)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

function nowLocalMysql() {
  const d = new Date();
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function nowLocalDateValue() {
  const d = new Date();
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowLocalTimeHHMMSS() {
  const d = new Date();
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function mysqlToDateValue(v) {
  if (!v) return "";
  if (v instanceof Date) {
    const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  const s = String(v).trim();
  if (!s) return "";

  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];

  // dd/mm/yyyy -> yyyy-mm-dd
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  // dd-mm-yyyy -> yyyy-mm-dd
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  return s.slice(0, 10);
}

function mysqlExtractTime(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
    return `${pad2(v.getHours())}:${pad2(v.getMinutes())}:${pad2(v.getSeconds())}`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1]}:${m[2]}:${m[3] || "00"}`;
}

function ensureTimeHHMMSS(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return null;
}

// UI usa input type="date" (solo fecha) pero BD requiere datetime (con hora).
function dateToMysqlWithTime(dateValue, timeHHMMSS) {
  const d = String(dateValue || "").trim();
  if (!d) return null;
  const t = ensureTimeHHMMSS(timeHHMMSS) || nowLocalTimeHHMMSS();
  return `${d} ${t}`;
}

// Mantiene la hora original (si existe) aunque el usuario solo edite la fecha
function dateToMysqlKeepTime(dateValue, originalMysqlValue) {
  const d = String(dateValue || "").trim();
  if (!d) return null;
  const t = mysqlExtractTime(originalMysqlValue) || nowLocalTimeHHMMSS();
  return `${d} ${t}`;
}

function dateToMysqlStartOfDay(dateValue) {
  const d = String(dateValue || "").trim();
  if (!d) return null;
  return `${d} 00:00:00`;
}

function dateToMysqlEndOfDay(dateValue) {
  const d = String(dateValue || "").trim();
  if (!d) return null;
  return `${d} 23:59:59`;
}

/**
 * display: YYYY-MM-DD... -> DD/MM/YYYY (SIN HORA)
 */
function formatDate(fecha) {
  if (!fecha) return "—";

  if (fecha instanceof Date) {
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  }

  const s = String(fecha).trim();
  if (!s) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s.replace(/-/g, "/");

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  return s;
}

function parseMysqlDateTime(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const raw = String(fecha).trim();
  if (!raw) return null;

  const mysqlMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (mysqlMatch) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = mysqlMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateTime(fecha) {
  const parsed = parseMysqlDateTime(fecha);
  if (!parsed) return "—";
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function formatElapsedTimeSince(fecha, baseDate = new Date()) {
  const parsed = parseMysqlDateTime(fecha);
  if (!parsed) return "Sin registro";

  const diffMs = Math.max(0, Number(baseDate) - Number(parsed));
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    const mins = Math.max(1, diffMinutes);
    return `${mins} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} mes${diffMonths === 1 ? "" : "es"}`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} año${diffYears === 1 ? "" : "s"}`;
}

/**
 * Formatea el campo Lugar para visualización
 * Solo transformación visual - NO modifica valores almacenados
 * @param {boolean|number|string|null|undefined} lugar - Valor del campo en la base de datos
 * @returns {string} - "En lugar" o "Remoto - Taller"
 */
function formatLugar(lugar) {
  // Normalizar el valor a string para comparación
  const valor = String(lugar ?? '').toLowerCase().trim();
  
  // Si es "en lugar" (como string o booleano true/1), mostrar "En lugar"
  // El valor puede venir como: true, 1, "true", "1", "en lugar", "En lugar"
  if (valor === 'true' || valor === '1' || valor === 'en lugar') {
    return "En lugar";
  }
  
  // Para cualquier otro valor (false, 0, "false", "0", "remoto", etc.) mostrar "Remoto - Taller"
  return "Remoto - Taller";
}

/**
 * Obtiene el rango mensual 26-25
 */
function getMonthlyRange(baseDate = new Date()) {
  const d = new Date(baseDate);
  const y = d.getFullYear();
  const m = d.getMonth();
  const dia = d.getDate();

  let start, end;
  if (dia >= 26) {
    start = new Date(y, m, 26, 0, 0, 0);
    end = new Date(y, m + 1, 25, 23, 59, 59);
  } else {
    start = new Date(y, m - 1, 26, 0, 0, 0);
    end = new Date(y, m, 25, 23, 59, 59);
  }

  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const startStr = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`;
  const endStr = `${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mes = meses[end.getMonth()];

  return { start, end, startStr, endStr, mes };
}

function mount(node) {
  const app = $("#app");
  if (!app) return;
  
  // ✅ Cleanup total de dropdowns antes de montar nuevo contenido
  // Esto evita que queden dropdowns flotantes entre módulos
  cleanupAllDropdowns();
  
  // ✅ Limpiar completamente el DOM anterior antes de montar nuevo contenido
  app.innerHTML = "";
  // ✅ Limpiar cualquier modal residual que pueda haber quedado
  const existingModals = document.querySelectorAll('.modalBack');
  existingModals.forEach((modal) => {
    if (modal.classList?.contains("is-minimized")) return;
    modal.remove();
  });
  app.appendChild(node);

  const isLogin = node?.classList?.contains("loginWrap");
  if (isLogin) {
    document.body.classList.remove("sidebar-collapsed", "sidebar-open");
  }
  document.body.classList.toggle("hide-background", !isLogin);
}

const TOAST_DURATION_MS = 10000;

function toast(msg, type = 'info') {
  // Sistema de toast personalizado - NO bloquea la UI
  // Tipos: info, ok, err, warn
  
  // Crear root si no existe
  let root = document.querySelector('.toastRoot');
  if (!root) {
    root = el('div', { class: 'toastRoot' }, []);
    document.body.appendChild(root);
  }
  
  // Crear toast individual
  const toastEl = el('div', { class: 'toastItem ' + type }, []);
  
  // Iconos según tipo
  const icons = {
    info: 'fas fa-info-circle',
    ok: 'fas fa-check-circle', 
    err: 'fas fa-exclamation-circle',
    warn: 'fas fa-exclamation-triangle'
  };
  const toastMessage =
    type === "err"
      ? getUserErrorMessage(msg, "Ocurrió un error inesperado.")
      : toUserText(msg ?? "");
  
  const closeBtn = el("button", { class: "toastClose", type: "button" }, [
    el("i", { class: "fas fa-times" })
  ]);
  toastEl.appendChild(el("div", { class: "toastIcon" }, [el("i", { class: icons[type] })]));
  toastEl.appendChild(
    el("div", { class: "toastContent" }, [el("div", { class: "toastMsg" }, [toastMessage])])
  );
  toastEl.appendChild(closeBtn);

  closeBtn.addEventListener('click', () => removeToast());
  
  root.appendChild(toastEl);
  
  // Animar entrada
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });
  
  // Auto-remover después de 4 segundos
  const timeoutId = setTimeout(() => removeToast(), TOAST_DURATION_MS);
  _pendingTimeouts.add(timeoutId);
  
function removeToast() {
    clearTimeout(timeoutId);
    _pendingTimeouts.delete(timeoutId);
    toastEl.classList.remove('show');
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 250);
  }
  
  return { close: removeToast };
}

/**
 * Modal de confirmación personalizado - NO bloquea la UI
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje de confirmación
 * @param {string} type - Tipo: 'danger' (borrar), 'info' (pregunta), 'success'
 * @returns {Promise<boolean>} - true si confirmou, false si canceló
 */
function confirmModal(title, message, type = 'danger') {
  return new Promise((resolve) => {
    const back = el('div', { class: 'confirmBack' }, []);
    
    const icons = {
      danger: 'fas fa-exclamation-triangle',
      info: 'fas fa-question-circle',
      success: 'fas fa-check-circle'
    };
    
    const cancelBtn = el("button", { class: "btn", id: "confirmCancelBtn", type: "button" }, ["Cancelar"]);
    const okBtn = el("button", { class: "btn primary", id: "confirmOkBtn", type: "button" }, ["Confirmar"]);
    const card = el('div', { class: 'card modal confirmCard ' + type }, [
      el("div", { class: "confirmIcon" }, [el("i", { class: icons[type] })]),
      el("div", { class: "confirmTitle" }, [toUserText(title ?? "")]),
      el("div", { class: "confirmMessage" }, [toUserText(message ?? "")]),
      el("div", { class: "confirmActions" }, [cancelBtn, okBtn])
    ]);
    
    back.appendChild(card);
    document.body.appendChild(back);
    
    // Animar entrada
    requestAnimationFrame(() => {
      back.classList.add('show');
    });
    
    // Funciones de cierre
    function closeModal(result) {
      back.classList.remove('show');
      setTimeout(() => {
        back.remove();
        resolve(result);
      }, 200);
    }
    
    // Eventos
    cancelBtn.addEventListener('click', () => closeModal(false));
    okBtn.addEventListener('click', () => closeModal(true));
    
    // Cerrar al hacer click fuera
    back.addEventListener('click', (e) => {
      if (e.target === back) {
        closeModal(false);
      }
    });
    
    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        closeModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Modal para seleccionar calificación de ticket
 * Retorna Promise<string|null>
 */

/**
 * Exporta datos a Excel (.xlsx) via IPC main process
 */
async function downloadExcel(filename, rows, title) {
  if (!rows?.length) return toast("No hay datos para exportar.", "warn");

  try {
    const result = await window.api.reports_export_excel(session, filename, rows, title);

    if (!result) return toast("Error al exportar: respuesta vacía", "err");
    if (result.canceled) return;
    if (!result.ok) return toast(result.message || "Error al exportar Excel", "err");
  } catch (err) {
    return downloadCSV(filename.replace(".xlsx", ".csv"), rows);
  }
}

async function downloadExcelMulti(filename, sheets) {
  if (!Array.isArray(sheets) || !sheets.length) {
    return toast("No hay hojas para exportar.", "warn");
  }

  try {
    const result = await window.api.reports_export_excel_multi(session, filename, sheets);

    if (!result) return toast("Error al exportar: respuesta vacía", "err");
    if (result.canceled) return;
    if (!result.ok) return toast(result.message || "Error al exportar Excel", "err");
  } catch (err) {
    return toast(err?.message || "Error al exportar Excel", "err");
  }
}

/**
 * Exporta a CSV (fallback)
 */
function downloadCSV(filename, rows) {
  if (!rows?.length) return toast("No hay datos para exportar.", "warn");

  const cols = Object.keys(rows[0]);
  const esc = (s) => {
    const v = s === null || s === undefined ? "" : String(s);
    const needs = /[",\n]/.test(v);
    const vv = v.replace(/"/g, '""');
    return needs ? `"${vv}"` : vv;
  };

  const lines = [];
  lines.push(cols.map(esc).join(","));
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename }, []);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Modal retorna references para poder re-renderizar acciones/título
 * ✅ Mejora: Limpieza completa de listeners y estado al cerrar
 */
function Modal(title, bodyNode, actions = [], options = {}) {
  const {
    closeOnBackdrop = true,
    closeOnEscape = true,
    blockRouteChange = false,
    allowMinimize = true
  } = options || {};
  const back = el("div", { class: "modalBack" }, []);
  const card = el("div", { class: "card modal" }, []);
  let isClosed = false;
  let isMinimized = false;
  let dockItem = null;

  bringModalWindowToFront(back);

  if (blockRouteChange) {
    back.dataset.blockRouteChange = "1";
  }

  const handleEscape = (e) => {
    if (closeOnEscape && e.key === 'Escape' && !isMinimized) close();
  };

  const titleElement = el("div", { class: "h1" }, [title]);
  const actionsElement = el("div", { class: "actions" }, []);
  const titleCopy = el("div", { class: "small" }, ["Sistema IT - Soporte Técnico"]);
  const titleObserver = new MutationObserver(() => syncDockItem());

  function getModalTitleText() {
    return toUserText(titleElement.textContent || title || "Ventana");
  }

  function removeDockItem() {
    if (!dockItem) return;
    dockItem.remove();
    dockItem = null;
    refreshModalDockRootState();
  }

  function syncDockItem() {
    if (!dockItem) return;
    const label = dockItem.querySelector(".modal-dock-item-title");
    if (label) label.textContent = getModalTitleText();
    dockItem.title = `Restaurar ${getModalTitleText()}`;
  }

  function restore() {
    if (isClosed || !isMinimized) return;
    isMinimized = false;
    back.classList.remove("is-minimized");
    delete back.dataset.minimized;
    if (blockRouteChange) {
      back.dataset.blockRouteChange = "1";
    }
    removeDockItem();
    bringModalWindowToFront(back);
    requestAnimationFrame(() => {
      const firstFocusable = card.querySelector("input, select, textarea, button");
      if (firstFocusable instanceof HTMLElement) firstFocusable.focus({ preventScroll: true });
    });
  }

  function minimize() {
    if (isClosed || isMinimized || !allowMinimize) return;
    isMinimized = true;
    back.classList.add("is-minimized");
    back.dataset.minimized = "1";
    delete back.dataset.blockRouteChange;
    cleanupAllDropdowns();

    const dockRoot = getModalDockRoot();
    const restoreBtn = el("div", {
      class: "modal-dock-item",
      title: `Restaurar ${getModalTitleText()}`
    }, [
      el("i", { class: "fas fa-window-restore" }),
      el("span", { class: "modal-dock-item-title" }, [getModalTitleText()]),
      el("button", {
        class: "modal-dock-item-close",
        type: "button",
        title: "Cerrar ventana",
        onclick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }, [el("i", { class: "fas fa-times" })])
    ]);
    restoreBtn.addEventListener("click", restore);

    dockItem = restoreBtn;
    dockRoot.appendChild(dockItem);
    refreshModalDockRootState();
    syncDockItem();
  }

  // ✅ Función de cierre mejorada que limpia correctamente
  const close = () => {
    if (isClosed) return;
    isClosed = true;
    document.removeEventListener('keydown', handleEscape);
    titleObserver.disconnect();
    removeDockItem();
    // Remover el modal del DOM
    back.remove();
    // ✅ Limpiar referencias para evitar memory leaks
    // No es necesario asignar null ya que el elemento fue removido
  };

  // ✅ Cleanup automático al hacer click fuera del modal (en el backdrop)
  back.addEventListener('click', (e) => {
    if (closeOnBackdrop && e.target === back) {
      close();
    }
  });

  // ✅ Cleanup con tecla Escape
  document.addEventListener('keydown', handleEscape);

  const rebuildActions = (newActions) => {
    actionsElement.innerHTML = "";
    for (const a of newActions || []) actionsElement.appendChild(a);
    // ✅ Eliminado botón "Cerrar" automático para evitar duplicado
  };

  const titleRow = el("div", { class: "titleRow modal-titlebar" }, [
    el("div", {}, [
      titleElement,
      titleCopy
    ]),
    el("div", { class: "actions" }, [
      actionsElement,
      ...(allowMinimize
        ? [el("button", {
            class: "modal-minimize-btn btn small",
            type: "button",
            title: "Minimizar",
            onclick: minimize
          }, [el("i", { class: "fas fa-window-minimize" })])]
        : []),
      el("button", {
        class: "modal-close-btn btn small danger",
        title: "Cerrar (ESC)",
        type: "button",
        onclick: close
      }, [el("i", { class: "fas fa-times" })]), 
    ])
  ]);

  function enableWindowDrag() {
    let dragState = null;

    const stopDrag = () => {
      if (!dragState) return;
      document.removeEventListener("pointermove", onDragMove);
      document.removeEventListener("pointerup", stopDrag);
      document.removeEventListener("pointercancel", stopDrag);
      card.classList.remove("is-dragging");
      dragState = null;
    };

    const onDragMove = (event) => {
      if (!dragState) return;
      const nextLeft = event.clientX - dragState.offsetX;
      const nextTop = event.clientY - dragState.offsetY;
      const maxLeft = Math.max(8, window.innerWidth - dragState.width - 8);
      const maxTop = Math.max(8, window.innerHeight - dragState.height - 8);
      card.style.left = `${Math.min(Math.max(8, nextLeft), maxLeft)}px`;
      card.style.top = `${Math.min(Math.max(8, nextTop), maxTop)}px`;
      card.style.transform = "none";
    };

    titleRow.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, input, select, textarea, .actions, .searchable-select")) return;
      if (isMinimized || isClosed) return;

      const rect = card.getBoundingClientRect();
      dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height
      };
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.transform = "none";
      card.classList.add("is-dragging");
      bringModalWindowToFront(back);
      document.addEventListener("pointermove", onDragMove);
      document.addEventListener("pointerup", stopDrag);
      document.addEventListener("pointercancel", stopDrag);
      event.preventDefault();
    });
  }

  card.appendChild(titleRow);
  enableWindowDrag();

  card.appendChild(el("hr"));
  card.appendChild(bodyNode);

  back.appendChild(card);
  document.body.appendChild(back);
  titleObserver.observe(titleElement, { childList: true, subtree: true, characterData: true });

  rebuildActions(actions);

  return { close, minimize, restore, titleElement, actionsElement, rebuildActions, back, card };
}

function openReadOnlyDetailModal({
  title,
  kind = "Detalle",
  contextItems = [],
  content = "",
  emptyText = "Sin información registrada."
}) {
  const hasContent = !!String(content || "").trim();

  const body = el("div", { class: "detail-read-view" }, [
    el("div", { class: "detail-read-hero" }, [
      el("div", { class: "detail-read-hero-icon" }, [
        el("i", { class: kind.toLowerCase().includes("observ") ? "fas fa-eye" : "fas fa-file-lines" })
      ]),
      el("div", { class: "detail-read-hero-copy" }, [
        el("div", { class: "detail-read-kicker" }, [kind]),
        el("div", { class: "detail-read-meta" }, contextItems.map((item) =>
          el("span", { class: "detail-read-chip" }, [String(item)])
        ))
      ])
    ]),
    el("div", { class: "detail-read-panel" }, [
      el("div", { class: "detail-read-panel-label" }, [
        hasContent ? `${kind} registrada` : `${kind} pendiente`
      ]),
      hasContent
        ? el("div", { class: "detail-read-text" }, [String(content).trim()])
        : el("div", { class: "detail-read-empty" }, [
            el("i", { class: "fas fa-circle-info" }),
            el("span", {}, [emptyText])
          ])
    ])
  ]);

  const modal = Modal(title, body, []);
  modal.card.classList.add("detail-read-modal");
  return modal;
}

/**
 * FREEZE TOTAL / UNFREEZE TOTAL para formularios (incluye bloquear labels)
 */
function setFormFrozen(formEl, frozen, extraGroups = []) {
  const fields = formEl.querySelectorAll("input, select, textarea, button");
  fields.forEach((f) => {
    if (f.tagName === "BUTTON") return;
    f.disabled = !!frozen;
  });

  for (const g of extraGroups || []) {
    if (!g) continue;
    const cbs = g.querySelectorAll('input[type="checkbox"]');
    cbs.forEach((cb) => (cb.disabled = !!frozen));

    const labels = g.querySelectorAll("label");
    labels.forEach((lb) => {
      lb.style.pointerEvents = frozen ? "none" : "auto";
      lb.style.opacity = frozen ? "0.65" : "1";
    });
  }
}

/* =========================
   LOGIN
========================= */
