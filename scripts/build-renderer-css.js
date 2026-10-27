const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const stylesRoot = path.join(projectRoot, "src", "renderer", "styles");
const entryFile = path.join(stylesRoot, "app.css");
const outputFile = path.join(stylesRoot, "app.bundle.css");
const outputDir = path.dirname(outputFile);
const fontAwesomeSourceRoot = path.join(projectRoot, "node_modules", "@fortawesome", "fontawesome-free");
const fontAwesomeTargetRoot = path.join(projectRoot, "src", "renderer", "vendor", "fontawesome");

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeRelativePath(targetPath) {
  const normalized = targetPath.replaceAll("\\", "/");
  if (normalized.startsWith(".") || normalized.startsWith("/")) {
    return normalized;
  }
  return `./${normalized}`;
}

function rewriteCssUrls(source, currentDir) {
  return source.replace(/url\(([^)]*)\)/g, (fullMatch, rawValue) => {
    const value = String(rawValue || "").trim();
    const firstCharacter = value[0];
    const hasMatchingQuotes =
      (firstCharacter === "'" || firstCharacter === '"') && value.endsWith(firstCharacter);
    const quote = hasMatchingQuotes ? firstCharacter : "";
    const target = (hasMatchingQuotes ? value.slice(1, -1) : value).trim();
    if (!target) return fullMatch;
    if (
      target.startsWith("data:") ||
      target.startsWith("http:") ||
      target.startsWith("https:") ||
      target.startsWith("file:") ||
      target.startsWith("#") ||
      target.startsWith("/")
    ) {
      return fullMatch;
    }

    const absoluteTarget = path.resolve(currentDir, target);
    const relativeTarget = normalizeRelativePath(path.relative(outputDir, absoluteTarget));
    return `url(${quote}${relativeTarget}${quote})`;
  });
}

function copyFileIfExists(sourceFile, targetFile) {
  if (!fs.existsSync(sourceFile)) return;
  ensureDirectory(path.dirname(targetFile));
  fs.copyFileSync(sourceFile, targetFile);
}

function copyDirectoryContents(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  ensureDirectory(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
      continue;
    }

    ensureDirectory(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function copyFontAwesomeAssets() {
  const cssSource = path.join(fontAwesomeSourceRoot, "css", "all.min.css");
  const cssTarget = path.join(fontAwesomeTargetRoot, "css", "all.min.css");
  const webfontsSource = path.join(fontAwesomeSourceRoot, "webfonts");
  const webfontsTarget = path.join(fontAwesomeTargetRoot, "webfonts");

  if (!fs.existsSync(cssSource) || !fs.existsSync(webfontsSource)) {
    throw new Error("No se encontraron los archivos locales de Font Awesome en node_modules.");
  }

  copyFileIfExists(cssSource, cssTarget);
  copyDirectoryContents(webfontsSource, webfontsTarget);
}

function resolveCss(filePath, stack = []) {
  const absolutePath = path.resolve(filePath);
  const source = readFileSafe(absolutePath);
  const currentDir = path.dirname(absolutePath);
  const lines = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const match = rawLine.match(/^\s*@import\s+['"](.+?)['"]\s*;\s*$/);
    if (!match) {
      lines.push(rewriteCssUrls(rawLine, currentDir));
      continue;
    }

    const importPath = path.resolve(currentDir, match[1]);
    if (stack.includes(importPath)) {
      throw new Error(`Importación circular detectada: ${[...stack, importPath].join(" -> ")}`);
    }

    lines.push(
      `/* ===== ${path.relative(stylesRoot, importPath).replaceAll("\\", "/")} ===== */`,
      resolveCss(importPath, [...stack, importPath]),
      ""
    );
  }

  return lines.join("\n");
}

const bundledCss = [
  "/* Archivo generado automáticamente desde src/renderer/styles/app.css */",
  "/* No editar directamente: modifica los archivos fuente y vuelve a ejecutar el build. */",
  "",
  resolveCss(entryFile)
].join("\n");

fs.writeFileSync(outputFile, bundledCss, "utf8");
copyFontAwesomeAssets();
console.log(`CSS bundle generado en ${path.relative(projectRoot, outputFile)}`);
