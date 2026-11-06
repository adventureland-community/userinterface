/**
 * Opt-in FPS cap for stock `window.draw` (PIXI paint loop).
 *
 * Stock schedules `requestAnimationFrame(draw)` with a stable function
 * reference. Replacing `window.draw` alone (especially with `.bind()`) drops
 * us off that chain. We:
 *   1) Keep the exact stock function identity
 *   2) Redirect only that callback through a selective rAF shim
 *   3) Leave every other rAF caller (ECU pan/meters/layout) on native rAF
 *
 * Optional toggles: when-hidden, when-blurred, pause-when-covered.
 */

import {
  GAME_FPS_CAP_OFF,
  detectForeignRafWrapper,
  emptyGameFpsCapBg,
  gameFpsCapIntervalMs,
  gameFpsCapNeedsHook,
  isForcedDrawArgs,
  normalizeGameFpsCap,
  resolveGameFpsDrawPolicy,
  shouldRunDrawFrame,
  type GameFpsCap,
  type GameFpsCapBg,
  type GameFpsCapOptions,
  type GameFpsCapRate,
  type GameFpsDrawPolicy,
} from "../lib/gameFpsCap";
import { getSettings, patchSettings } from "../lib/settings";

type DrawFn = (this: unknown, ...args: unknown[]) => unknown;

type CapWindow = Window & {
  draw?: DrawFn;
  game_loaded?: boolean;
  renderer?: { view?: HTMLElement | null };
  __ecuGameFpsCapInstalled?: boolean;
  __ecuSetGameFpsCap?: (cap: unknown) => GameFpsCap;
  __ecuSetGameFpsCapOptions?: (
    partial: Partial<GameFpsCapOptions>,
  ) => GameFpsCapOptions;
  __ecuGetGameFpsCap?: () => GameFpsCap;
  __ecuGameFpsCapStats?: () => GameFpsCapStats;
  __ecuResetGameFpsCapStats?: () => void;
  __ecuSetGameFpsCapBgForTests?: (bg: Partial<GameFpsCapBg> | null) => void;
  __raf_orig?: unknown;
};

export type GameFpsCapStats = {
  cap: GameFpsCap;
  whenHidden: boolean;
  whenBlurred: boolean;
  pauseWhenCovered: boolean;
  rate: GameFpsCapRate;
  paused: boolean;
  reason: string;
  runs: number;
  skips: number;
  forced: number;
  /** Rolling paint rate from the last ~1s of run timestamps. */
  fps: number;
  bg: GameFpsCapBg;
  foreignRaf: boolean;
  foreignRafHint: string | null;
};

const WRAP_MARK = "__ecuGameFpsCapWrap";
const FPS_WINDOW_MS = 1000;

let installed = false;
/** Exact function the game loop schedules — never .bind(). */
let stockDraw: DrawFn | null = null;
let currentOpts: GameFpsCapOptions = {
  cap: GAME_FPS_CAP_OFF,
  whenHidden: false,
  whenBlurred: false,
  pauseWhenCovered: false,
};
let nextDueMs = 0;
let skipScheduled = false;
let pollId: ReturnType<typeof setInterval> | null = null;
let reassertId: ReturnType<typeof setInterval> | null = null;
let statsRuns = 0;
let statsSkips = 0;
let statsForced = 0;
const runTimestamps: number[] = [];
let rafPatched = false;
let nativeRaf: ((cb: FrameRequestCallback) => number) | null = null;
let nativeRafRaw: typeof window.requestAnimationFrame | null = null;
let nativeCancelRaw: typeof window.cancelAnimationFrame | null = null;

let bgState: GameFpsCapBg = emptyGameFpsCapBg();
/** Test override — when set, replaces live bg sensors. */
let bgOverride: Partial<GameFpsCapBg> | null = null;
let windowBlurred = false;
let canvasCovered = false;
let coverObserver: IntersectionObserver | null = null;
let foreignRaf = false;
let foreignRafHint: string | null = null;

