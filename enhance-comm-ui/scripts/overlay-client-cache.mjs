/**
 * Overlay preview cache: live adventure.land data.js, stock client functions,
 * fonts, and /images|/css assets. All of this lives under dev/overlay/cache/
 * (gitignored) — the overlay is a simulation harness, not a game dump in git.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");
export const ORIGIN = process.env.ECU_AL_ORIGIN || "https://adventure.land";
export const CACHE_DIR = resolve(ROOT, "dev/overlay/cache");

export const REL = {
  data: "data.js",
  // Live /js/common_functions.js is a website API helper that resets `var G = {}`.
  // The game client helpers (process_game_data, prune_cx, T, …) are old_common_functions.js.
  common: "js/old_common_functions.js",
  html: "js/html.js",
  font: "css/fonts/m5x7.ttf",
  kit: "client-kit.js",
  manifest: "manifest.json",
};

const HTML_FNS = [
  "precompute_image_positions",
  "sprite_image",
  "sprite",
  "item_container",
];

const MIME = {
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

let inflight = null;

export function cachePath(rel) {
  return join(CACHE_DIR, rel.replace(/\\/g, "/"));
}

export function isAllowedAssetPath(pathname) {
  if (typeof pathname !== "string" || !pathname) return false;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (decoded.includes("\0")) return false;
  const n = decoded.replace(/\\/g, "/");
  if (n.includes("..")) return false;
  return n.startsWith("/images/") || n.startsWith("/css/");
}

export function assetCacheRel(pathname) {
  if (!isAllowedAssetPath(pathname)) return null;
  const n = decodeURIComponent(pathname).replace(/\\/g, "/");
  return n.replace(/^\//, "");
}

export function isCacheReady() {
  return existsSync(cachePath(REL.data)) && existsSync(cachePath(REL.kit));
}

export function readManifest() {
  const p = cachePath(REL.manifest);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function cacheStatus() {
  const manifest = readManifest();
  return {
    ready: isCacheReady(),
    origin: ORIGIN,
    dir: CACHE_DIR,
    fetchedAt: manifest && manifest.fetchedAt,
    files: manifest && manifest.files,
  };
}

export function mimeFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

export function sendDiskFile(res, filePath, opts) {
  const cacheable = !!(opts && opts.cacheable);
  const body = readFileSync(filePath);
  const headers = {
    "Content-Type": mimeFor(filePath),
    "Content-Length": String(body.length),
  };
  if (cacheable) {
    headers["Cache-Control"] = "public, max-age=86400";
  } else {
    headers["Cache-Control"] = "no-store";
  }
  if (existsSync(filePath)) {
    headers["Last-Modified"] = statSync(filePath).mtime.toUTCString();
  }
  res.writeHead(200, headers);
  res.end(body);
}

function writeFileEnsured(filePath, body) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body);
}

async function fetchBuffer(urlPath) {
  const url = ORIGIN + urlPath;
  const res = await fetch(url, {
    headers: { "User-Agent": "enhance-comm-ui-overlay-cache" },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Extract a top-level `function name(...) { ... }` from a JS source string.
 * Brace-aware; skips strings and comments.
 */
