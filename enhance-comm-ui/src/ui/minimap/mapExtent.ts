/**
 * Resolve map bounds + wall segments from live G.geometry / G.maps[].data.
 * Camera helpers stay /comm-native (static snap center + manual pan/zoom).
 */

import { getCurrentMap, getG } from "../../host/al";
import type { EntityLike } from "../../host/globals";
import {
  MINIMAP_ZOOM_MIN,
  MINIMAP_ZOOM_MAX,
  MINIMAP_ZOOM_DEFAULT,
  clampMinimapZoom,
} from "../../lib/minimapPrefs";
import { isAliveMonster, isFocusablePlayer } from "../../queries/entities";

export type MapExtent = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Vertical wall: [x, y1, y2]. Horizontal wall: [y, x1, x2]. */
export type WallLine = [number, number, number];

export type MapGeometry = {
  mapKey: string | undefined;
  extent: MapExtent | null;
  xLines: WallLine[];
  yLines: WallLine[];
  /** True when extent came from G.geometry (full map), not entity bbox. */
  hasGeo: boolean;
};

type GeoLike = {
  min_x?: number;
  min_y?: number;
  max_x?: number;
  max_y?: number;
  x_lines?: WallLine[];
  y_lines?: WallLine[];
};

export {
  MINIMAP_ZOOM_MIN,
  MINIMAP_ZOOM_MAX,
  MINIMAP_ZOOM_DEFAULT,
  clampMinimapZoom,
};
/**
 * Entity-fit snaps never exceed this (not full Mainland G.geometry).
 * High enough for typical /comm soft-synced vision blobs.
 */
export const MINIMAP_CHAR_FIT_MAX = 520;
/** Minimum padding around a solo character. */
export const MINIMAP_CHAR_FIT_SOLO = 200;
/** How much of the canvas the entity bbox should fill (0–1). */
export const MINIMAP_CHAR_FIT_FILL = 0.78;

function asGeo(raw: unknown): GeoLike | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as GeoLike;
}

function finiteExtent(g: GeoLike): MapExtent | null {
  const minX = g.min_x;
  const minY = g.min_y;
  const maxX = g.max_x;
  const maxY = g.max_y;
  if (
    typeof minX !== "number" ||
    typeof minY !== "number" ||
    typeof maxX !== "number" ||
    typeof maxY !== "number"
  ) {
    return null;
  }
  if (!Number.isFinite(minX + minY + maxX + maxY)) return null;
  if (maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY };
}

/** Prefer G.geometry[map]; fall back to G.maps[map].data (same object after process_game_data). */
export function resolveMapGeometry(mapKey?: string | null): MapGeometry {
  const key =
    mapKey != null && String(mapKey) !== ""
      ? String(mapKey)
      : getCurrentMap() || undefined;
  const G = getG() as
    | {
        geometry?: Record<string, GeoLike>;
        maps?: Record<string, { data?: GeoLike }>;
      }
    | undefined;
  const fromGeo = key && G?.geometry ? asGeo(G.geometry[key]) : null;
  const fromMap = key && G?.maps?.[key] ? asGeo(G.maps[key].data) : null;
  const geo = fromGeo || fromMap;
  if (!geo) {
    return {
      mapKey: key,
      extent: null,
      xLines: [],
      yLines: [],
      hasGeo: false,
    };
  }
  const extent = finiteExtent(geo);
  return {
    mapKey: key,
    extent,
    xLines: Array.isArray(geo.x_lines) ? geo.x_lines : [],
    yLines: Array.isArray(geo.y_lines) ? geo.y_lines : [],
    hasGeo: !!extent,
  };
}

function clampCharFitZoom(n: number): number {
  if (!Number.isFinite(n)) return MINIMAP_ZOOM_DEFAULT;
  return Math.max(
    MINIMAP_ZOOM_MIN,
    Math.min(MINIMAP_CHAR_FIT_MAX, Math.round(n)),
  );
}

export type MinimapFocusEnt = {
  id?: string | number;
  real_x?: number;
  x?: number;
  real_y?: number;
  y?: number;
  party?: string;
  player?: boolean;
  me?: boolean;
  type?: string;
  dead?: boolean | string;
  rip?: boolean;
  map?: string;
  in?: string;
  target?: string | number | null;
};

function xyOf(ent: MinimapFocusEnt | null | undefined): {
  x: number;
  y: number;
} | null {
  if (!ent) return null;
  const x = ent.real_x ?? ent.x;
  const y = ent.real_y ?? ent.y;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x + y)) return null;
  return { x, y };
}

function isPlayerLike(ent: MinimapFocusEnt): boolean {
  return isFocusablePlayer(ent as EntityLike);
}

function isDrawableEntity(ent: MinimapFocusEnt): boolean {
  if (!ent || ent.dead || ent.rip) return false;
  const asEnt = ent as EntityLike;
  return isFocusablePlayer(asEnt) || isAliveMonster(asEnt);
}

/**
 * Half-span so `points` (relative to focus) fill ~78% of the canvas.
 * Caps at CHAR_FIT_MAX — never whole-map geometry.
 */
export function characterFitHalfSpan(
  focus: { x: number; y: number },
  points: Array<{ x: number; y: number }>,
  canvasW: number,
  canvasH: number,
): number {
  const fill = MINIMAP_CHAR_FIT_FILL;
  const aspect = Math.max(0.2, canvasW / Math.max(1, canvasH));
  let need = MINIMAP_CHAR_FIT_SOLO;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = Math.abs(p.x - focus.x);
    const dy = Math.abs(p.y - focus.y);
    // aspectSpanExtent: aspect>=1 → halfH=span, halfW=span*aspect
    const spanForPoint =
      aspect >= 1
        ? Math.max(dy / fill, dx / (fill * aspect))
        : Math.max(dx / fill, (dy * aspect) / fill);
    if (spanForPoint > need) need = spanForPoint;
  }
  if (points.length <= 1) {
    need = Math.max(need, MINIMAP_CHAR_FIT_SOLO);
  }
  return clampCharFitZoom(need);
}

