/**
 * Debounced tsup rebuild + root sync.
 * Ignores fs thrash during a build; coalesces to at most one follow-up.
 */

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEBOUNCE_MS = Number(process.env.ECU_WATCH_DEBOUNCE_MS || 1200);

let timer = null;
let building = false;
let pending = false;
let generation = 0;
let lastChangeLogAt = 0;
let dirtyDuringBuild = false;

function run(commandLine) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(commandLine, {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`killed by ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`exit ${code}`));
        return;
      }
      resolvePromise();
    });
  });
}

async function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  dirtyDuringBuild = false;
  pending = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const id = ++generation;
  const started = Date.now();
  console.log(`[ecu-watch] build #${id}…`);
  try {
    await run("npx tsc --noEmit");
    await run("node scripts/clean-dist.mjs");
    await run("npx tsup");
    await run("node scripts/sync-root.mjs");
    console.log(`[ecu-watch] build #${id} ok (${Date.now() - started}ms)`);
  } catch (err) {
    console.error(`[ecu-watch] build #${id} failed:`, err.message || err);
  } finally {
    building = false;
    // Only rebuild again if something changed while we were busy.
    if (pending || dirtyDuringBuild) {
      pending = false;
      dirtyDuringBuild = false;
      console.log(
        `[ecu-watch] coalescing follow-up build in ${DEBOUNCE_MS}ms…`,
      );
      schedule(null);
    }
  }
}

function schedule(reason) {
  if (reason) {
    const now = Date.now();
    // Don't spam: one change log per debounce window.
    if (now - lastChangeLogAt > DEBOUNCE_MS) {
      console.log(`[ecu-watch] change: ${reason}`);
      lastChangeLogAt = now;
    }
  }
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    build();
  }, DEBOUNCE_MS);
}

function onSrcChange(filename) {
  const name = filename ? String(filename).replace(/\\/g, "/") : "(src)";
  if (name.endsWith("~") || name.includes(".tmp")) return;
  if (name.endsWith(".html")) return;
  if (
    name.includes("/cache/") ||
    name.startsWith("cache/") ||
    name.includes("overlay/cache")
  ) {
    return;
  }

  // While building, only mark dirty — do not re-arm timers (that caused
  // back-to-back rebuilds when the editor wrote the same file mid-build).
  if (building) {
    dirtyDuringBuild = true;
    return;
  }

  schedule(name);
}

const srcDir = resolve(ROOT, "src");
const devDir = resolve(ROOT, "dev");
try {
  watch(srcDir, { recursive: true }, (_event, filename) => {
    onSrcChange(filename);
  });
  watch(devDir, { recursive: true }, (_event, filename) => {
    onSrcChange(filename);
  });
  console.log(`[ecu-watch] watching ${srcDir} + ${devDir} (debounce ${DEBOUNCE_MS}ms)`);
} catch (err) {
  console.error("[ecu-watch] failed to watch src/ or dev/", err);
  process.exit(1);
}

build();
