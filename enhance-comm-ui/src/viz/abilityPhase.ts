/**
 * Ability CD phase for map rings — ms ticks down on entity.s[ability].ms.
 * Just-fired flash: brief solid ring after a CD reset (client-visible only).
 */

export const IMMINENT_RATIO = 0.15;
export const JUST_FIRED_MS = 350;

export type AbilityCdPhase = "hidden" | "ghost" | "imminent" | "flash";

const lastMsByKey = new Map<string, number>();
const flashUntilByKey = new Map<string, number>();

function nowMs(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

/** Test / HMR helper. */
export function resetAbilityFlashWatches(): void {
  lastMsByKey.clear();
  flashUntilByKey.clear();
}

/**
 * Track CD resets (ms jumps from near-zero to a large value) → brief flash.
 * `watchKey` should be entityId:abilityId.
 */
export function noteAbilityMsForFlash(
  watchKey: string,
  ms: number,
  cooldown: number,
): boolean {
  const now = nowMs();
  const prev = lastMsByKey.get(watchKey);
  lastMsByKey.set(watchKey, ms);
  if (
    prev != null &&
    prev < Math.min(800, cooldown * 0.08) &&
    ms > cooldown * 0.4
  ) {
    flashUntilByKey.set(watchKey, now + JUST_FIRED_MS);
  }
  const until = flashUntilByKey.get(watchKey);
  if (until != null && until > now) return true;
  if (until != null && until <= now) flashUntilByKey.delete(watchKey);
  return false;
}

export function abilityCdPhase(
  ms: number,
  cooldown: number,
  opts: { imminent: boolean; ghost: boolean; flash?: boolean },
): AbilityCdPhase {
  if (opts.flash) return "flash";
  if (!(cooldown > 0) || !(ms > 0)) return "hidden";
  const ratio = ms / cooldown;
  if (opts.imminent && ratio < IMMINENT_RATIO) return "imminent";
  if (opts.ghost) return "ghost";
  return "hidden";
}

/** Alpha pulse toward end of imminent window (0.5 → 1). */
export function imminentOpacity(ms: number, cooldown: number): number {
  if (!(cooldown > 0) || !(ms > 0)) return 0;
  const windowMs = cooldown * IMMINENT_RATIO;
  if (windowMs <= 0) return 1;
  const t = 1 - Math.min(1, Math.max(0, ms / windowMs));
  return 0.5 + t * 0.5;
}

/** Stable color from ability key → 0xRRGGBB. */
export function colorFromAbilityKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  const sat = 0.55 + ((h >>> 8) % 30) / 100;
  const light = 0.55;
  return hslToRgb(hue / 360, sat, light);
}

function hslToRgb(h: number, s: number, l: number): number {
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return (
    (Math.round(r * 255) << 16) |
    (Math.round(g * 255) << 8) |
    Math.round(b * 255)
  );
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}