function host(): CapWindow {
  return window as CapWindow;
}

function nowMs(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function liveBg(): GameFpsCapBg {
  const hidden = typeof document !== "undefined" && !!document.hidden;
  const base: GameFpsCapBg = {
    hidden,
    blurred: windowBlurred && !hidden,
    covered: canvasCovered,
  };
  if (!bgOverride) return base;
  return {
    hidden: bgOverride.hidden != null ? bgOverride.hidden : base.hidden,
    blurred: bgOverride.blurred != null ? bgOverride.blurred : base.blurred,
    covered: bgOverride.covered != null ? bgOverride.covered : base.covered,
  };
}

function readOptsFromSettings(): GameFpsCapOptions {
  const s = getSettings();
  return {
    cap: normalizeGameFpsCap(s.gameFpsCap),
    whenHidden: !!s.gameFpsCapWhenHidden,
    whenBlurred: !!s.gameFpsCapWhenBlurred,
    pauseWhenCovered: !!s.gameFpsPauseWhenCovered,
  };
}

function syncOptsFromSettings(): void {
  currentOpts = readOptsFromSettings();
}

function currentPolicy(): GameFpsDrawPolicy {
  bgState = liveBg();
  return resolveGameFpsDrawPolicy(currentOpts, bgState);
}

function effectiveRate(): GameFpsCapRate {
  return currentPolicy().rate;
}

function noteRun(ts: number): void {
  runTimestamps.push(ts);
  const cut = ts - FPS_WINDOW_MS;
  while (runTimestamps.length && runTimestamps[0] < cut) {
    runTimestamps.shift();
  }
}

function rollingFps(): number {
  if (runTimestamps.length < 2) {
    return runTimestamps.length > 0 ? runTimestamps.length : 0;
  }
  const first = runTimestamps[0];
  const last = runTimestamps[runTimestamps.length - 1];
  const span = last - first;
  if (!(span > 0)) return runTimestamps.length;
  return ((runTimestamps.length - 1) * 1000) / span;
}

function isOurWrap(fn: unknown): boolean {
  return (
    typeof fn === "function" &&
    !!(fn as { [WRAP_MARK]?: boolean })[WRAP_MARK]
  );
}

function runStockDraw(thisArg: unknown, args: unknown[]): unknown {
  if (!stockDraw) return undefined;
  const forced = isForcedDrawArgs(args);
  const policy = currentPolicy();
  const interval = gameFpsCapIntervalMs(policy.rate);
  const decision = shouldRunDrawFrame({
    nowMs: nowMs(),
    nextDueMs,
    intervalMs: interval,
    forced,
    paused: policy.paused,
  });
  nextDueMs = decision.nextDueMs;
  if (!decision.run) {
    statsSkips += 1;
    scheduleSkipRetry(policy.paused ? 250 : 0);
    return undefined;
  }
  if (!(interval > 0) && !policy.paused) {
    // uncapped path already decided run
  }
  if (forced) statsForced += 1;
  statsRuns += 1;
  noteRun(nowMs());
  return stockDraw.apply(thisArg, args);
}

function scheduleSkipRetry(minDelayMs: number): void {
  if (skipScheduled || !nativeRaf) return;
  skipScheduled = true;
  const fire = () => {
    skipScheduled = false;
    const w = host();
    try {
      runStockDraw(w, []);
    } catch {
      /* stock draw errors are stock's problem */
    }
  };
  if (minDelayMs > 0 && typeof window.setTimeout === "function") {
    window.setTimeout(() => nativeRaf!(fire), minDelayMs);
    return;
  }
  nativeRaf(fire);
}

function wrappedDraw(this: unknown, ...args: unknown[]): unknown {
  return runStockDraw(this, args);
}

(wrappedDraw as { [WRAP_MARK]?: boolean })[WRAP_MARK] = true;

function patchRaf(): void {
  if (rafPatched || typeof window === "undefined") return;
  if (typeof window.requestAnimationFrame !== "function") return;
  nativeRafRaw = window.requestAnimationFrame;
  nativeCancelRaw =
    typeof window.cancelAnimationFrame === "function"
      ? window.cancelAnimationFrame
      : null;
  nativeRaf = nativeRafRaw.bind(window);
  rafPatched = true;
  window.requestAnimationFrame = function ecuFpsCapRaf(
    cb: FrameRequestCallback,
  ): number {
    if (stockDraw && typeof cb === "function" && cb === stockDraw) {
      return nativeRaf!(function ecuFpsCapTick(time: number) {
        void time;
        runStockDraw(host(), []);
      });
    }
    return nativeRaf!(cb);
  } as typeof window.requestAnimationFrame;
}

function unpatchRaf(): void {
  if (!rafPatched || !nativeRafRaw) return;
  window.requestAnimationFrame = nativeRafRaw;
  if (nativeCancelRaw) window.cancelAnimationFrame = nativeCancelRaw;
  rafPatched = false;
  nativeRaf = null;
  nativeRafRaw = null;
  nativeCancelRaw = null;
  skipScheduled = false;
}

function captureStockIfNeeded(w: CapWindow): boolean {
  if (typeof w.draw !== "function") return false;
  if (isOurWrap(w.draw)) return !!stockDraw;
  if (!stockDraw) stockDraw = w.draw;
  return true;
}

function needsCap(): boolean {
  return gameFpsCapNeedsHook(currentOpts);
}

function applyCap(w: CapWindow): void {
  if (!needsCap()) {
    unpatchRaf();
    if (isOurWrap(w.draw) && stockDraw) w.draw = stockDraw;
    nextDueMs = 0;
    skipScheduled = false;
    return;
  }
  if (!captureStockIfNeeded(w)) return;
  patchRaf();
  if (!isOurWrap(w.draw)) w.draw = wrappedDraw;
}

function refreshPolicyPhase(): void {
  nextDueMs = 0;
  applyCap(host());
  if (needsCap()) ensureCoverObserver();
  if (needsCap() && nativeRaf && !skipScheduled) {
    scheduleSkipRetry(0);
  }
}

function onFocus(): void {
  windowBlurred = false;
  refreshPolicyPhase();
}

function onBlur(): void {
  windowBlurred = true;
  refreshPolicyPhase();
}

function onVisibility(): void {
  refreshPolicyPhase();
}

function findGameCanvas(): Element | null {
  const w = host();
  const view = w.renderer && w.renderer.view;
  if (view && typeof (view as HTMLElement).getBoundingClientRect === "function") {
    return view as HTMLElement;
  }
  if (typeof document === "undefined") return null;
  return document.querySelector("canvas");
}

function ensureCoverObserver(): void {
  if (coverObserver || typeof IntersectionObserver !== "function") return;
  const canvas = findGameCanvas();
  if (!canvas) return;
  coverObserver = new IntersectionObserver(
    (entries) => {
      let covered = true;
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].intersectionRatio > 0.02) {
          covered = false;
          break;
        }
      }
      if (covered === canvasCovered) return;
      canvasCovered = covered;
      refreshPolicyPhase();
    },
    { threshold: [0, 0.02, 0.1, 1] },
  );
  coverObserver.observe(canvas);
}

