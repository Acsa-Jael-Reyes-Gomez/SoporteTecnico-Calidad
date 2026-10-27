const fs = require("node:fs");
const path = require("node:path");

const rendererSource = path.join(__dirname, "..", "src", "renderer");
const rendererOutput = path.join(__dirname, "..", "dist", "renderer");

fs.cpSync(rendererSource, rendererOutput, { recursive: true, force: true });
