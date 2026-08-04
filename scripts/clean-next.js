const { rmSync, existsSync } = require("node:fs");
const path = require("node:path");

const nextDir = path.join(process.cwd(), ".next");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache.");
} else {
  console.log("No .next folder found — nothing to clean.");
}