function scanForeignRaf(): void {
  const w = host();
  if (w.__raf_orig) {
    foreignRaf = true;
    foreignRafHint =
      "Another script saved __raf_orig (startup FPS cap). ECU uses a draw-only shim — disable one to avoid stacking.";
    return;
  }
  if (typeof window === "undefined") return;
  // Before we patch: check native. After we patch: check if our restore target
  // was already non-native when first installed.
  const raf = rafPatched && nativeRafRaw ? nativeRafRaw : window.requestAnimationFrame;
  if (detectForeignRafWrapper(raf)) {
    foreignRaf = true;
    foreignRafHint =
      "requestAnimationFrame is already wrapped. ECU still caps stock draw only; expect odd timing if another limiter is active.";
    return;
  }
  foreignRaf = false;
  foreignRafHint = null;
}

/** Apply a fixed cap (0 = off). Safe to call before draw exists. */
export function setGameFpsCap(
  raw: unknown,
  opts?: { persist?: boolean },
): GameFpsCap {
  return setGameFpsCapOptions({ cap: normalizeGameFpsCap(raw) }, opts).cap;
}

/** Apply any subset of FPS-cap prefs (fixed rate + independent toggles). */
export function setGameFpsCapOptions(
  partial: Partial<GameFpsCapOptions>,
  opts?: { persist?: boolean },
): GameFpsCapOptions {
  const next: GameFpsCapOptions = { ...currentOpts };
  if (partial.cap != null) next.cap = normalizeGameFpsCap(partial.cap);
  if (typeof partial.whenHidden === "boolean") {
    next.whenHidden = partial.whenHidden;
  }
  if (typeof partial.whenBlurred === "boolean") {
    next.whenBlurred = partial.whenBlurred;
  }
  if (typeof partial.pauseWhenCovered === "boolean") {
    next.pauseWhenCovered = partial.pauseWhenCovered;
  }
  currentOpts = next;
  const w = host();
  if (typeof w.draw === "function") applyCap(w);
  if (needsCap()) ensureCoverObserver();
  if (opts?.persist !== false) {
    const patch: {
      gameFpsCap?: GameFpsCap;
      gameFpsCapWhenHidden?: boolean;
      gameFpsCapWhenBlurred?: boolean;
      gameFpsPauseWhenCovered?: boolean;
    } = {};
    if (partial.cap != null) patch.gameFpsCap = next.cap;
    if (typeof partial.whenHidden === "boolean") {
      patch.gameFpsCapWhenHidden = next.whenHidden;
    }
    if (typeof partial.whenBlurred === "boolean") {
      patch.gameFpsCapWhenBlurred = next.whenBlurred;
    }
    if (typeof partial.pauseWhenCovered === "boolean") {
      patch.gameFpsPauseWhenCovered = next.pauseWhenCovered;
    }
    if (Object.keys(patch).length) patchSettings(patch);
  } else {
    refreshPolicyPhase();
  }
  return { ...currentOpts };
}

