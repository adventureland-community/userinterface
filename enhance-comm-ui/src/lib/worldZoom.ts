/**
 * World (PIXI map) zoom via Adventure Land's stock `scale` global.
 * Lower scale = more map on screen; higher = closer. Server entity vision
 * stays fixed (`B.vision`) — zoom does not invent entities.
 *
 * Stock seeds scale with parseInt(cookie/URL). Stay on integer steps so the
 * cookie round-trips without truncating 1.25 → 1 (that blacks /hub on refresh
 * while a huge tile set builds).
 */

export const WORLD_ZOOM_MIN = 1;
export const WORLD_ZOOM_MAX = 3;
export const WORLD_ZOOM_DEFAULT = 2;
/** Integer only — matches stock `parseInt(scale)`. */
export const WORLD_ZOOM_STEP = 1;

export function clampWorldZoom(n: number): number {
  if (!Number.isFinite(n)) return WORLD_ZOOM_DEFAULT;
  return Math.max(WORLD_ZOOM_MIN, Math.min(WORLD_ZOOM_MAX, Math.round(n)));
}

/** Value written to the stock `scale` cookie (always an integer string). */
export function cookieScaleValue(zoom: number): string {
  return String(clampWorldZoom(zoom));
}

/** Read current game scale (window.scale), falling back to default. */
export function readHostWorldZoom(): number {
  const raw = (window as Window & { scale?: unknown }).scale;
  const n = typeof raw === "number" ? raw : Number(raw);
  return clampWorldZoom(Number.isFinite(n) && n > 0 ? n : WORLD_ZOOM_DEFAULT);
}

type HostMap = {
  scale?: { x?: number; y?: number; set?: (x: number, y: number) => void };
  last_max_y?: number;
  last_max_x?: number;
};

/**
 * Apply zoom to the stock `scale` global and live `map.scale`.
 * Returns the clamped value actually applied. No-ops (no tile invalidate)
 * when the clamped zoom already matches the host.
 */
export function applyWorldZoom(next: number): number {
  const zoom = clampWorldZoom(next);
  const w = window as Window & {
    scale?: number;
    map?: HostMap;
    PIXI?: {
      Point?: new (x: number, y: number) => { x: number; y: number };
    };
  };
  const changed = readHostWorldZoom() !== zoom;
  w.scale = zoom;
  const map = w.map;
  if (map) {
    if (map.scale && typeof map.scale.set === "function") {
      map.scale.set(zoom, zoom);
    } else if (w.PIXI && typeof w.PIXI.Point === "function") {
      map.scale = new w.PIXI.Point(zoom, zoom);
    } else if (map.scale) {
      map.scale.x = zoom;
      map.scale.y = zoom;
    }
    // Tile rebuild is expensive — only when scale actually changed (wheel floods).
    if (changed) map.last_max_y = undefined;
  }
  return zoom;
}

/** Persist for the next full page load (stock reads cookies.scale via parseInt). */
export function writeWorldZoomCookie(zoom: number): void {
  const v = cookieScaleValue(zoom);
  try {
    const maxAge = 60 * 60 * 24 * 365 * 5;
    document.cookie =
      "scale=" +
      encodeURIComponent(v) +
      "; path=/; max-age=" +
      maxAge +
      "; SameSite=Lax";
  } catch {
    /* ignore */
  }
}

/**
 * If a prior ECU build wrote a fractional cookie ("1.25"), stock parseInt
 * already truncated this page to 1. Rewrite an integer cookie for the next load.
 * Returns the healed integer when a fractional cookie was found.
 */
export function healFractionalScaleCookie(
  preferred: number = WORLD_ZOOM_DEFAULT,
): number | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)scale=([^;]*)/);
    if (!match) return null;
    const raw = decodeURIComponent(match[1] || "");
    if (!raw || !raw.includes(".")) return null;
    const healed = clampWorldZoom(
      Number.isFinite(preferred) ? preferred : WORLD_ZOOM_DEFAULT,
    );
    writeWorldZoomCookie(healed);
    return healed;
  } catch {
    return null;
  }
}

export function nudgeWorldZoom(deltaSteps: number): number {
  const current = readHostWorldZoom();
  return applyWorldZoom(current + deltaSteps * WORLD_ZOOM_STEP);
}
