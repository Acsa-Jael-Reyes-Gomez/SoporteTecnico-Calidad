const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, "src"),
  path.join(ROOT, "database.sql")
];
const ALLOWED_EXTENSIONS = new Set([".js", ".ts", ".css", ".html", ".sql"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "release", ".git"]);

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

const exactReplacements = new Map([
  ["const UNREADABLE_TEXT_PATTERN = /[ÃÂâœð�]/;", String.raw`const UNREADABLE_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/;`],
  ["const UNREADABLE_TEXT_PATTERN = /[ÃƒÃ‚Ã¢Å“Ã°ï¿½]/;", String.raw`const UNREADABLE_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/;`],
  ['const matches = String(text || "").match(/[ÃÂâœð�]/g);', String.raw`const matches = String(text || "").match(/[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/g);`],
  ['const matches = String(text || "").match(/[ÃƒÃ‚Ã¢Å“Ã°ï¿½]/g);', String.raw`const matches = String(text || "").match(/[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/g);`],
  ['const matches = String(value || "").match(/[ÃÂâœð�]/g);', String.raw`const matches = String(value || "").match(/[\u00c3\u00c2\u00e2\u0153\u00f0\uFFFD]/g);`],
  ["const BROKEN_TEXT_PATTERN = /[ÃÂâð]/;", String.raw`const BROKEN_TEXT_PATTERN = /[\u00c3\u00c2\u00e2\u00f0]/;`],
  ["const BROKEN_TEXT_MARKERS_REGEX = /[ÃÂâð]/g;", String.raw`const BROKEN_TEXT_MARKERS_REGEX = /[\u00c3\u00c2\u00e2\u00f0]/g;`],
  ['return { id, key: "", name: fallback || "â€”", letter: "â€”", cls: "basico" };', 'return { id, key: "", name: fallback || "—", letter: "—", cls: "basico" };'],
  ['documento !== "â€”"', 'documento !== "—"']
]);

const replacementCharReplacements = [
  ["sesi�n", "sesión"],
  ["Sesi�n", "Sesión"],
  ["v�lida", "válida"],
  ["v�lido", "válido"],
  ["inv�lida", "inválida"],
  ["inv�lido", "inválido"],
  ["cat�logo", "catálogo"],
  ["cat�logos", "catálogos"],
  ["contrase�a", "contraseña"],
  ["Contrase�a", "Contraseña"],
  ["m�dulo", "módulo"],
  ["M�dulo", "Módulo"],
  ["m�dulos", "módulos"],
  ["funci�n", "función"],
  ["informaci�n", "información"],
  ["Informaci�n", "Información"],
  ["T�cnico", "Técnico"],
  ["t�cnico", "técnico"],
  ["t�cnicos", "técnicos"],
  ["env�o", "envío"],
  ["Env�o", "Envío"],
  ["env�os", "envíos"],
  ["Env�os", "Envíos"],
  ["n�mero", "número"],
  ["N�mero", "Número"],
  ["opci�n", "opción"],
  ["Opci�n", "Opción"],
  ["Tel�fono", "Teléfono"],
  ["tel�fono", "teléfono"],
  ["veh�culo", "vehículo"],
  ["Veh�culo", "Vehículo"],
  ["P�gina", "Página"],
  ["p�gina", "página"],
  ["bot�n", "botón"],
  ["autom�tico", "automático"],
  ["revisi�n", "revisión"],
  ["Revisi�n", "Revisión"],
  ["soluci�n", "solución"],
  ["Soluci�n", "Solución"],
  ["configuraci�n", "configuración"],
  ["aplicaci�n", "aplicación"],
  ["conexi�n", "conexión"],
  ["operaci�n", "operación"],
  ["vinculaci�n", "vinculación"],
  ["reparaci�n", "reparación"],
  ["Reparaci�n", "Reparación"],
  ["atenci�n", "atención"],
  ["validaci�n", "validación"],
  ["Validaci�n", "Validación"],
  ["descripci�n", "descripción"],
  ["Descripci�n", "Descripción"],
  ["acci�n", "acción"],
  ["Acci�n", "Acción"],
  ["T�tulo", "Título"],
  ["t�tulo", "título"],
  ["m�nimo", "mínimo"],
  ["quedar�", "quedará"],
  ["podr�", "podrá"],
  ["tambi�n", "también"],
  ["m�s", "más"],
  ["est�", "está"],
  ["hab�a", "había"],
  ["Ocurri�", "Ocurrió"],
  ["N�", "Nº"],
  ["a�n", "aún"],
  ["da�o", "daño"],
  ["Gesti�n", "Gestión"],
  ["aprobaci�n", "aprobación"],
  ["Aprobaci�n", "Aprobación"],
  ["n�", "nº"],
  ["cami�n", "camión"],
  ["Cami�n", "Camión"],
  ["secci�n", "sección"],
  ["Secci�n", "Sección"],
  ["aqu�", "aquí"],
  ["as�", "así"],
  ["men�", "menú"],
  ["solo lectura", "solo lectura"],
  ["b�squeda", "búsqueda"],
  ["v�ase", "véase"],
  ["Calificaci�n", "Calificación"],
  ["calificaci�n", "calificación"],
  ["sincronizaci�n", "sincronización"],
  ["Sincronizaci�n", "Sincronización"],
  ["tama�o", "tamaño"],
  ["Tama�o", "Tamaño"],
  ["ingresar�", "ingresará"],
  ["crear�", "creará"],
  ["cerrar�", "cerrará"],
  ["est�ndar", "estándar"],
  ["m�vil", "móvil"],
  ["M�vil", "Móvil"],
  ["ultim�a", "última"],
  ["s�", "sí"],
  ["est�n", "están"],
  ["tendr�", "tendrá"],
  ["har�", "hará"],
  ["seguir�", "seguirá"],
  ["Verificaci�n", "Verificación"],
  ["verificaci�n", "verificación"]
];