export function getGameFpsCap(): GameFpsCap {
  return currentOpts.cap;
}

export function getGameFpsCapStats(): GameFpsCapStats {
  const policy = currentPolicy();
  return {
    cap: currentOpts.cap,
    whenHidden: currentOpts.whenHidden,
    whenBlurred: currentOpts.whenBlurred,
    pauseWhenCovered: currentOpts.pauseWhenCovered,
    rate: policy.rate,
    paused: policy.paused,
    reason: policy.reason,
    runs: statsRuns,
    skips: statsSkips,
    forced: statsForced,
    fps: rollingFps(),
    bg: { ...bgState },
    foreignRaf,
    foreignRafHint,
  };
}

export function resetGameFpsCapStats(): void {
  statsRuns = 0;
  statsSkips = 0;
  statsForced = 0;
  runTimestamps.length = 0;
}

function onSettingsEvent(ev: Event): void {
  const detail = (ev as CustomEvent).detail;
  if (!detail || typeof detail !== "object") return;
  const d = detail as Record<string, unknown>;
  if (
    !("gameFpsCap" in d) &&
    !("gameFpsCapWhenHidden" in d) &&
    !("gameFpsCapWhenBlurred" in d) &&
    !("gameFpsPauseWhenCovered" in d)
  ) {
    return;
  }
  // UI path: cache already patched. Harness may send detail without
  // going through patchSettings — overlay those fields onto live opts.
  syncOptsFromSettings();
  if ("gameFpsCap" in d) {
    currentOpts = {
      ...currentOpts,
      cap: normalizeGameFpsCap(d.gameFpsCap),
    };
  }
  if (typeof d.gameFpsCapWhenHidden === "boolean") {
    currentOpts = { ...currentOpts, whenHidden: d.gameFpsCapWhenHidden };
  }
  if (typeof d.gameFpsCapWhenBlurred === "boolean") {
    currentOpts = { ...currentOpts, whenBlurred: d.gameFpsCapWhenBlurred };
  }
  if (typeof d.gameFpsPauseWhenCovered === "boolean") {
    currentOpts = {
      ...currentOpts,
      pauseWhenCovered: d.gameFpsPauseWhenCovered,
    };
  }
  refreshPolicyPhase();
}

