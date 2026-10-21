/**
 * Observer / player entity-vision window (stock server `B.vision` ≈ 700×500
 * half-extents). Quiet dim outside the clear hole when zoomed out — same
 * four-panel layout as guided-tour shade, low alpha so it does not stripe.
 *
 * Fog panels cover the *camera viewport* (not map geometry). Geometry bounds
 * are often smaller than a zoomed-out screen, which left bright unshaded strips.
 * Viewport-sized fills stay small — no ±20k GPU thrash.
 */

import {
  findEntityById,
  getCharacter,
  getEntitiesList,
  getObserving,
} from "../host/al";
import type { EntityLike } from "../host/globals";
import { readHostWorldZoom, WORLD_ZOOM_DEFAULT } from "../lib/worldZoom";
import { getHostMap, type GraphicsLike } from "./mapHost";
import type { VizSettings } from "./vizSettings";

/** Stock `B.vision` on adventureland_mongodb main (half-span in world px). */
export const STOCK_VISION_HALF_X = 700;
export const STOCK_VISION_HALF_Y = 500;

/** Fallback half-span when width/height are missing — keep small for GPU. */
const FALLBACK_VIEW_HALF = 1200;
/** Extra world px past the screen edge so pan does not flash undimmed seams. */
const VIEW_FOG_PAD = 80;
/**
 * Peak shade. Tour dim is ~0.76; stepped feather bands looked striped at
 * zoom-out, so stay with one flat quiet panel set instead.
 */
const FOG_COLOR = 0x000000;
export const FOG_ALPHA = 0.14;

function readScreenPx(): { w: number; h: number } {
  const w = window as Window & { width?: number; height?: number };
  const width =
    typeof w.width === "number" && w.width > 0
      ? w.width
      : typeof window.innerWidth === "number"
        ? window.innerWidth
        : 0;
  const height =
    typeof w.height === "number" && w.height > 0
      ? w.height
      : typeof window.innerHeight === "number"
        ? window.innerHeight
        : 0;
  return {
    w: width > 0 ? width : FALLBACK_VIEW_HALF * 2,
    h: height > 0 ? height : FALLBACK_VIEW_HALF * 2,
  };
}

type VisionHalf = { x: number; y: number };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function asVisionHalf(raw: unknown): VisionHalf | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const x = Number(raw[0]);
  const y = Number(raw[1]);
  if (!(x > 0) || !(y > 0) || !Number.isFinite(x + y)) return null;
  return { x, y };
}

function mapXY(
  ent: Pick<EntityLike, "real_x" | "real_y" | "x" | "y"> | null | undefined,
): { x: number; y: number } | null {
  if (!ent) return null;
  const x = Number(ent.real_x ?? ent.x);
  const y = Number(ent.real_y ?? ent.y);
  if (!Number.isFinite(x + y)) return null;
  return { x, y };
}

function readCameraXY(): { x: number; y: number } | null {
  const map = getHostMap() as {
    real_x?: number;
    real_y?: number;
  } | null;
  if (!map) return null;
  const x = map.real_x;
  const y = map.real_y;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x + y)) return null;
  return { x, y };
}

/**
 * Soft entity for the watched character. Never trust `window.observing` alone —
 * stock sets it once on welcome and does not refresh coords (`player` packets
 * update `entities[id]` / `character` only).
 */
export function findLiveObservedEntity(): EntityLike | null {
  const snap = window.observing as EntityLike | null | undefined;
  if (!snap) return null;
  if (snap.id != null) {
    const byId = findEntityById(snap.id);
    if (byId) return byId;
  }
  const name = snap.name != null ? String(snap.name) : "";
  if (!name) return null;
  const list = getEntitiesList();
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (ent && ent.name != null && String(ent.name) === name) return ent;
  }
  return null;
}

/** Prefer live entity `.vision`, else stock B.vision defaults. */
export function readObserverVisionHalf(): VisionHalf {
  const live = findLiveObservedEntity() || getObserving();
  const fromObs = asVisionHalf(
    live && (live as { vision?: unknown }).vision,
  );
  if (fromObs) return fromObs;
  const character = getCharacter();
  const fromChar = asVisionHalf(
    character && (character as { vision?: unknown }).vision,
  );
  if (fromChar) return fromChar;
  return { x: STOCK_VISION_HALF_X, y: STOCK_VISION_HALF_Y };
}

/**
 * Vision hole follows the watched character’s live soft entity, else self,
 * else the camera. Never uses frozen welcome `window.observing` coords.
 */
export function resolveVisionCenter(): { x: number; y: number } | null {
  const fromLive = mapXY(findLiveObservedEntity());
  if (fromLive) return fromLive;
  const fromChar = mapXY(getCharacter());
  if (fromChar) return fromChar;
  return readCameraXY();
}

/**
 * World-space rect covering the current camera viewport (+ pad).
 * Uses stock `width`/`height`/`scale` and `map.real_x/y` (not map geometry).
 */
export function readFogBounds(center: { x: number; y: number }): Bounds {
  const map = getHostMap() as {
    real_x?: number;
    real_y?: number;
  } | null;
  const camX =
    map && typeof map.real_x === "number" && Number.isFinite(map.real_x)
      ? map.real_x
      : center.x;
  const camY =
    map && typeof map.real_y === "number" && Number.isFinite(map.real_y)
      ? map.real_y
      : center.y;
  const zoom = Math.max(1, readHostWorldZoom());
  const { w, h } = readScreenPx();
  const halfW = w / (2 * zoom) + VIEW_FOG_PAD;
  const halfH = h / (2 * zoom) + VIEW_FOG_PAD;
  return {
    minX: camX - halfW,
    minY: camY - halfH,
    maxX: camX + halfW,
    maxY: camY + halfH,
  };
}

function fillFogPanel(
  gfx: GraphicsLike,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!(w > 1) || !(h > 1)) return;
  if (typeof gfx.drawRect !== "function") return;
  gfx.beginFill(FOG_COLOR, FOG_ALPHA);
  gfx.drawRect(x, y, w, h);
  gfx.endFill();
}

/**
 * Quiet black shade outside the server entity window (tour-style panels).
 * Only when zoomed out (scale < default) — at default zoom the viewport is
 * already the vision hole.
 */
export function paintObserverVision(
  gfx: GraphicsLike,
  settings: VizSettings,
): void {
  if (!settings["world.observerVision"]) return;
  try {
    if (!(readHostWorldZoom() < WORLD_ZOOM_DEFAULT)) return;
    const center = resolveVisionCenter();
    if (!center) return;
    const half = readObserverVisionHalf();
    const vx0 = center.x - half.x;
    const vy0 = center.y - half.y;
    const vx1 = center.x + half.x;
    const vy1 = center.y + half.y;
    const b = readFogBounds(center);
    fillFogPanel(gfx, b.minX, b.minY, vx0 - b.minX, b.maxY - b.minY);
    fillFogPanel(gfx, vx1, b.minY, b.maxX - vx1, b.maxY - b.minY);
    fillFogPanel(gfx, vx0, b.minY, vx1 - vx0, vy0 - b.minY);
    fillFogPanel(gfx, vx0, vy1, vx1 - vx0, b.maxY - vy1);
  } catch (err) {
    console.error("[ecu] paintObserverVision", err);
  }
}
