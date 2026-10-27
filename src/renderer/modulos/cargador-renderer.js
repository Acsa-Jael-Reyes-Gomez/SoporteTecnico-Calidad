// Orquestador de carga del renderer dividido por responsabilidad.

(() => {
  const archivosBase = [
    "./modulos/compartido.js",
    "./modulos/autenticacion.js",
    "./modulos/inicio.js"
  ];

  const archivoShell = "./modulos/estructura-principal.js";
  const archivosPorRuta = {
    dashboard: ["./modulos/calificacion-y-panel.js"],
    calificacion: ["./modulos/calificacion-y-panel.js"],
    tickets: ["./modulos/modulo-tickets.js"],
    rutas: ["./modulos/rutas-y-reportes.js"],
    validar_rutas: ["./modulos/rutas-y-reportes.js"],
    reportes: ["./modulos/rutas-y-reportes.js"],
    proyectos_especiales: [
      "./modulos/rutas-y-reportes.js",
      "./modulos/proyectos-especiales/cargador-proyectos-especiales.js"
    ],
    equipos: ["./modulos/equipos-y-envios.js"],
    envio_equipo: ["./modulos/equipos-y-envios.js"]
  };
  const archivosAplicacion = Array.from(
    new Set([archivoShell, ...Object.values(archivosPorRuta).flat()])
  );

  const todosLosArchivos = [...archivosBase, ...archivosAplicacion];
  const promesasCarga = new Map();
  let promesaShell = null;
  let promesaModulosAplicacion = null;
  let precargaProgramada = false;

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
    ["m\uFFFDdulo", "módulo"],
    ["M\uFFFDdulo", "Módulo"],
    ["funci\uFFFDn", "función"],
    ["informaci\uFFFDn", "información"],
    ["Informaci\uFFFDn", "Información"],
    ["Ocurri\uFFFD", "Ocurrió"],
    ["est\uFFFD", "está"]
  ];

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

  function normalizeReadableTextSafe(value, fallback = "") {
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

  function getReadableLoadErrorMessageSafe(error, fallback = "No se pudo cargar el sistema.") {
    const rawMessage =
      typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? error.message
          : fallback;

    const message = normalizeReadableTextSafe(rawMessage, fallback).trim() || fallback;
    const lower = message.toLowerCase();

    if (
      lower.includes("unexpected token") ||
      lower.includes("unexpected identifier") ||
      lower.includes("unexpected end of input")
    ) {
      return "Ocurrió un error interno al cargar un módulo de la interfaz.";
    }
    if (lower.includes("cannot read properties") || lower.includes("cannot set properties")) {
      return "Ocurrió un error interno al iniciar la interfaz.";
    }
    if (lower.includes("is not a function")) {
      return "Ocurrió un error interno porque una función requerida no está disponible.";
    }

    return message;
  }

  function mostrarErrorDeCarga(error, archivoFallido) {
    const app = document.querySelector("#app");
    if (!app) return;

    app.innerHTML = "";
    app.appendChild(
      Object.assign(document.createElement("div"), {
        className: "card",
        style: "max-width:680px; margin:40px auto; padding:24px;",
        innerHTML: `
          <div class="h1">Error al cargar la interfaz</div>
          <div class="small" style="margin-top:10px;">
            ${getReadableLoadErrorMessageSafe(error, "No se pudo cargar el sistema.")}
          </div>
          ${archivoFallido ? `<div class="small" style="margin-top:6px;">Archivo: ${normalizeReadableTextSafe(archivoFallido)}</div>` : ""}
        `
      })
    );
  }

  function cargarArchivo(src) {
    if (promesasCarga.has(src)) {
      return promesasCarga.get(src);
    }

    const promesa = new Promise((resolve, reject) => {
      const existente = document.querySelector(`script[data-app-chunk="${src}"]`);
      if (existente) {
        if (existente.dataset.appLoaded === "1") {
          resolve();
          return;
        }

        existente.addEventListener("load", () => resolve(), { once: true });
        existente.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.appChunk = src;
      script.onload = () => {
        script.dataset.appLoaded = "1";
        resolve();
      };
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(script);
    });

    promesasCarga.set(src, promesa);
    return promesa;
  }

  async function cargarSecuencialmente(archivos) {
    for (const src of archivos) {
      await cargarArchivo(src);
    }
  }

  function cargarEnParalelo(archivos) {
    if (!Array.isArray(archivos) || !archivos.length) {
      return Promise.resolve();
    }

    return Promise.all(archivos.map((src) => cargarArchivo(src)));
  }

  function getArchivosPorRuta(routeKey) {
    return archivosPorRuta[String(routeKey || "")] || [];
  }

  function resolverArchivoFallido(listaArchivos) {
    return (
      listaArchivos.find((src) => !document.querySelector(`script[data-app-chunk="${src}"][data-app-loaded="1"]`)) ||
      null
    );
  }

  function ensureShellModuleLoaded() {
    if (!promesaShell) {
      promesaShell = cargarArchivo(archivoShell).catch((error) => {
        promesaShell = null;
        throw error;
      });
    }

    return promesaShell;
  }

  function ensureRouteModulesLoaded(routeKey) {
    return cargarEnParalelo(getArchivosPorRuta(routeKey));
  }

  function ensureAppModulesLoaded() {
    if (!promesaModulosAplicacion) {
      promesaModulosAplicacion = Promise.all([
        ensureShellModuleLoaded(),
        cargarEnParalelo(archivosAplicacion.filter((src) => src !== archivoShell))
      ]).catch((error) => {
        promesaModulosAplicacion = null;
        throw error;
      });
    }

    return promesaModulosAplicacion;
  }

  function warmupApplicationModules(routeKey) {
    if (precargaProgramada) {
      return promesaModulosAplicacion || Promise.resolve();
    }

    precargaProgramada = true;

    const omitidos = new Set(getArchivosPorRuta(routeKey));
    const archivosPendientes = archivosAplicacion.filter(
      (src) => src !== archivoShell && !omitidos.has(src)
    );

    const iniciar = () => {
      if (!promesaModulosAplicacion) {
        promesaModulosAplicacion = Promise.all([
          ensureShellModuleLoaded(),
          cargarEnParalelo(archivosPendientes)
        ])
          .catch((error) => {
            promesaModulosAplicacion = null;
            throw error;
          })
          .finally(() => {
            precargaProgramada = false;
          });
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(iniciar, { timeout: 1200 });
      return promesaModulosAplicacion || Promise.resolve();
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(iniciar, 0);
    });

    return promesaModulosAplicacion || Promise.resolve();
  }

  window.ensureShellModuleLoaded = ensureShellModuleLoaded;
  window.ensureRouteModulesLoaded = ensureRouteModulesLoaded;
  window.ensureAppModulesLoaded = ensureAppModulesLoaded;
  window.warmupApplicationModules = warmupApplicationModules;

  (async () => {
    await cargarSecuencialmente(archivosBase);
  })().catch((error) => {
    const archivoFallido = resolverArchivoFallido(todosLosArchivos);
    mostrarErrorDeCarga(error, archivoFallido);
    throw error;
  });
})();
