/**
 * Canvas painter for the Comm minimap — walls from G.geometry, dots from entities.
 * No tiles: /comm only has collision lines + soft-synced entity positions.
 */

import type { EntityLike } from "../../host/globals";
import { entityMapXY } from "../../lib/entityMapXY";
import { isAliveMonster, isFocusablePlayer } from "../../queries/entities";
import type { MapExtent, WallLine } from "./mapExtent";
import { type MinimapBgMode, minimapBgPalette } from "./minimapAppearance";

export type PaintMinimapOpts = {
  width: number;
  height: number;
  extent: MapExtent;
  xLines: WallLine[];
  yLines: WallLine[];
  entities: EntityLike[];
  observingId?: string;
  targetId?: string;
  selectedId?: string;
  partyKey?: string;
  /** World focus for center crosshair (observer). */
  focusX?: number;
  focusY?: number;
  bgMode?: MinimapBgMode;
};

export type MinimapHit = {
  id: string;
  entity: EntityLike;
  sx: number;
  sy: number;
  dist: number;
};

const WALL_COLOR = "rgba(140, 160, 180, 0.55)";
const PLAYER = "#5ec8ff";
const PARTY = "#7dffb3";
const SELF = "#ffe66d";
const MONSTER = "#e85d5d";
const BOSS = "#c77dff";
const TARGET_RING = "#ff9f43";
const SELECT_RING = "#ffffff";
const CROSSHAIR = "rgba(255, 230, 109, 0.35)";
const MAX_WALL_STROKES = 3500;
const PAD = 4;

export type ProjectFn = (x: number, y: number) => { sx: number; sy: number };

export function makeProjector(
  extent: MapExtent,
  width: number,
  height: number,
  pad: number = PAD,
): {
  project: ProjectFn;
  unproject: (sx: number, sy: number) => { x: number; y: number };
  scale: number;
} {
  const worldW = Math.max(1, extent.maxX - extent.minX);
  const worldH = Math.max(1, extent.maxY - extent.minY);
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const scale = Math.min(plotW / worldW, plotH / worldH);
  const ox = pad + (plotW - worldW * scale) / 2;
  const oy = pad + (plotH - worldH * scale) / 2;
  return {
    scale,
    project: (x, y) => ({
      sx: ox + (x - extent.minX) * scale,
      sy: oy + (y - extent.minY) * scale,
    }),
    unproject: (sx, sy) => ({
      x: extent.minX + (sx - ox) / scale,
      y: extent.minY + (sy - oy) / scale,
    }),
  };
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx, sy - r);
  ctx.lineTo(sx + r, sy);
  ctx.lineTo(sx, sy + r);
  ctx.lineTo(sx - r, sy);
  ctx.closePath();
  ctx.fill();
}

function wallStep(count: number): number {
  if (count <= MAX_WALL_STROKES) return 1;
  return Math.ceil(count / MAX_WALL_STROKES);
}

function collectHits(
  ents: EntityLike[],
  extent: MapExtent,
  project: ProjectFn,
  obsId: string,
): Array<{
  entity: EntityLike;
  id: string;
  sx: number;
  sy: number;
  r: number;
}> {
  const out: Array<{
    entity: EntityLike;
    id: string;
    sx: number;
    sy: number;
    r: number;
  }> = [];
  for (let i = 0; i < ents.length; i++) {
    const ent = ents[i];
    if (!ent || ent.dead || ent.rip) continue;
    const xy = entityMapXY(ent);
    if (!xy) continue;
    if (
      xy.x < extent.minX ||
      xy.x > extent.maxX ||
      xy.y < extent.minY ||
      xy.y > extent.maxY
    ) {
      continue;
    }
    const id = ent.id != null ? String(ent.id) : "";
    if (!id) continue;
    const p = project(xy.x, xy.y);
    let r = 2.4;
    if (isAliveMonster(ent)) {
      r = ent.cooperative === true ? 3.4 : 2.4;
    } else if (isFocusablePlayer(ent)) {
      r = id === obsId ? 6 : 3.2;
    } else {
      continue;
    }
    out.push({ entity: ent, id, sx: p.sx, sy: p.sy, r });
  }
  return out;
}

/** Nearest clickable entity under canvas coords (CSS pixels). */
export function hitTestMinimap(opts: {
  extent: MapExtent;
  width: number;
  height: number;
  entities: EntityLike[];
  observingId?: string;
  sx: number;
  sy: number;
  maxDist?: number;
}): MinimapHit | null {
  const { project } = makeProjector(opts.extent, opts.width, opts.height);
  const obsId = opts.observingId != null ? String(opts.observingId) : "";
  const hits = collectHits(opts.entities || [], opts.extent, project, obsId);
  const maxDist = opts.maxDist != null ? opts.maxDist : 10;
  let best: MinimapHit | null = null;
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const dx = h.sx - opts.sx;
    const dy = h.sy - opts.sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = Math.max(maxDist, h.r + 4);
    if (dist > limit) continue;
    if (!best || dist < best.dist) {
      best = { id: h.id, entity: h.entity, sx: h.sx, sy: h.sy, dist };
    }
  }
  return best;
}

