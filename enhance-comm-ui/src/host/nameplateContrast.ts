/**
 * Cheap nameplate contrast vs world behind the plate.
 *
 * Once every ~300ms, blit the game canvas into a tiny 2D buffer and sample
 * 1px under each visible nameplate. Map luminance to a coarse band and bump
 * ghost alpha only when the band changes — no per-frame readPixels.
 *
 * If the WebGL canvas cannot be read (no preserveDrawingBuffer), disable
 * sampling after a few black reads and keep the static ghost floor.
 */

import {
  ghostAlphaForLuminanceBand,
  luminanceToNameplateBand,
  setNameBandFillAlpha,
  srgbLuminance,
  type GraphicsLike,
  type NameplateLuminanceBand,
  type TextNodeLike,
} from "./nameplateStyle";

const SAMPLE_MS = 300;
const TINY_W = 64;
const TINY_H = 36;
const BLACK_FAILS_BEFORE_DISABLE = 4;
const MAX_PLATES_PER_TICK = 12;

type PlateRoot = TextNodeLike & {
  __ecuNameplateLumBand?: NameplateLuminanceBand;
  __ecuNameplateStyled?: boolean;
  getBounds?: () => { x: number; y: number; width: number; height: number };
  children?: TextNodeLike[];
  visible?: boolean;
  worldVisible?: boolean;
};

type EntityLike = {
  name_tag?: PlateRoot | null;
  visible?: boolean;
};

let installed = false;
let timerId: number | null = null;
let tiny: HTMLCanvasElement | null = null;
let tinyCtx: CanvasRenderingContext2D | null = null;
let sampleDisabled = false;
let blackFails = 0;
let cursor = 0;

/** Test seam — reset sampler state. */
export function resetNameplateContrastForTests(): void {
  sampleDisabled = false;
  blackFails = 0;
  cursor = 0;
  tiny = null;
  tinyCtx = null;
  if (timerId != null && typeof window !== "undefined") {
    window.clearInterval(timerId);
    timerId = null;
  }
  installed = false;
}

function rendererView(): HTMLCanvasElement | null {
  const renderer = (
    window as Window & {
      renderer?: { view?: HTMLCanvasElement | HTMLElement | null };
    }
  ).renderer;
  const view = renderer && renderer.view;
  if (!view) return null;
  if (typeof (view as HTMLCanvasElement).getContext === "function") {
    return view as HTMLCanvasElement;
  }
  return null;
}

function ensureTiny(): CanvasRenderingContext2D | null {
  if (tinyCtx) return tinyCtx;
  if (typeof document === "undefined") return null;
  tiny = document.createElement("canvas");
  tiny.width = TINY_W;
  tiny.height = TINY_H;
  tinyCtx = tiny.getContext("2d", { willReadFrequently: true });
  return tinyCtx;
}

function looksLikeGraphics(node: TextNodeLike | null | undefined): boolean {
  if (!node) return false;
  const g = node as GraphicsLike & TextNodeLike;
  return !!(g.graphicsData || (g.geometry && g.geometry.graphicsData));
}

