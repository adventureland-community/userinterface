/**
 * Local no-cache static server for Tampermonkey @require during development.
 * Serves enhance-comm-ui/dist (and falls back to synced root copy).
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ECU_DEV_PORT || 3927);
const ROOT = resolve(__dirname, "..");
const DIST_JS = resolve(ROOT, "dist/enhance-comm-ui.js");
const ROOT_JS = resolve(ROOT, "../enhance-comm-ui.js");

function resolveScriptPath() {
  if (existsSync(DIST_JS)) return DIST_JS;
  if (existsSync(ROOT_JS)) return ROOT_JS;
  return null;
}

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    // Easy fingerprint for Tampermonkey / curl without reading the whole file.
    res.setHeader("X-ECU-Service", "ecu-dev");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (path === "/" || path === "/health") {
      const script = resolveScriptPath();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "ecu-dev",
          root: ROOT,
          script: script || null,
          mtimeMs: script ? statSync(script).mtimeMs : null,
        }),
      );
      return;
    }

    if (
      path === "/enhance-comm-ui.js" ||
      path === "/enhance-comm-ui.user.js" ||
      path === "/dist/enhance-comm-ui.js"
    ) {
      const script = resolveScriptPath();
      if (!script) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Build missing — run npm run build or wait for watch.\n");
        return;
      }
      const body = readFileSync(script);
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Last-Modified": statSync(script).mtime.toUTCString(),
        "X-ECU-Mtime": String(statSync(script).mtimeMs),
      });
      res.end(body);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found. Try /enhance-comm-ui.js\n");
  });

  server.on("error", async (err) => {
    if (err && err.code === "EADDRINUSE") {
      const reused = await isReusableServer();
      if (reused) {
        console.log(
          `[ecu-dev] port ${PORT} already serving this tree — reusing http://127.0.0.1:${PORT}/enhance-comm-ui.js`,
        );
        process.exit(0);
        return;
      }
      console.error(
        `[ecu-dev] port ${PORT} is in use by another process (or a stale ecu-dev from a different folder). Kill it or run ECU_DEV_PORT=3930 npm run dev (and update the URL in dev.user.js).`,
      );
      process.exit(1);
      return;
    }
    console.error("[ecu-dev] server error", err);
    process.exit(1);
  });

  server.listen(PORT, "127.0.0.1", () => {
    const script = resolveScriptPath();
    console.log(`[ecu-dev] http://127.0.0.1:${PORT}/enhance-comm-ui.js`);
    console.log(
      script
        ? `[ecu-dev] serving ${script}`
        : `[ecu-dev] waiting for dist/enhance-comm-ui.js (run build/watch)`,
    );
  });
}

/**
 * Only reuse if health is ecu-dev AND it is serving a script under this package root.
 * An orphaned server from another clone (e.g. userinterface-meters) must not win.
 */
async function isReusableServer() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/health`, {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (!(json && json.ok === true && json.service === "ecu-dev")) return false;
    if (!json.script || typeof json.script !== "string") return false;
    const served = resolve(json.script);
    const ours = resolve(ROOT);
    return served === resolve(DIST_JS) || served.startsWith(ours + "\\") || served.startsWith(ours + "/");
  } catch {
    return false;
  }
}

startServer();