function tryBindDraw(): boolean {
  const w = host();
  if (typeof w.draw !== "function") return false;
  applyCap(w);
  if (needsCap()) ensureCoverObserver();
  return true;
}

function reassertWrap(): void {
  if (!needsCap()) return;
  const w = host();
  if (typeof w.draw !== "function") return;
  if (!isOurWrap(w.draw) || !rafPatched) applyCap(w);
  ensureCoverObserver();
}

/**
 * Install once: bind draw when ready, listen for Settings → gameFpsCap.
 */
export function installGameFpsCap(): void {
  if (installed) return;
  installed = true;
  const w = host();
  w.__ecuGameFpsCapInstalled = true;
  w.__ecuSetGameFpsCap = (cap) => setGameFpsCap(cap);
  w.__ecuSetGameFpsCapOptions = (partial) => setGameFpsCapOptions(partial);
  w.__ecuGetGameFpsCap = getGameFpsCap;
  w.__ecuGameFpsCapStats = getGameFpsCapStats;
  w.__ecuResetGameFpsCapStats = resetGameFpsCapStats;
  w.__ecuSetGameFpsCapBgForTests = (bg) => {
    bgOverride = bg;
    refreshPolicyPhase();
  };
  syncOptsFromSettings();
  scanForeignRaf();

  if (typeof window !== "undefined") {
    window.addEventListener("ecu:settings", onSettingsEvent);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    // document.hasFocus is the initial truth when install races load.
    windowBlurred =
      typeof document !== "undefined" &&
      typeof document.hasFocus === "function"
        ? !document.hasFocus()
        : false;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  reassertId = window.setInterval(reassertWrap, 2000);

  if (tryBindDraw()) {
    scanForeignRaf();
    return;
  }

  const started = Date.now();
  pollId = window.setInterval(() => {
    if (tryBindDraw() || Date.now() - started > 60000) {
      if (pollId != null) {
        window.clearInterval(pollId);
        pollId = null;
      }
      scanForeignRaf();
    }
  }, 250);
}

/** Test / harness reset. */
export function __resetGameFpsCapForTests(): void {
  const w = host();
  unpatchRaf();
  if (isOurWrap(w.draw) && stockDraw) w.draw = stockDraw;
  stockDraw = null;
  currentOpts = {
    cap: GAME_FPS_CAP_OFF,
    whenHidden: false,
    whenBlurred: false,
    pauseWhenCovered: false,
  };
  nextDueMs = 0;
  skipScheduled = false;
  installed = false;
  resetGameFpsCapStats();
  bgOverride = null;
  windowBlurred = false;
  canvasCovered = false;
  foreignRaf = false;
  foreignRafHint = null;
  if (coverObserver) {
    coverObserver.disconnect();
    coverObserver = null;
  }
  w.__ecuGameFpsCapInstalled = false;
  if (pollId != null) {
    window.clearInterval(pollId);
    pollId = null;
  }
  if (reassertId != null) {
    window.clearInterval(reassertId);
    reassertId = null;
  }
}
