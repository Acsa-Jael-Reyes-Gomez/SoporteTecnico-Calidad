const fs = require("node:fs");
const path = require("node:path");

const filePath = path.resolve(__dirname, "..", "database.sql");
const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

function removeUsingBtree(line) {
  const marker = "USING BTREE";
  let current = line;
  let markerIndex = current.indexOf(marker);

  while (markerIndex !== -1) {
    let whitespaceStart = markerIndex;
    while (whitespaceStart > 0 && /\s/.test(current[whitespaceStart - 1])) {
      whitespaceStart -= 1;
    }

    if (whitespaceStart === markerIndex) {
      markerIndex = current.indexOf(marker, markerIndex + marker.length);
      continue;
    }

    current = `${current.slice(0, whitespaceStart)}${current.slice(markerIndex + marker.length)}`;
    markerIndex = current.indexOf(marker, whitespaceStart);
  }

  return current;
}

const normalized = lines.map((line) => {
  let current = line;

  if (current.includes("PRIMARY KEY") && current.includes("USING BTREE")) {
    current = removeUsingBtree(current);
  }

  if (current.includes("UNIQUE INDEX")) {
    current = current.replace("UNIQUE INDEX", "UNIQUE KEY");
  }

  if (/^\s*INDEX\s+`/.test(current)) {
    current = current.replace(/^(\s*)INDEX\b/, "$1KEY");
  }

  current = current.replaceAll("`(", "` (");
  current = current.replace(/\)\s+USING BTREE/g, ")");

  return current;
});

fs.writeFileSync(filePath, normalized.join("\n"), "utf8");
console.log("database.sql normalizado");