/**
 * Build positions to fit on map-load / ◎ snaps: observer + every drawable
 * entity currently in the /comm soft-synced list (players + monsters).
 * Center stays on primary; zoom expands to include the rest.
 */
export function collectCharacterFitPoints(
  primary: MinimapFocusEnt,
  entities: MinimapFocusEnt[],
): {
  focus: { x: number; y: number };
  points: Array<{ x: number; y: number }>;
} {
  const focus = xyOf(primary);
  if (!focus) {
    return { focus: { x: 0, y: 0 }, points: [] };
  }
  const points: Array<{ x: number; y: number }> = [{ x: focus.x, y: focus.y }];
  const primaryId = primary.id != null ? String(primary.id) : "";
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!isDrawableEntity(ent)) continue;
    const id = ent.id != null ? String(ent.id) : "";
    if (id && id === primaryId) continue;
    const p = xyOf(ent);
    if (!p) continue;
    points.push(p);
  }
  return { focus, points };
}

/**
 * Focus fallback for /comm:
 * observing → local character → me in entities → largest party → any visible players.
 * Never requires an observe target.
 */
export function resolveMinimapFocusSet(
  entities: MinimapFocusEnt[],
  observing: MinimapFocusEnt | null | undefined,
  character: MinimapFocusEnt | null | undefined,
): {
  primary: MinimapFocusEnt | null;
  focus: { x: number; y: number } | null;
  points: Array<{ x: number; y: number }>;
  focusId: string;
} {
  let primary: MinimapFocusEnt | null = null;
  if (observing && xyOf(observing)) primary = observing;
  else if (character && xyOf(character)) primary = character;
  else {
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (
        ent &&
        ent.me &&
        !ent.dead &&
        !ent.rip &&
        isPlayerLike(ent) &&
        xyOf(ent)
      ) {
        primary = ent;
        break;
      }
    }
  }

  if (primary) {
    const packed = collectCharacterFitPoints(primary, entities);
    const points = packed.points.length > 0 ? packed.points : [packed.focus];
    return {
      primary,
      focus: packed.focus,
      points,
      focusId: primary.id != null ? String(primary.id) : "self",
    };
  }

  const players: MinimapFocusEnt[] = [];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.dead || ent.rip || !isPlayerLike(ent) || !xyOf(ent))
      continue;
    players.push(ent);
  }
  if (players.length === 0) {
    return { primary: null, focus: null, points: [], focusId: "" };
  }

  const byParty: Record<string, MinimapFocusEnt[]> = {};
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const key = p.party || `solo:${p.id}`;
    if (!byParty[key]) byParty[key] = [];
    byParty[key].push(p);
  }
  let best = players;
  const keys = Object.keys(byParty);
  for (let i = 0; i < keys.length; i++) {
    const g = byParty[keys[i]];
    if (g.length > best.length) best = g;
  }

  const points: Array<{ x: number; y: number }> = [];
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < best.length; i++) {
    const p = xyOf(best[i]);
    if (!p) continue;
    points.push(p);
    sx += p.x;
    sy += p.y;
  }
  if (points.length === 0) {
    return { primary: null, focus: null, points: [], focusId: "" };
  }
  const focus = { x: sx / points.length, y: sy / points.length };
  return {
    primary: best[0],
    focus,
    points,
    focusId: best[0].id != null ? String(best[0].id) : "party",
  };
}

/**
 * World camera from character coordinates: pan focus to view center, zoom so
 * points fill ~78% of canvas. Shared with wall/dot projection via MapExtent.
 */
export function cameraExtentFromWorldCoords(
  focus: { x: number; y: number },
  points: Array<{ x: number; y: number }>,
  canvasW: number,
  canvasH: number,
  pan: { x: number; y: number },
  halfSpanOverride?: number,
): { extent: MapExtent; halfSpan: number } {
  // Override path is manual wheel/± zoom — full range. Auto-fit caps at CHAR_FIT_MAX.
  const halfSpan =
    typeof halfSpanOverride === "number" && halfSpanOverride > 0
      ? clampMinimapZoom(halfSpanOverride)
      : characterFitHalfSpan(focus, points, canvasW, canvasH);
  const extent = aspectSpanExtent(
    focus.x + pan.x,
    focus.y + pan.y,
    halfSpan,
    canvasW,
    canvasH,
  );
  return { extent, halfSpan };
}

/**
 * Observer-centered view that fills the canvas (correct aspect — no empty
 * letterbox from fitting a tall/wide geo bbox into the wrong shape).
 * `halfSpan` is half the shorter canvas axis in world units.
 */
export function aspectSpanExtent(
  cx: number,
  cy: number,
  halfSpan: number,
  canvasW: number,
  canvasH: number,
): MapExtent {
  const span = Math.max(MINIMAP_ZOOM_MIN, halfSpan);
  const aspect = Math.max(0.2, canvasW / Math.max(1, canvasH));
  let halfW: number;
  let halfH: number;
  if (aspect >= 1) {
    halfH = span;
    halfW = span * aspect;
  } else {
    halfW = span;
    halfH = span / aspect;
  }
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - halfH,
    maxY: cy + halfH,
  };
}
