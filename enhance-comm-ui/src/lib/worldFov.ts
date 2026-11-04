/**
 * Camera FOV zoom without touching stock PIXI `scale`.
 *
 * Stock FOV ≈ width/(2×scale). We keep `scale` fixed and grow/shrink the
 * logical renderer (`window.width`/`height`) so more or less map fits, then
 * CSS-fit the canvas to the real window so UI chrome stays the same size.
 *
 * fov=1 → stock. fov>1 → zoomed out (see more). fov<1 → zoomed in.
 */

export const WORLD_FOV_MIN = 0.5;
export const WORLD_FOV_MAX = 2.5;
export const WORLD_FOV_DEFAULT = 1;
/** Discrete steps for wheel / Map chip / pinch. */
export const WORLD_FOV_STEP = 0.25;

let appliedFov = WORLD_FOV_DEFAULT;

export function clampWorldFov(n: number): number {
  if (!Number.isFinite(n)) return WORLD_FOV_DEFAULT;
  const stepped = Math.round(n / WORLD_FOV_STEP) * WORLD_FOV_STEP;
  return Math.max(
    WORLD_FOV_MIN,
    Math.min(WORLD_FOV_MAX, Math.round(stepped * 100) / 100),
  );
}

export function readAppliedWorldFov(): number {
  return appliedFov;
}

/** CSS viewport size the canvas should cover (UI / window). */
export function readWindowCssSize(): { w: number; h: number } {
  const w =
    typeof window !== "undefined" &&
    typeof window.innerWidth === "number" &&
    window.innerWidth > 0
      ? Math.round(window.innerWidth)
      : 1280;
  const h =
    typeof window !== "undefined" &&
    typeof window.innerHeight === "number" &&
    window.innerHeight > 0
      ? Math.round(window.innerHeight)
      : 720;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export function logicalSizeForFov(
  cssW: number,
  cssH: number,
  fov: number,
): { w: number; h: number } {
  const f = clampWorldFov(fov);
  return {
    w: Math.max(1, Math.round(cssW * f)),
    h: Math.max(1, Math.round(cssH * f)),
  };
}

type HostMap = { last_max_y?: number; last_max_x?: number };

function fitRendererView(cssW: number, cssH: number): void {
  const renderer = (
    window as Window & {
      renderer?: { view?: HTMLElement | null };
    }
  ).renderer;
  const view = renderer && renderer.view;
  if (!view || !view.style) return;
  view.style.width = cssW + "px";
  view.style.height = cssH + "px";
  view.style.maxWidth = "100%";
  view.style.maxHeight = "100%";
  view.style.display = "block";
}

/**
 * Apply FOV: set logical width/height, resize PIXI, CSS-fit canvas.
 * Does not mutate `window.scale` / `map.scale`.
 */
export function applyWorldFov(next: number): number {
  const fov = clampWorldFov(next);
  const { w: cssW, h: cssH } = readWindowCssSize();
  const logical = logicalSizeForFov(cssW, cssH, fov);
  const host = window as Window & {
    width?: number;
    height?: number;
    map?: HostMap;
    renderer?: { resize?: (w: number, h: number) => void };
    position_map?: () => void;
  };

  const changed =
    appliedFov !== fov ||
    host.width !== logical.w ||
    host.height !== logical.h;

  appliedFov = fov;
  host.width = logical.w;
  host.height = logical.h;

  if (host.renderer && typeof host.renderer.resize === "function") {
    host.renderer.resize(logical.w, logical.h);
  }
  if (changed && host.map) {
    host.map.last_max_y = undefined;
  }
  fitRendererView(cssW, cssH);

  if (typeof host.position_map === "function") {
    try {
      host.position_map();
    } catch {
      /* ignore */
    }
  }
  return fov;
}

export function nudgeWorldFov(deltaSteps: number): number {
  return applyWorldFov(appliedFov + deltaSteps * WORLD_FOV_STEP);
}

/** Format for Map chip — e.g. 1 → "1", 1.25 → "1.25". */
export function formatWorldFov(fov: number): string {
  const v = clampWorldFov(fov);
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
}