function applyBandToPlate(root: PlateRoot, band: NameplateLuminanceBand): void {
  if (root.__ecuNameplateLumBand === band) return;
  const alpha = ghostAlphaForLuminanceBand(band);
  let touched = 0;
  const visit = (node: TextNodeLike | null | undefined) => {
    if (!node) return;
    if (looksLikeGraphics(node)) {
      touched += setNameBandFillAlpha(
        node as unknown as GraphicsLike,
        alpha,
      );
    }
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
  if (touched > 0) root.__ecuNameplateLumBand = band;
}

/**
 * Sample just below the plate so we read the world (or sprite), not the ghost
 * fill itself — post-render blit cannot see "behind" the already-drawn tag.
 */
function plateWorldSamplePoint(
  root: PlateRoot,
): { x: number; y: number } | null {
  if (typeof root.getBounds !== "function") return null;
  try {
    const b = root.getBounds();
    if (!b) return null;
    const w = Number(b.width);
    const h = Number(b.height);
    const x = Number(b.x);
    const y = Number(b.y);
    if (![w, h, x, y].every((n) => Number.isFinite(n))) return null;
    if (!(w > 0) || !(h > 0)) return null;
    return { x: x + w * 0.5, y: y + h + 3 };
  } catch {
    return null;
  }
}

function sampleBandAtCanvasPx(
  ctx: CanvasRenderingContext2D,
  canvasX: number,
  canvasY: number,
  viewW: number,
  viewH: number,
  tinyW: number = TINY_W,
  tinyH: number = TINY_H,
): NameplateLuminanceBand | null {
  if (!(viewW > 0) || !(viewH > 0)) return null;
  const tw = Math.max(1, tinyW | 0);
  const th = Math.max(1, tinyH | 0);
  const tx = Math.max(
    0,
    Math.min(tw - 1, Math.floor((canvasX / viewW) * tw)),
  );
  const ty = Math.max(
    0,
    Math.min(th - 1, Math.floor((canvasY / viewH) * th)),
  );
  let data: ImageData;
  try {
    data = ctx.getImageData(tx, ty, 1, 1);
  } catch {
    return null;
  }
  const r = data.data[0];
  const g = data.data[1];
  const b = data.data[2];
  if (r === 0 && g === 0 && b === 0) {
    blackFails++;
    if (blackFails >= BLACK_FAILS_BEFORE_DISABLE) sampleDisabled = true;
    return null;
  }
  blackFails = 0;
  return luminanceToNameplateBand(srgbLuminance(r, g, b));
}

function collectPlates(): PlateRoot[] {
  const out: PlateRoot[] = [];
  const push = (ent: EntityLike | null | undefined) => {
    if (!ent || !ent.name_tag) return;
    if (ent.visible === false) return;
    const tag = ent.name_tag;
    if (tag.visible === false || tag.worldVisible === false) return;
    if (!tag.__ecuNameplateStyled) return;
    out.push(tag);
  };
  const w = window as Window & {
    character?: EntityLike | null;
    observing?: EntityLike | null;
    entities?: Record<string, EntityLike | null | undefined>;
  };
  push(w.character);
  push(w.observing);
  const ents = w.entities;
  if (ents) {
    for (const id in ents) {
      if (!Object.prototype.hasOwnProperty.call(ents, id)) continue;
      push(ents[id]);
    }
  }
  return out;
}

/**
 * One cheap pass: blit → sample up to MAX_PLATES_PER_TICK → banded alpha.
 * Safe to call from tests with a mock view/ctx via {@link tickNameplateContrast}.
 */
export function tickNameplateContrast(opts?: {
  view?: HTMLCanvasElement | null;
  ctx?: CanvasRenderingContext2D | null;
}): void {
  if (sampleDisabled) return;
  const view = opts && opts.view !== undefined ? opts.view : rendererView();
  if (!view) return;
  const ctx = opts && opts.ctx ? opts.ctx : ensureTiny();
  if (!ctx) return;

  const viewW =
    typeof view.width === "number" && view.width > 0
      ? view.width
      : view.clientWidth || 0;
  const viewH =
    typeof view.height === "number" && view.height > 0
      ? view.height
      : view.clientHeight || 0;
  if (!(viewW > 0) || !(viewH > 0)) return;

  const dest = ctx.canvas;
  const dw =
    dest && typeof dest.width === "number" && dest.width > 0
      ? dest.width
      : TINY_W;
  const dh =
    dest && typeof dest.height === "number" && dest.height > 0
      ? dest.height
      : TINY_H;

  try {
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(view, 0, 0, dw, dh);
  } catch {
    blackFails++;
    if (blackFails >= BLACK_FAILS_BEFORE_DISABLE) sampleDisabled = true;
    return;
  }

  const plates = collectPlates();
  if (!plates.length) return;
  if (cursor >= plates.length) cursor = 0;
  const n = Math.min(MAX_PLATES_PER_TICK, plates.length);
  for (let i = 0; i < n; i++) {
    const plate = plates[(cursor + i) % plates.length];
    const mid = plateWorldSamplePoint(plate);
    if (!mid) continue;
    // getBounds is in CSS/renderer pixels — scale if canvas backing differs.
    const cssW = view.clientWidth || viewW;
    const cssH = view.clientHeight || viewH;
    const sx = cssW > 0 ? (mid.x / cssW) * viewW : mid.x;
    const sy = cssH > 0 ? (mid.y / cssH) * viewH : mid.y;
    const band = sampleBandAtCanvasPx(ctx, sx, sy, viewW, viewH, dw, dh);
    if (!band) continue;
    applyBandToPlate(plate, band);
  }
  cursor = (cursor + n) % Math.max(1, plates.length);
}

/** Install throttled contrast sampler (idempotent). */
export function installNameplateContrast(): void {
  if (installed) return;
  installed = true;
  if (typeof window === "undefined") return;
  timerId = window.setInterval(() => {
    try {
      tickNameplateContrast();
    } catch (err) {
      console.error("[ecu] nameplateContrast", err);
    }
  }, SAMPLE_MS);
}
