const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const distMain = path.join(projectRoot, "dist", "main", "main.js");
const distIndex = path.join(projectRoot, "dist", "renderer", "index.html");
const distCssBundle = path.join(projectRoot, "dist", "renderer", "styles", "app.bundle.css");

function newestModifiedTime(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = stat.mtimeMs;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const childPath = path.join(targetPath, entry.name);
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "release" || entry.name === ".git") continue;
    if (childPath === path.join(projectRoot, "src", "renderer", "styles", "app.bundle.css")) continue;
    if (childPath === path.join(projectRoot, "src", "renderer", "vendor")) continue;
    newest = Math.max(newest, newestModifiedTime(childPath));
  }
  return newest;
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

function getNpmRunner() {
  const npmExecPath = String(process.env.npm_execpath || "").trim();
  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      argsPrefix: [npmExecPath]
    };
  }

  const npmCliFromNode = path.resolve(path.dirname(process.execPath), "..", "node_modules", "npm", "bin", "npm-cli.js");
  if (fs.existsSync(npmCliFromNode)) {
    return {
      command: process.execPath,
      argsPrefix: [npmCliFromNode]
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    argsPrefix: []
  };
}

function ensureBuildIfNeeded() {
  const requiredFiles = [distMain, distIndex, distCssBundle];
  const missing = requiredFiles.some((filePath) => !fs.existsSync(filePath));
  const oldestBuildOutput = missing ? 0 : Math.min(...requiredFiles.map((filePath) => fs.statSync(filePath).mtimeMs));
  const newestSource = Math.max(
    newestModifiedTime(path.join(projectRoot, "src")),
    newestModifiedTime(path.join(projectRoot, "package.json")),
    newestModifiedTime(path.join(projectRoot, "tsconfig.json"))
  );

  if (!missing && oldestBuildOutput >= newestSource) return;

  const npmRunner = getNpmRunner();
  run(npmRunner.command, [...npmRunner.argsPrefix, "run", "build"]);
}

ensureBuildIfNeeded();

const electronBinary = require("electron");
const electronEnv = { ...process.env };
delete electronEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  cwd: projectRoot,
  stdio: "inherit",
  env: electronEnv
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