const standalonePlaceholderReplacements = [
  ['"�"', '"—"'],
  ["'�'", "'—'"],
  ['"ï¿½"', '"—"'],
  ["'ï¿½'", "'—'"],
  [" � ", " • "],
  [" ï¿½ ", " • "]
];

function collectFiles(targetPath, output) {
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    for (const name of fs.readdirSync(targetPath)) {
      if (SKIP_DIRS.has(name)) continue;
      collectFiles(path.join(targetPath, name), output);
    }
    return;
  }

  if (ALLOWED_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    output.push(targetPath);
  }
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function suspiciousScore(text) {
  return (
    countMatches(text, /\u00ef\u00bf\u00bd/g) * 8 +
    countMatches(text, /\ufffd/g) * 7 +
    countMatches(text, /[\u00c3\u00c2\u00e2\u0153\u00f0]/g) * 4
  );
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

function applyExactReplacements(text) {
  let output = text;
  for (const [source, target] of exactReplacements.entries()) {
    if (output.includes(source)) output = output.split(source).join(target);
  }
  return output;
}

function applyReplacementCharRepairs(text) {
  let output = text.replaceAll("\u00ef\u00bf\u00bd", "\ufffd");
  for (const [source, target] of replacementCharReplacements) {
    if (output.includes(source)) output = output.split(source).join(target);
  }
  for (const [source, target] of standalonePlaceholderReplacements) {
    if (output.includes(source)) output = output.split(source).join(target);
  }
  return output;
}

function decodeSuspiciousLine(line) {
  if (!/[\u00c3\u00c2\u00e2\u0153\u00f0]|\u00ef\u00bf\u00bd/.test(line)) {
    return line;
  }

  let current = line;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decoded = decodeBrokenTextOnce(current);
    if (!decoded || decoded === current) break;
    if (suspiciousScore(decoded) > suspiciousScore(current)) break;
    current = decoded;
  }
  return current;
}

function repairText(text) {
  const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/).map((line) => {
    let output = line;
    output = applyExactReplacements(output);
    output = decodeSuspiciousLine(output);
    output = applyExactReplacements(output);
    output = applyReplacementCharRepairs(output);
    output = output.replaceAll("â€”", "—");
    output = output.replaceAll("â€¢", "•");
    output = output.replaceAll("âœ…", "✅");
    output = output.replaceAll("âœ”", "✔");
    output = output.replaceAll("âš ï¸", "⚠️");
    output = output.replaceAll("ðŸ”§", "🔧");
    return output.normalize("NFC");
  });

  return lines.join(lineBreak);
}

function main() {
  const files = [];
  for (const target of TARGETS) {
    if (fs.existsSync(target)) collectFiles(target, files);
  }

  let changed = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const repaired = repairText(original);
    if (repaired !== original) {
      fs.writeFileSync(file, repaired, "utf8");
      changed += 1;
      console.log(path.relative(ROOT, file));
    }
  }

  console.log(`Archivos actualizados: ${changed}`);
}

main();
