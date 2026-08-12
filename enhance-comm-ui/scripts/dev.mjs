/**
 * Dev workflow: debounced rebuild + local @require / fetch server.
 */

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PORT = process.env.ECU_DEV_PORT || "3927";

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];

function run(commandLine, label) {
  const child = spawn(commandLine, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ECU_DEV_PORT: PORT },
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[ecu-dev] ${label} stopped (${signal})`);
      return;
    }
    if (code && code !== 0) {
      console.error(`[ecu-dev] ${label} exited ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

console.log(`[ecu-dev] http://127.0.0.1:${PORT}/enhance-comm-ui.js`);
console.log(
  `[ecu-dev] Install enhance-comm-ui/dev.user.js once · Externals not required (loader cache-busts) · disable full pasted script · refresh /comm`,
);

run("node scripts/dev-watch.mjs", "watch");
run("node scripts/dev-server.mjs", "server");

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
