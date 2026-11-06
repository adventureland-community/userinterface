/**
 * Cap stock Adventure Land `draw()` — not global requestAnimationFrame —
 * so ECU's own rAF (pan, layout, meters) stays uncapped.
 *
 * Pieces are independent prefs: fixed rate, when-hidden, when-blurred,
 * pause-when-covered.
 */

export const GAME_FPS_CAP_OFF = 0;
export const GAME_FPS_CAPS = [0, 30, 60] as const;

export type GameFpsCap = (typeof GAME_FPS_CAPS)[number];

/** Numeric paint ceiling used by the draw wrap (0 = uncapped). */
export type GameFpsCapRate = 0 | 30 | 60;

/** Background rate used by hidden/blur toggles. */
export const GAME_FPS_BG_RATE: GameFpsCapRate = 60;

/** Live background signals that independent toggles can react to. */
export type GameFpsCapBg = {
  /** document.hidden — other tab / minimized */
  hidden: boolean;
  /** window blur — multi-monitor, unfocused but maybe still visible */
  blurred: boolean;
  /** Game canvas not intersecting the viewport (scrolled away / covered) */
  covered: boolean;
};

export type GameFpsCapOptions = {
  cap: GameFpsCap;
  whenHidden: boolean;
  whenBlurred: boolean;
  pauseWhenCovered: boolean;
};

export type GameFpsDrawPolicy = {
  rate: GameFpsCapRate;
  /** Skip paints entirely (keep the rAF chain alive). */
  paused: boolean;
  /** Short label for Settings readout. */
  reason: string;
};

export function normalizeGameFpsCap(raw: unknown): GameFpsCap {
  if (raw === 30 || raw === "30") return 30;
  if (raw === 60 || raw === "60") return 60;
  return GAME_FPS_CAP_OFF;
}

export function gameFpsCapIntervalMs(rate: GameFpsCapRate): number {
  if (rate <= 0) return 0;
  return 1000 / rate;
}

export function gameFpsCapLabel(cap: GameFpsCap): string {
  if (cap === 30) return "30";
  if (cap === 60) return "60";
  return "Off";
}

export function emptyGameFpsCapBg(): GameFpsCapBg {
  return { hidden: false, blurred: false, covered: false };
}

export function defaultGameFpsCapOptions(): GameFpsCapOptions {
  return {
    cap: GAME_FPS_CAP_OFF,
    whenHidden: false,
    whenBlurred: false,
    pauseWhenCovered: false,
  };
}

/** Any experimental draw hook should stay installed. */
export function gameFpsCapNeedsHook(opts: GameFpsCapOptions): boolean {
  return (
    opts.cap !== GAME_FPS_CAP_OFF ||
    opts.whenHidden ||
    opts.whenBlurred ||
    opts.pauseWhenCovered
  );
}

/**
 * Resolve independent prefs + background signals into a draw policy.
 * Priority: covered pause → hidden → blurred → fixed cap → off.
 */
export function resolveGameFpsDrawPolicy(
  opts: GameFpsCapOptions,
  bg: GameFpsCapBg,
): GameFpsDrawPolicy {
  if (opts.pauseWhenCovered && bg.covered) {
    return { rate: 0, paused: true, reason: "covered" };
  }
  if (opts.whenHidden && bg.hidden) {
    return { rate: GAME_FPS_BG_RATE, paused: false, reason: "hidden" };
  }
  if (opts.whenBlurred && bg.blurred) {
    return { rate: GAME_FPS_BG_RATE, paused: false, reason: "blurred" };
  }
  if (opts.cap === 30) return { rate: 30, paused: false, reason: "cap30" };
  if (opts.cap === 60) return { rate: 60, paused: false, reason: "cap60" };
  return { rate: 0, paused: false, reason: "off" };
}

/** @deprecated use resolveGameFpsDrawPolicy */
export function resolveGameFpsCapRate(
  cap: GameFpsCap,
  hidden: boolean,
): GameFpsCapRate {
  return resolveGameFpsDrawPolicy(
    { ...defaultGameFpsCapOptions(), cap, whenHidden: true },
    { hidden, blurred: false, covered: false },
  ).rate;
}

/**
 * Decide whether this draw tick should run stock draw.
 * Forced/manual draws always run. When capped, early frames skip until due.
 */
export function shouldRunDrawFrame(opts: {
  nowMs: number;
  nextDueMs: number;
  intervalMs: number;
  forced: boolean;
  paused?: boolean;
}): { run: boolean; nextDueMs: number } {
  if (opts.forced) {
    return { run: true, nextDueMs: 0 };
  }
  if (opts.paused) {
    return { run: false, nextDueMs: opts.nextDueMs };
  }
  if (!(opts.intervalMs > 0)) {
    return { run: true, nextDueMs: 0 };
  }
  // Small early window so a late rAF still paints instead of skipping a beat.
  if (opts.nowMs < opts.nextDueMs - opts.intervalMs * 0.1) {
    return { run: false, nextDueMs: opts.nextDueMs };
  }
  return {
    run: true,
    nextDueMs: Math.max(opts.nextDueMs + opts.intervalMs, opts.nowMs),
  };
}

/** Stock uses draw(..., true) / draw(true) for forced paints — bypass the cap. */
export function isForcedDrawArgs(args: ArrayLike<unknown>): boolean {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === true) return true;
  }
  return false;
}

/** Native rAF usually stringifies with [native code]. */
export function detectForeignRafWrapper(raf: unknown): boolean {
  if (typeof raf !== "function") return true;
  try {
    const src = Function.prototype.toString.call(raf);
    if (src.indexOf("[native code]") >= 0) return false;
    return true;
  } catch {
    return true;
  }
}

export function formatGameFpsReadout(opts: {
  fps: number;
  policy: GameFpsDrawPolicy;
  foreignRaf: boolean;
}): string {
  const fps = opts.fps > 0 ? Math.round(opts.fps) + " FPS" : "— FPS";
  let mode = "uncapped";
  if (opts.policy.paused) mode = "paused (" + opts.policy.reason + ")";
  else if (opts.policy.rate > 0)
    mode = "cap " + opts.policy.rate + " (" + opts.policy.reason + ")";
  else if (opts.policy.reason === "off") mode = "off";
  const warn = opts.foreignRaf ? " · other FPS script detected" : "";
  return fps + " · " + mode + warn;
}
