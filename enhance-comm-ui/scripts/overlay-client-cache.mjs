/**
 * Overlay preview cache: live adventure.land data.js, stock client functions,
 * fonts, and /images|/css assets. All of this lives under dev/overlay/cache/
 * (gitignored) — the overlay is a simulation harness, not a game dump in git.
 *
 * Stock host scripts (PIXI/game.js/…) come from adventureland_mongodb
 * `upstream/main` via `git show` — never the local worktree (personal branches
 * / dirty checkouts). Override with ECU_AL_MONGODB_REF; opt into worktree with
 * ECU_AL_MONGODB_WORKDIR=1. Falls back to https://adventure.land.
 */

import { execFileSync } from "node:child_process";
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
  // Stock /comm client stack (real PIXI + game.js — not FakePIXI).
  jquery: "js/jquery/jquery-3.2.0.min.js",
  pixi: "js/pixi/4.8.2-roundpixels/pixi.min.js",
  pixiLayers: "js/pixi-layers/0.1.7.2/pixi-layers.js",
  pixiFilters: "js/pixi-filters/2.6.0c0/pixi-filters.js",
  bowser: "js/libraries/bowser/bowser.16.08.16.js",
  functions: "js/functions.js",
  generatedZones: "js/generated_zones.js",
  eventSchedule: "js/event_schedule.js",
  witchCipher: "js/witch_cipher.js",
  entityAnimations: "js/entity_animations.js",
  game: "js/game.js",
  pixelFonts: "js/pixel_fonts.js",
};

/** Paths copied/fetched for the stock host (relative to cache + adventure.land). */
export const STOCK_HOST_RELS = [
  REL.jquery,
  REL.pixi,
  REL.pixiLayers,
  REL.pixiFilters,
  REL.bowser,
  REL.common,
  REL.functions,
  REL.generatedZones,
  REL.eventSchedule,
  REL.witchCipher,
  REL.entityAnimations,
  REL.game,
  REL.html,
  REL.pixelFonts,
];

/** Sibling adventureland_mongodb (or ECU_AL_MONGODB) for offline stock sync. */
export function resolveMongodbRoot() {
  if (process.env.ECU_AL_MONGODB) return resolve(process.env.ECU_AL_MONGODB);
  return resolve(ROOT, "..", "..", "adventureland_mongodb");
}

/** Git ref for stock host files. Default: upstream main (kaansoral), not HEAD. */
export function resolveMongodbGitRef() {
  const fromEnv = process.env.ECU_AL_MONGODB_REF;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return "upstream/main";
}

/** True only when ECU_AL_MONGODB_WORKDIR=1 — copy dirty personal checkouts. */
export function allowMongodbWorktree() {
  const v = String(process.env.ECU_AL_MONGODB_WORKDIR || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Read a file from adventureland_mongodb at the pinned git ref (no worktree).
 * @returns {{ buf: Buffer, sha: string, ref: string } | null}
 */
export function readMongodbGitFile(rel) {
  const root = resolveMongodbRoot();
  if (!existsSync(root)) return null;
  const ref = resolveMongodbGitRef();
  const gitPath = rel.replace(/\\/g, "/");
  try {
    const sha = execFileSync("git", ["-C", root, "rev-parse", ref], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const buf = execFileSync("git", ["-C", root, "show", `${ref}:${gitPath}`], {
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { buf: Buffer.from(buf), sha, ref };
  } catch {
    return null;
  }
}

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
  return (
    n.startsWith("/images/") ||
    n.startsWith("/css/") ||
    n.startsWith("/js/")
  );
}

export function assetCacheRel(pathname) {
  if (!isAllowedAssetPath(pathname)) return null;
  const n = decodeURIComponent(pathname).replace(/\\/g, "/");
  return n.replace(/^\//, "");
}

export function isStockHostReady() {
  for (let i = 0; i < STOCK_HOST_RELS.length; i++) {
    if (!existsSync(cachePath(STOCK_HOST_RELS[i]))) return false;
  }
  return true;
}

export function isCacheReady() {
  return (
    existsSync(cachePath(REL.data)) &&
    existsSync(cachePath(REL.kit)) &&
    isStockHostReady()
  );
}

async function syncStockOne(rel, force) {
  const dest = cachePath(rel);
  if (!force && existsSync(dest)) {
    return { rel, bytes: statSync(dest).size, cached: true, source: "cache" };
  }
  // Prefer git ref (upstream/main) — never a dirty personal worktree by default.
  const fromGit = readMongodbGitFile(rel);
  if (fromGit) {
    writeFileEnsured(dest, fromGit.buf);
    return {
      rel,
      bytes: fromGit.buf.length,
      cached: false,
      source: "mongodb-git",
      ref: fromGit.ref,
      sha: fromGit.sha,
    };
  }
  if (allowMongodbWorktree()) {
    const local = resolve(resolveMongodbRoot(), rel);
    if (existsSync(local)) {
      const buf = readFileSync(local);
      writeFileEnsured(dest, buf);
      return { rel, bytes: buf.length, cached: false, source: "mongodb-workdir" };
    }
  }
  const fetched = await syncOne(rel, "/" + rel.replace(/\\/g, "/"), true);
  return { ...fetched, source: "origin" };
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
    mongodbRef: (manifest && manifest.mongodbRef) || resolveMongodbGitRef(),
    mongodbSha: manifest && manifest.mongodbSha,
    mongodbWorktree: !!(manifest && manifest.mongodbWorktree),
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
  for (let i = 0; i < STOCK_HOST_RELS.length; i++) {
    files.push(await syncStockOne(STOCK_HOST_RELS[i], force));
  }

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

  const mongodbRef = resolveMongodbGitRef();
  let mongodbSha = null;
  try {
    mongodbSha = execFileSync(
      "git",
      ["-C", resolveMongodbRoot(), "rev-parse", mongodbRef],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch {
    mongodbSha = null;
  }
  const manifest = {
    origin: ORIGIN,
    mongodbRoot: resolveMongodbRoot(),
    mongodbRef,
    mongodbSha,
    mongodbWorktree: allowMongodbWorktree(),
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
