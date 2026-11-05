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
import { lanIpv4Addresses, preferredLanIpv4 } from "./lan-ipv4.mjs";
import {
  ensureDevConnectHosts,
  parseDevRequestHost,
  rewriteDevUserJsBase,
  rewriteEnhanceUserJsForLanInstall,
} from "./dev-user-js.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ECU_DEV_PORT || 3927);
/** Bind address — default all interfaces so phones on LAN can load the script. */
const HOST = String(process.env.ECU_DEV_HOST || "0.0.0.0").trim() || "0.0.0.0";
const ROOT = resolve(__dirname, "..");
const DIST_JS = resolve(ROOT, "dist/enhance-comm-ui.js");
const ROOT_JS = resolve(ROOT, "../enhance-comm-ui.js");
const OVERLAY_JS = resolve(ROOT, "dist/overlay-preview.js");
const OVERLAY_HTML = resolve(ROOT, "dev/overlay/index.html");
const OVERLAY_SHELL_HTML = resolve(ROOT, "dev/overlay/shell.html");
const OVERLAY_SHOT_MJS = resolve(ROOT, "agentic/overlay-shot/capture.mjs");
const DEV_USER_JS = resolve(ROOT, "dev.user.js");
const PKG_JSON = resolve(ROOT, "package.json");

function packageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(PKG_JSON, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function publicBases() {
  const preferred = preferredLanIpv4();
  const lan = lanIpv4Addresses();
  const bases = [`http://127.0.0.1:${PORT}`];
  // Wi‑Fi / Ethernet first after loopback (skip Tailscale / Hyper-V when possible).
  if (preferred) bases.push(`http://${preferred}:${PORT}`);
  for (let i = 0; i < lan.length; i++) {
    if (lan[i] === preferred) continue;
    bases.push(`http://${lan[i]}:${PORT}`);
  }
  return bases;
}

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

function sendOverlayShell(res) {
  if (!existsSync(OVERLAY_SHELL_HTML)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing dev/overlay/shell.html\n");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(OVERLAY_SHELL_HTML, "utf8"));
}

function sendOverlayFrame(res) {
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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function handleOverlayShotApi(req, res) {
  if (!existsSync(OVERLAY_SHOT_MJS)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing agentic/overlay-shot/capture.mjs\n");
    return;
  }
  const body = req.method === "POST" ? await readJsonBody(req) : {};
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const view =
    body.view === "desktop" || url.searchParams.get("view") === "desktop"
      ? "desktop"
      : "phone";
  const fovRaw = body.fov != null ? body.fov : url.searchParams.get("fov");
  const fov = fovRaw != null && Number(fovRaw) > 0 ? Number(fovRaw) : 1;
  try {
    const mod = await import(
      pathToFileUrl(OVERLAY_SHOT_MJS) + "?t=" + Date.now()
    );
    const result = await mod.captureOverlayShot({
      view,
      fov,
      baseUrl: `http://127.0.0.1:${PORT}/overlay/frame`,
    });
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition":
        'attachment; filename="overlay-' +
        view +
        "-fov-" +
        String(result.appliedFov).replace(".", "_") +
        '.png"',
      "X-ECU-Shot-Meta": JSON.stringify(result.meta),
    });
    res.end(result.buffer);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(err && err.message ? err.message : String(err));
  }
}

function pathToFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return "file:///" + normalized;
  }
  return "file://" + normalized;
}

/**
 * Serve dev.user.js with BASE + @connect pointed at the request Host (LAN IP).
 */
function sendDevUserJs(res, reqHost) {
  if (!existsSync(DEV_USER_JS)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing dev.user.js\n");
    return;
  }
  const parsed = parseDevRequestHost(reqHost, PORT);
  const base = `http://${parsed.hostPort}/enhance-comm-ui.js`;
  let body = readFileSync(DEV_USER_JS, "utf8");
  body = rewriteDevUserJsBase(body, base);
  body = ensureDevConnectHosts(body, parsed.hostname);
  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Disposition": 'inline; filename="dev.user.js"',
    "Cache-Control": "no-store",
  });
  res.end(body);
}

/**
 * Full userscript install for phones (same path as GitHub raw). Stamps
 * @updateURL so Tampermonkey can pull watch rebuilds without GM.xhr.
 */