export function paintMinimap(
  canvas: HTMLCanvasElement,
  opts: PaintMinimapOpts,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = Math.max(32, Math.round(opts.width));
  const height = Math.max(32, Math.round(opts.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  const palette = minimapBgPalette(opts.bgMode || "opaque");
  if (palette.canvasBg) {
    ctx.fillStyle = palette.canvasBg;
    ctx.fillRect(0, 0, width, height);
  }

  const extent = opts.extent;
  const { project } = makeProjector(extent, width, height, PAD);

  if (palette.gridColor) {
    ctx.strokeStyle = palette.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = 1; g < 4; g++) {
      const gx = PAD + ((width - PAD * 2) * g) / 4;
      const gy = PAD + ((height - PAD * 2) * g) / 4;
      ctx.moveTo(gx, PAD);
      ctx.lineTo(gx, height - PAD);
      ctx.moveTo(PAD, gy);
      ctx.lineTo(width - PAD, gy);
    }
    ctx.stroke();
  }

  const xLines = opts.xLines || [];
  const yLines = opts.yLines || [];
  if (xLines.length || yLines.length) {
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const xs = wallStep(xLines.length);
    for (let i = 0; i < xLines.length; i += xs) {
      const line = xLines[i];
      if (!line || line.length < 3) continue;
      const lx = line[0];
      if (lx < extent.minX || lx > extent.maxX) continue;
      const y0 = Math.min(line[1], line[2]);
      const y1 = Math.max(line[1], line[2]);
      if (y1 < extent.minY || y0 > extent.maxY) continue;
      const a = project(lx, Math.max(y0, extent.minY));
      const b = project(lx, Math.min(y1, extent.maxY));
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    const ys = wallStep(yLines.length);
    for (let i = 0; i < yLines.length; i += ys) {
      const line = yLines[i];
      if (!line || line.length < 3) continue;
      const ly = line[0];
      if (ly < extent.minY || ly > extent.maxY) continue;
      const x0 = Math.min(line[1], line[2]);
      const x1 = Math.max(line[1], line[2]);
      if (x1 < extent.minX || x0 > extent.maxX) continue;
      const a = project(Math.max(x0, extent.minX), ly);
      const b = project(Math.min(x1, extent.maxX), ly);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    ctx.stroke();
  }

  if (
    typeof opts.focusX === "number" &&
    typeof opts.focusY === "number" &&
    Number.isFinite(opts.focusX + opts.focusY)
  ) {
    const c = project(opts.focusX, opts.focusY);
    ctx.strokeStyle = CROSSHAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.sx - 10, c.sy);
    ctx.lineTo(c.sx + 10, c.sy);
    ctx.moveTo(c.sx, c.sy - 10);
    ctx.lineTo(c.sx, c.sy + 10);
    ctx.stroke();
  }

  const obsId = opts.observingId != null ? String(opts.observingId) : "";
  const targetId = opts.targetId != null ? String(opts.targetId) : "";
  const selectedId = opts.selectedId != null ? String(opts.selectedId) : "";
  const partyKey = opts.partyKey || "";

  type Dot = {
    sx: number;
    sy: number;
    kind: "monster" | "boss" | "player" | "party" | "self";
    id: string;
  };
  const monsters: Dot[] = [];
  const players: Dot[] = [];
  let selfDot: Dot | null = null;
  let targetDot: Dot | null = null;
  let selectedDot: Dot | null = null;

  const ents = opts.entities || [];
  for (let i = 0; i < ents.length; i++) {
    const ent = ents[i];
    if (!ent || ent.dead || ent.rip) continue;
    const xy = entityMapXY(ent);
    if (!xy) continue;
    if (
      xy.x < extent.minX ||
      xy.x > extent.maxX ||
      xy.y < extent.minY ||
      xy.y > extent.maxY
    ) {
      continue;
    }
    const p = project(xy.x, xy.y);
    const id = ent.id != null ? String(ent.id) : "";
    if (isAliveMonster(ent)) {
      const kind =
        ent.cooperative === true ? ("boss" as const) : ("monster" as const);
      const dot: Dot = { sx: p.sx, sy: p.sy, kind, id };
      monsters.push(dot);
      if (id && id === targetId) targetDot = dot;
      if (id && id === selectedId) selectedDot = dot;
      continue;
    }
    if (!isFocusablePlayer(ent)) continue;
    let kind: Dot["kind"] = "player";
    if (id && id === obsId) kind = "self";
    else if (partyKey && ent.party === partyKey) kind = "party";
    const dot: Dot = { sx: p.sx, sy: p.sy, kind, id };
    if (kind === "self") selfDot = dot;
    else players.push(dot);
    if (id && id === targetId) targetDot = dot;
    if (id && id === selectedId) selectedDot = dot;
  }

  for (let i = 0; i < monsters.length; i++) {
    const d = monsters[i];
    drawDot(
      ctx,
      d.sx,
      d.sy,
      d.kind === "boss" ? 3.2 : 2.2,
      d.kind === "boss" ? BOSS : MONSTER,
    );
  }
  for (let i = 0; i < players.length; i++) {
    const d = players[i];
    drawDot(ctx, d.sx, d.sy, 2.8, d.kind === "party" ? PARTY : PLAYER);
  }
  if (selfDot) {
    drawDiamond(ctx, selfDot.sx, selfDot.sy, 5, SELF);
  }
  if (targetDot) {
    ctx.strokeStyle = TARGET_RING;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(targetDot.sx, targetDot.sy, 6.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (selectedDot && selectedDot.id !== (targetDot && targetDot.id)) {
    ctx.strokeStyle = SELECT_RING;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(selectedDot.sx, selectedDot.sy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}
