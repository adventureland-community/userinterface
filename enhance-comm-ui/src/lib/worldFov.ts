/**
 * Camera FOV zoom without touching stock PIXI `scale`.
 *
 * Stock FOV ≈ width/(2×scale). Keep `scale` fixed and grow/shrink the logical
 * renderer (`window.width`/`height`), then CSS-fit the canvas to the window so
 * UI chrome stays the same size.
 *
 * fov=1 → stock. fov>1 → zoomed out (see more). fov<1 → zoomed in.
 *
 * CSS-fitting softens linear-filtered PIXI.Text; nameplateSharpness raises
 * text resolution and forces NEAREST so glyphs stay crisp like sprites.
 */

export const WORLD_FOV_MIN = 0.5;
/** Wide zoom-out — phone needs more headroom than desktop; buffer grows with FOV. */
export const WORLD_FOV_MAX = 6;
export const WORLD_FOV_DEFAULT = 1;
/** Discrete steps for wheel / Map chip / pinch. */
export const WORLD_FOV_STEP = 0.25;

let appliedFov = WORLD_FOV_DEFAULT;

type FovListener = (fov: number) => void;
const fovApplyListeners: FovListener[] = [];

/** Notify when FOV actually changes the buffer (nameplates should rebuild). */
export function onWorldFovApplied(listener: FovListener): () => void {
  fovApplyListeners.push(listener);
  return () => {
    const idx = fovApplyListeners.indexOf(listener);
    if (idx >= 0) fovApplyListeners.splice(idx, 1);
  };
}

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
  let w =
    typeof window !== "undefined" &&
    typeof window.innerWidth === "number" &&
    window.innerWidth > 0
      ? Math.round(window.innerWidth)
      : 1280;
  let h =
    typeof window !== "undefined" &&
    typeof window.innerHeight === "number" &&
    window.innerHeight > 0
      ? Math.round(window.innerHeight)
      : 720;
  // Fullscreen on mobile often updates visualViewport before (or without)
  // window.inner* — take the larger so the canvas grows into the new space.
  // Soft-keyboard shrinks vv while inner stays: max keeps the world full-bleed
  // (chrome lifts via --ecu-vv-keyboard instead).
  if (typeof window !== "undefined") {
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      w = Math.max(w, Math.round(vv.width));
      h = Math.max(h, Math.round(vv.height));
    }
  }
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

/**
 * Keep the world point under a CSS-canvas cursor stable across an FOV resize.
 * Logical size grows with FOV (`width ≈ cssW × fov`); stock centers `map.real_*`
 * on the buffer. Without this, zoom feels like a pan away from the pointer.
 *
 * `fracX` / `fracY` are 0..1 over the fitted canvas (0.5 = center).
 */
export function cameraRealAfterFovTowardCursor(opts: {
  realX: number;
  realY: number;
  scale: number;
  widthBefore: number;
  heightBefore: number;
  widthAfter: number;
  heightAfter: number;
  fracX: number;
  fracY: number;
}): { x: number; y: number } {
  const s =
    typeof opts.scale === "number" && opts.scale > 0 ? opts.scale : 1;
  const fx =
    typeof opts.fracX === "number" && Number.isFinite(opts.fracX)
      ? opts.fracX
      : 0.5;
  const fy =
    typeof opts.fracY === "number" && Number.isFinite(opts.fracY)
      ? opts.fracY
      : 0.5;
  const w0 = Math.max(1, opts.widthBefore);
  const h0 = Math.max(1, opts.heightBefore);
  const w1 = Math.max(1, opts.widthAfter);
  const h1 = Math.max(1, opts.heightAfter);
  // world under cursor before = real + (frac - 0.5) * size / scale
  // solve newReal so the same world stays under the cursor after resize
  return {
    x: opts.realX + ((fx - 0.5) * (w0 - w1)) / s,
    y: opts.realY + ((fy - 0.5) * (h0 - h1)) / s,
  };
}

type HostMap = { last_max_y?: number; last_max_x?: number };

/**
 * CSS-fit the PIXI view to the window. Only used when FOV ≠ 1.
 * Zoom-out (FOV>1): pixelated so sprites stay nearest-crisp while CSS shrinks.
 * Zoom-in (FOV<1): auto — pixelated CSS upscale turns nameplate text into noise.
 */
export function fitRendererView(
  cssW: number,
  cssH: number,
  fov?: number,
): void {
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
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov() || 1;
  const pixelated = !(f < 1);
  view.style.imageRendering = pixelated ? "pixelated" : "auto";
  (view.style as CSSStyleDeclaration & { webkitImageRendering?: string })
    .webkitImageRendering = pixelated ? "pixelated" : "auto";
}

/** Clear FOV CSS size overrides (keep pixelated snap). */
export function clearRendererViewFit(): void {
  const renderer = (
    window as Window & {
      renderer?: { view?: HTMLElement | null };
    }
  ).renderer;
  const view = renderer && renderer.view;
  if (!view || !view.style) return;
  view.style.width = "";
  view.style.height = "";
  view.style.maxWidth = "";
  view.style.maxHeight = "";
}

export function applyRendererPixelSnap(): void {
  const renderer = (
    window as Window & {
      renderer?: {
        roundPixels?: boolean;
        view?: HTMLElement | null;
      };
    }
  ).renderer;
  if (!renderer) return;
  renderer.roundPixels = true;
  const view = renderer.view;
  if (!view || !view.style) return;
  view.style.imageRendering = "pixelated";
  (view.style as CSSStyleDeclaration & { webkitImageRendering?: string })
    .webkitImageRendering = "pixelated";
}

/**
 * Apply FOV: set logical width/height, resize PIXI, CSS-fit when ≠ 1.
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

  if (fov === WORLD_FOV_DEFAULT) {
    clearRendererViewFit();
    applyRendererPixelSnap();
  } else {
    fitRendererView(cssW, cssH, fov);
    // Zoom-in uses auto CSS sampling — do not re-stamp pixelated after fit.
    if (!(fov < 1)) applyRendererPixelSnap();
  }

  if (typeof host.position_map === "function") {
    try {
      host.position_map();
    } catch {
      /* ignore */
    }
  }

  if (changed) {
    for (let i = 0; i < fovApplyListeners.length; i++) {
      try {
        fovApplyListeners[i](fov);
      } catch {
        /* ignore */
      }
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

/**
 * Extra PIXI.Text resolution so glyphs stay dense after CSS FOV fit.
 * Zoom-out (f>1): CSS shrinks → densify by f.
 * Zoom-in (f<1): CSS enlarges → densify by 1/f (was wrongly using f and going soft).
 * Cap so phone DPR × extreme FOV does not balloon stroked textures.
 */
export function nameplateTextResolution(fov?: number): number {
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov() || 1;
  const dpr =
    typeof window !== "undefined" &&
    typeof window.devicePixelRatio === "number" &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  const denseness = f >= 1 ? f : 1 / f;
  // Cap 6 — wide phone FOV × boost needs denser glyphs than 4 before CSS shrink.
  return Math.max(1, Math.min(6, Math.ceil(denseness * dpr)));
}