function sendEnhanceUserJs(res, reqHost, filePath) {
  const parsed = parseDevRequestHost(reqHost, PORT);
  const installUrl = `http://${parsed.hostPort}/enhance-comm-ui.user.js`;
  const mtimeMs = statSync(filePath).mtimeMs;
  let body = readFileSync(filePath, "utf8");
  body = rewriteEnhanceUserJsForLanInstall(
    body,
    installUrl,
    mtimeMs,
    packageVersion(),
  );
  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Disposition": 'inline; filename="enhance-comm-ui.user.js"',
    "Last-Modified": statSync(filePath).mtime.toUTCString(),
    "X-ECU-Mtime": String(mtimeMs),
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(body);
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
  const from = String(req.socket.remoteAddress || "?");
  if (
    path === "/dev.user.js" ||
    path === "/enhance-comm-ui.js" ||
    path === "/enhance-comm-ui.user.js" ||
    path === "/dist/enhance-comm-ui.js"
  ) {
    console.log(
      `[ecu-dev] ${req.method || "GET"} ${path} host=${req.headers.host || "?"} from=${from}`,
    );
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("X-ECU-Service", "ecu-dev");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/" || path === "/health") {
    const script = resolveScriptPath();
    const bases = publicBases();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: "ecu-dev",
        root: ROOT,
        host: HOST,
        port: PORT,
        script: script || null,
        mtimeMs: script ? statSync(script).mtimeMs : null,
        bases,
        overlay: `${bases[0]}/overlay`,
        overlayPreview: existsSync(OVERLAY_JS) ? OVERLAY_JS : null,
        overlayMtimeMs: fileMtimeMs(OVERLAY_JS),
        overlayCache: cacheStatus(),
        phoneHint:
          bases.length > 1
            ? `On phone: install ${bases[1]}/enhance-comm-ui.user.js (full script; Check for updates after rebuild). Desktop live-reload: ${bases[0]}/dev.user.js`
            : null,
      }),
    );
    return;
  }

  if (path === "/dev.user.js") {
    sendDevUserJs(res, req.headers.host);
    return;
  }

  // Stock api_call → /api/<method>. Overlay has no hub; return empty success so
  // jQuery deferreds resolve (404 reject becomes an unhandled pageerror).
  if (path.startsWith("/api/")) {
    const method = path.slice("/api/".length).split("?")[0];
    let body = {};
    if (method === "pull_chats") body = { chats: [], cursor: null };
    else if (method === "pull_chat") body = { messages: [], cursor: null };
    else if (method === "servers_and_characters") {
      body = { servers: [], characters: [], unread: 0 };
    } else if (method === "send_message") body = { ok: true };
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
    return;
  }

  if (
    path === "/overlay" ||
    path === "/overlay/" ||
    path === "/overlay/index.html"
  ) {
    // Harness shell: Phone/Desktop iframe + Shot (+UI / World).
    sendOverlayShell(res);
    return;
  }

  if (path === "/overlay/frame" || path === "/overlay/frame/") {
    // Actual stock host + ECU (sized by the shell iframe / Playwright).
    sendOverlayFrame(res);
    return;
  }

  if (path === "/overlay/api/shot") {
    await handleOverlayShotApi(req, res);
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

  if (path === "/al/data.js" || path === "/data.js") {
    await sendCachedAl(res, REL.data);
    return;
  }

  if (path === "/al/client-kit.js") {
    await sendCachedAl(res, REL.kit);
    return;
  }

  // Stock /comm scripts + images/css from overlay cache.
  if (isAllowedAssetPath(path)) {
    await handleOverlayAsset(res, path, url.search);
    return;
  }

  if (path === "/enhance-comm-ui.user.js") {
    const script = resolveScriptPath();
    if (!script) {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Build missing — run npm run build or wait for watch.\n");
      return;
    }
    sendEnhanceUserJs(res, req.headers.host, script);
    return;
  }

  if (path === "/enhance-comm-ui.js" || path === "/dist/enhance-comm-ui.js") {
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
        logListenUrls("reusing");
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

  server.listen(PORT, HOST, () => {
    const script = resolveScriptPath();
    logListenUrls("listening");
    console.log(`[ecu-dev] bind ${HOST}:${PORT}`);
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

function logListenUrls(kind) {
  const bases = publicBases();
  console.log(`[ecu-dev] ${kind} ${bases[0]}/enhance-comm-ui.js`);
  console.log(`[ecu-dev] overlay ${bases[0]}/overlay`);
  for (let i = 1; i < bases.length; i++) {
    console.log(`[ecu-dev] LAN ${bases[i]}/enhance-comm-ui.js`);
    console.log(`[ecu-dev] phone install ${bases[i]}/enhance-comm-ui.user.js`);
  }
  console.log(`[ecu-dev] desktop loader ${bases[0]}/dev.user.js`);
  if (bases.length < 2 && HOST !== "127.0.0.1") {
    console.log(
      `[ecu-dev] no LAN IPv4 found — check Wi‑Fi / ECU_DEV_HOST (now ${HOST})`,
    );
  }
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