export function extractFunction(source, name) {
  const needle = "function " + name + "(";
  const start = source.indexOf(needle);
  if (start < 0) throw new Error("missing function " + name);
  let i = source.indexOf("{", start);
  if (i < 0) throw new Error("no body for " + name);
  let depth = 0;
  let inStr = null;
  let escape = false;
  let inLine = false;
  let inBlock = false;
  for (; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (inLine) {
      if (c === "\n") inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === "*" && n === "/") {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") {
      inLine = true;
      i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlock = true;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("unclosed function " + name);
}

function kitHeader() {
  return (
    "/* enhance-comm-ui overlay client-kit — generated, do not commit */\n" +
    "window.__ecuClientKit = true;\n" +
    "if (typeof window.set_uchance !== 'function') {\n" +
    "  window.set_uchance = function () { return ['#299C4C', '%??.??']; };\n" +
    "}\n" +
    "if (typeof window.set_uroll !== 'function') {\n" +
    "  window.set_uroll = function () { return '#00.00'; };\n" +
    "}\n" +
    "var IID = null;\n"
  );
}

export function buildClientKit(commonJs, htmlJs) {
  if (!commonJs.includes("function process_game_data")) {
    throw new Error(
      "old_common_functions.js missing process_game_data — wrong file?",
    );
  }
  if (/^\s*var G\s*=\s*\{\s*\}/.test(commonJs)) {
    throw new Error(
      "refusing website common_functions.js that resets window.G",
    );
  }
  const parts = [kitHeader(), commonJs, "\n"];
  for (let i = 0; i < HTML_FNS.length; i++) {
    parts.push(extractFunction(htmlJs, HTML_FNS[i]));
    parts.push("\n");
  }
  const kit = parts.join("");
  if (
    !kit.includes("function sprite(") ||
    !kit.includes("function item_container(")
  ) {
    throw new Error("client-kit missing sprite or item_container");
  }
  return kit;
}

async function syncOne(rel, urlPath, force) {
  const dest = cachePath(rel);
  if (!force && existsSync(dest)) return { rel, bytes: statSync(dest).size, cached: true };
  const buf = await fetchBuffer(urlPath);
  writeFileEnsured(dest, buf);
  return { rel, bytes: buf.length, cached: false };
}

export async function syncOverlayCache(opts) {
  const force = !!(opts && opts.force);
  mkdirSync(CACHE_DIR, { recursive: true });
  const files = [];
  files.push(await syncOne(REL.data, "/data.js", force));
  files.push(await syncOne(REL.common, "/js/old_common_functions.js", force));
  files.push(await syncOne(REL.html, "/js/html.js", force));
  files.push(await syncOne(REL.font, "/css/fonts/m5x7.ttf", force));

  const kitPath = cachePath(REL.kit);
  if (force || !existsSync(kitPath)) {
    const commonJs = readFileSync(cachePath(REL.common), "utf8");
    const htmlJs = readFileSync(cachePath(REL.html), "utf8");
    const kit = buildClientKit(commonJs, htmlJs);
    writeFileEnsured(kitPath, kit);
    files.push({ rel: REL.kit, bytes: Buffer.byteLength(kit), cached: false });
  } else {
    files.push({
      rel: REL.kit,
      bytes: statSync(kitPath).size,
      cached: true,
    });
  }

  const manifest = {
    origin: ORIGIN,
    fetchedAt: new Date().toISOString(),
    files,
  };
  writeFileEnsured(cachePath(REL.manifest), JSON.stringify(manifest, null, 2));
  return manifest;
}

export function ensureOverlayCache(opts) {
  const force = !!(opts && opts.force);
  if (!force && isCacheReady()) {
    return Promise.resolve(readManifest() || { ready: true });
  }
  if (inflight) return inflight;
  inflight = syncOverlayCache({ force }).finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function handleOverlayAsset(res, pathname, search) {
  if (!isAllowedAssetPath(pathname)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("asset path not allowed\n");
    return;
  }
  const rel = assetCacheRel(pathname);
  const disk = cachePath(rel);
  if (existsSync(disk)) {
    sendDiskFile(res, disk, { cacheable: true });
    return;
  }
  const url = ORIGIN + pathname + (search || "");
  try {
    const fetched = await fetch(url, {
      headers: { "User-Agent": "enhance-comm-ui-overlay-cache" },
      signal: AbortSignal.timeout(60000),
    });
    if (!fetched.ok) {
      res.writeHead(fetched.status, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("upstream " + fetched.status + "\n");
      return;
    }
    const buf = Buffer.from(await fetched.arrayBuffer());
    writeFileEnsured(disk, buf);
    sendDiskFile(res, disk, { cacheable: true });
  } catch (err) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("asset fetch failed: " + (err && err.message) + "\n");
  }
}
