/**
 * Local no-cache static server for Tampermonkey @require during development.
 * Also serves the Comm overlay preview at /overlay (no game client).
 *
 * Overlay assets: gitignored cache under dev/overlay/cache/ (data.js, stock
 * sprite kit, fonts). /images and /css are proxied from adventure.land and
 * written into that cache on first miss.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REL,
  cachePath,
  cacheStatus,
  ensureOverlayCache,
  handleOverlayAsset,
  isAllowedAssetPath,
  isCacheReady,
  sendDiskFile,
} from "./overlay-client-cache.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ECU_DEV_PORT || 3927);
const ROOT = resolve(__dirname, "..");
const DIST_JS = resolve(ROOT, "dist/enhance-comm-ui.js");
const ROOT_JS = resolve(ROOT, "../enhance-comm-ui.js");
const OVERLAY_JS = resolve(ROOT, "dist/overlay-preview.js");
const OVERLAY_HTML = resolve(ROOT, "dev/overlay/index.html");

function resolveScriptPath() {
  if (existsSync(DIST_JS)) return DIST_JS;
  if (existsSync(ROOT_JS)) return ROOT_JS;
  return null;
}

function fileMtimeMs(path) {
  return existsSync(path) ? statSync(path).mtimeMs : null;
}

function sendJs(res, filePath) {
  const body = readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Last-Modified": statSync(filePath).mtime.toUTCString(),
    "X-ECU-Mtime": String(statSync(filePath).mtimeMs),
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(body);
}

function sendOverlayHtml(res) {
  if (!existsSync(OVERLAY_HTML)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing dev/overlay/index.html\n");
    return;
  }
  const commMtime = fileMtimeMs(resolveScriptPath() || DIST_JS) || Date.now();
  const previewMtime = fileMtimeMs(OVERLAY_JS) || Date.now();
  const html = readFileSync(OVERLAY_HTML, "utf8")
    .replaceAll(
      "__OVERLAY_PREVIEW_JS__",
      `/overlay-preview.js?t=${previewMtime}`,
    )
    .replaceAll("__OVERLAY_COMM_JS__", `/enhance-comm-ui.js?t=${commMtime}`);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

async function sendCachedAl(res, rel) {
  try {
    await ensureOverlayCache();
  } catch (err) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Overlay client cache missing. Run npm run overlay:sync\n" +
        (err && err.message ? err.message + "\n" : ""),
    );
    return;
  }
  const filePath = cachePath(rel);
  if (!existsSync(filePath)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Overlay client cache incomplete — run npm run overlay:sync\n");
    return;
  }
  sendDiskFile(res, filePath, { cacheable: false });
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("X-ECU-Service", "ecu-dev");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/" || path === "/health") {
    const script = resolveScriptPath();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "ecu-dev",
        root: ROOT,
        script: script || null,
        mtimeMs: script ? statSync(script).mtimeMs : null,
        overlay: `http://127.0.0.1:${PORT}/overlay`,
        overlayPreview: existsSync(OVERLAY_JS) ? OVERLAY_JS : null,
        overlayMtimeMs: fileMtimeMs(OVERLAY_JS),
        overlayCache: cacheStatus(),
      }),
    );
    return;
  }

  if (
    path === "/overlay" ||
    path === "/overlay/" ||
    path === "/overlay/index.html"
  ) {
    sendOverlayHtml(res);
    return;
  }

  if (path === "/al/status") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(cacheStatus()));
    return;
  }

  if (path === "/al/sync") {
    try {
      const manifest = await ensureOverlayCache({
        force: url.searchParams.get("force") === "1",
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify({ ok: true, ...manifest }));
    } catch (err) {
      res.writeHead(502, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: err && err.message ? err.message : String(err),
        }),
      );
    }
    return;
  }

  if (path === "/al/data.js") {
    await sendCachedAl(res, REL.data);
    return;
  }

  if (path === "/al/client-kit.js") {
    await sendCachedAl(res, REL.kit);
    return;
  }

  if (isAllowedAssetPath(path)) {
    await handleOverlayAsset(res, path, url.search);
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
    sendJs(res, script);
    return;
  }

  if (path === "/overlay-preview.js" || path === "/dist/overlay-preview.js") {
    if (!existsSync(OVERLAY_JS)) {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        "Overlay preview build missing — run npm run build or wait for watch.\n",
      );
      return;
    }
    sendJs(res, OVERLAY_JS);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found. Try /overlay or /enhance-comm-ui.js\n");
}

function startServer() {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      res.end(String(err && err.message ? err.message : err));
    });
  });

  server.on("error", async (err) => {
    if (err && err.code === "EADDRINUSE") {
      const reused = await isReusableServer();
      if (reused) {
        console.log(
          `[ecu-dev] port ${PORT} already serving this tree — reusing http://127.0.0.1:${PORT}/enhance-comm-ui.js`,
        );
        console.log(`[ecu-dev] overlay http://127.0.0.1:${PORT}/overlay`);
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
    console.log(`[ecu-dev] overlay http://127.0.0.1:${PORT}/overlay`);
    console.log(
      script
        ? `[ecu-dev] serving ${script}`
        : `[ecu-dev] waiting for dist/enhance-comm-ui.js (run build/watch)`,
    );
    if (isCacheReady()) {
      console.log(`[ecu-dev] overlay cache ready at ${cachePath("")}`);
    } else {
      console.log(
        `[ecu-dev] overlay cache empty — fetching from adventure.land (or run npm run overlay:sync)`,
      );
    }
    ensureOverlayCache()
      .then(() => {
        console.log("[ecu-dev] overlay cache ok");
      })
      .catch((err) => {
        console.warn(
          "[ecu-dev] overlay cache sync failed:",
          err && err.message ? err.message : err,
        );
      });
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
    return (
      served === resolve(DIST_JS) ||
      served.startsWith(ours + "\\") ||
      served.startsWith(ours + "/")
    );
  } catch {
    return false;
  }
}

startServer();
