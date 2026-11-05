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
 * text resolution. Phone keeps CSS `image-rendering: auto` so soft strokes
 * do not become black salt-and-pepper under pixelated downscale.
 */

import {
  detectViewportProfile,
  type ViewportProfile,
} from "./viewport";

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

/** Fallback when WebGL MAX_TEXTURE_SIZE is unavailable. */
export const WORLD_FOV_DEFAULT_MAX_TEXTURE = 4096;

/**
 * GPU max 2D texture edge. Past this, PIXI/WebGL will not grow the FOV buffer —
 * further zoom-out only shifts the camera (feels like a pan).
 */
export function readMaxTextureSize(): number {
  try {
    const host = window as Window & {
      renderer?: {
        gl?: WebGLRenderingContext | null;
        context?: { gl?: WebGLRenderingContext | null };
      };
    };
    const gl =
      (host.renderer && host.renderer.gl) ||
      (host.renderer &&
        host.renderer.context &&
        host.renderer.context.gl) ||
      null;
    if (gl && typeof gl.getParameter === "function") {
      const n = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (typeof n === "number" && Number.isFinite(n) && n >= 256) {
        return Math.floor(n);
      }
    }
  } catch {
    /* headless / no GL */
  }
  return WORLD_FOV_DEFAULT_MAX_TEXTURE;
}

/**
 * Largest FOV whose logical buffer fits under `maxTex` (with a 1px margin).
 * Stepped down to {@link WORLD_FOV_STEP} so zoom-out stops cleanly.
 */
export function maxWorldFovForWindow(
  cssW: number,
  cssH: number,
  maxTex: number = WORLD_FOV_DEFAULT_MAX_TEXTURE,
): number {
  const w = Math.max(1, cssW);
  const h = Math.max(1, cssH);
  const cap = Math.max(256, Math.floor(maxTex) - 1);
  const raw = Math.min(cap / w, cap / h, WORLD_FOV_MAX);
  if (!(raw > 0) || !Number.isFinite(raw)) return WORLD_FOV_DEFAULT;
  // Never round UP past what the GPU can allocate.
  const stepped = Math.floor(raw / WORLD_FOV_STEP + 1e-9) * WORLD_FOV_STEP;
  return Math.max(
    WORLD_FOV_MIN,
    Math.min(WORLD_FOV_MAX, Math.round(stepped * 100) / 100),
  );
}

/** Clamp + step FOV, then cap to what this window/GPU can actually buffer. */
export function clampWorldFovForDisplay(
  n: number,
  cssW?: number,
  cssH?: number,
  maxTex?: number,
): number {
  const css =
    cssW != null && cssH != null
      ? { w: cssW, h: cssH }
      : typeof window !== "undefined"
        ? readWindowCssSize()
        : { w: 1280, h: 720 };
  const tex = maxTex != null && maxTex > 0 ? maxTex : readMaxTextureSize();
  const maxFov = maxWorldFovForWindow(css.w, css.h, tex);
  return Math.min(clampWorldFov(n), maxFov);
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
  maxTex: number = WORLD_FOV_DEFAULT_MAX_TEXTURE,
): { w: number; h: number } {
  const f = clampWorldFov(fov);
  let w = Math.max(1, Math.round(cssW * f));
  let h = Math.max(1, Math.round(cssH * f));
  const cap = Math.max(256, Math.floor(maxTex) - 1);
  if (w > cap || h > cap) {
    const s = Math.min(cap / w, cap / h);
    w = Math.max(1, Math.floor(w * s));
    h = Math.max(1, Math.floor(h * s));
  }
  return { w, h };
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
 * CSS `image-rendering` for the PIXI view.
 * FOV ≤1: pixelated (auto upscale mush; phone 1× also stays nearest-crisp).
 * Phone zoom-out: auto so soft CSS shrink doesn't salt pixel glyphs.
 * Desktop zoom-out: pixelated for nearest sprites.
 */
export function worldViewImageRendering(
  fov?: number,
  profile?: ViewportProfile,
): "pixelated" | "auto" {
  const p =
    profile ||
    (typeof window !== "undefined" ? detectViewportProfile() : "desktop");
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov() || 1;
  if (f <= 1) return "pixelated";
  if (p === "phone") return "auto";
  return "pixelated";
}

/**
 * CSS-fit the PIXI view to the window. Only used when FOV ≠ 1.
 * See {@link worldViewImageRendering} for sampling mode.
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
  const mode = worldViewImageRendering(f);
  view.style.imageRendering = mode;
  (view.style as CSSStyleDeclaration & { webkitImageRendering?: string })
    .webkitImageRendering = mode;
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
  const mode = worldViewImageRendering(readAppliedWorldFov() || 1);
  view.style.imageRendering = mode;
  (view.style as CSSStyleDeclaration & { webkitImageRendering?: string })
    .webkitImageRendering = mode;
}

/**
 * Apply FOV: set logical width/height, resize PIXI, CSS-fit when ≠ 1.
 * Does not mutate `window.scale` / `map.scale`.
 * Caps FOV/buffer to WebGL MAX_TEXTURE_SIZE so zoom-out cannot “pan” once
 * the GPU refuses a larger canvas.
 */
export function applyWorldFov(next: number): number {
  const { w: cssW, h: cssH } = readWindowCssSize();
  const maxTex = readMaxTextureSize();
  const fov = clampWorldFovForDisplay(next, cssW, cssH, maxTex);
  const logical = logicalSizeForFov(cssW, cssH, fov, maxTex);
  const host = window as Window & {
    width?: number;
    height?: number;
    map?: HostMap;
    renderer?: {
      resize?: (w: number, h: number) => void;
      width?: number;
      height?: number;
    };
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
  // Prefer whatever the renderer actually allocated (some GL drivers clamp).
  if (host.renderer) {
    const aw =
      typeof host.renderer.width === "number" && host.renderer.width > 0
        ? Math.round(host.renderer.width)
        : 0;
    const ah =
      typeof host.renderer.height === "number" && host.renderer.height > 0
        ? Math.round(host.renderer.height)
        : 0;
    if (aw > 0 && ah > 0) {
      host.width = aw;
      host.height = ah;
    }
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
 * Glyph denseness after CSS FOV fit (fontSize×d / scale÷d in nameplateSharpness).
 * Zoom-out (f>1): CSS shrinks → densify by f.
 * Zoom-in (f<1): CSS enlarges → densify by 1/f (was wrongly using f and going soft).
 *
 * Cap + DPR clamp keep 64×d faces canvas-safe. Phone DPR 3 × FOV 2 used to ask
 * for d=6 (384px Text) every add_name_tag and the plates vanished.
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
  const dprBit = Math.min(dpr, 2);
  // Cap 4 — enough for CSS FOV shrink without thrashing Text atlases.
  return Math.max(1, Math.min(4, Math.ceil(denseness * dprBit)));
}
