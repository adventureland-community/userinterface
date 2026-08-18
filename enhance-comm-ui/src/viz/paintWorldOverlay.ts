/**
 * Paint ability rings + debug entity lines onto a PIXI overlay on map.
 * World coords = entity.real_x/y (map space on /comm game.js stage).
 */

import { getG, getMapName, simpleDistance } from "../host/al";
import type { EntityLike } from "../host/globals";
import { entityMapXY } from "../lib/entityMapXY";
import { findEntity } from "../queries/entities";
import {
  abilityCdPhase,
  imminentOpacity,
  noteAbilityMsForFlash,
} from "./abilityPhase";
import {
  getVizAbilityRules,
  resolveAbilityAppearance,
  skillDisplayName,
} from "./vizAbilityRules";
import { entityIsMoving, lineEnabled } from "./lineRules";
import {
  addOverlayLabel,
  clearOverlayLabels,
  type ContainerLike,
  type GraphicsLike,
  type OverlayHandle,
} from "./mapHost";
import {
  getVizLineMtypeRules,
  getVizSettings,
  type VizSettings,
} from "./vizSettings";
import { drawLine, strokeCircle, strokeDashedCircle } from "./paintGfx";
import {
  paintWorldQuirkDebug,
  refreshHoveredWorldQuirk,
  syncWorldQuirkHotspots,
} from "./worldQuirks";

const COLOR_MOVE = 0x44ddff;
const COLOR_AGGRO = 0xff3344;
const COLOR_ATTACK = 0xffaa33;
const COLOR_AT_RISK = 0xff6666;
const COLOR_ATTACK_RANGE = 0xee4444;
const COLOR_SPAWN = 0xaa8888;
const COLOR_FLASH = 0xffee88;

function paintAbilityLabel(
  labels: ContainerLike,
  abilityId: string,
  origin: { x: number; y: number },
  radius: number,
  color: number,
  showName: boolean,
): void {
  if (!showName) return;
  const labelY = origin.y - radius + 10;
  addOverlayLabel(labels, skillDisplayName(abilityId), origin.x, labelY, {
    fill: color,
    fontSize: 11,
    anchorX: 0.5,
  });
}

function paintAbilityRings(
  gfx: GraphicsLike,
  labels: ContainerLike,
  focus: EntityLike,
  settings: VizSettings,
  entities: EntityLike[],
): void {
  const mtype = focus.mtype;
  if (!mtype) return;
  const def = getG()?.monsters?.[mtype];
  const abilities = def?.abilities;
  const origin = entityMapXY(focus);
  if (!origin) return;
  const focusId = focus.id != null ? String(focus.id) : mtype;

  if (settings["world.attackRange"] && typeof focus.range === "number") {
    strokeCircle(
      gfx,
      origin.x,
      origin.y,
      focus.range,
      COLOR_ATTACK_RANGE,
      1,
      0.45,
      0,
    );
  }

  if (!abilities || typeof abilities !== "object") return;
  const abilityRules = getVizAbilityRules();
  const ids = Object.keys(abilities);
  let imminentRadius = 0;
  const cdLines: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ab = abilities[id] || {};
    const radius = typeof ab.radius === "number" ? ab.radius : 0;

    if (ab.aura) {
      if (settings["world.auraRing"] && radius > 0) {
        const appearance = resolveAbilityAppearance(id, settings, abilityRules);
        const auraColor = appearance.color;
        strokeDashedCircle(
          gfx,
          origin.x,
          origin.y,
          radius,
          auraColor,
          1.5,
          0.35,
          6,
          6,
        );
        paintAbilityLabel(
          labels,
          id,
          origin,
          radius,
          auraColor,
          appearance.showName,
        );
      }
      continue;
    }

    const cooldown =
      typeof ab.cooldown === "number" && ab.cooldown > 0 ? ab.cooldown : 0;
    const st = focus.s?.[id];
    const ms = st && typeof st.ms === "number" ? Math.max(0, st.ms) : 0;
    const flash = noteAbilityMsForFlash(`${focusId}:${id}`, ms, cooldown);
    const phase = abilityCdPhase(ms, cooldown, {
      imminent: settings["world.abilityImminent"],
      ghost: settings["world.abilityGhost"],
      flash,
    });

    if (settings["entity.cdLabel"] && ms > 0 && cooldown > 0) {
      cdLines.push(`${skillDisplayName(id)}: ${(ms / 1000).toFixed(1)}s`);
    }

    if (!(radius > 0)) continue;
    if (phase === "hidden") continue;

    const appearance = resolveAbilityAppearance(id, settings, abilityRules);
    const color = phase === "flash" ? COLOR_FLASH : appearance.color;
    if (phase === "imminent" || phase === "flash") {
      const alpha = phase === "flash" ? 0.95 : imminentOpacity(ms, cooldown);
      strokeCircle(
        gfx,
        origin.x,
        origin.y,
        radius,
        color,
        phase === "flash" ? 3 : 2.5,
        alpha,
        phase === "flash" ? 0.18 : 0.1,
      );
      if (phase === "imminent" && radius > imminentRadius) {
        imminentRadius = radius;
      }
      paintAbilityLabel(labels, id, origin, radius, color, appearance.showName);
    } else {
      strokeDashedCircle(gfx, origin.x, origin.y, radius, color, 2, 0.28, 8, 6);
      paintAbilityLabel(labels, id, origin, radius, color, appearance.showName);
    }
  }

  if (settings["entity.cdLabel"] && cdLines.length) {
    for (let i = 0; i < cdLines.length; i++) {
      addOverlayLabel(
        labels,
        cdLines[i],
        origin.x + 16,
        origin.y - 8 + i * 12,
        { fill: 0xaaccff, fontSize: 10 },
      );
    }
  }

  if (settings["debug.entityIds"]) {
    const idText = focus.mtype || String(focus.id);
    addOverlayLabel(labels, idText, origin.x, origin.y + 18, {
      fill: 0x888888,
      fontSize: 9,
      anchorX: 0.5,
    });
  }

  if (
    settings["world.highlightAtRisk"] &&
    imminentRadius > 0 &&
    settings["world.abilityImminent"]
  ) {
    for (let i = 0; i < entities.length; i++) {
      const p = entities[i];
      if (!p || p.type !== "character") continue;
      if (p.rip || p.dead) continue;
      if (!(p.player || p.me)) continue;
      const d = simpleDistance(focus, p);
      if (d == null || d >= imminentRadius) continue;
      const xy = entityMapXY(p);
      if (!xy) continue;
      strokeCircle(gfx, xy.x, xy.y, 10, COLOR_AT_RISK, 2, 0.9, 0.15);
    }
  }
}

function paintEntityLines(
  gfx: GraphicsLike,
  entities: EntityLike[],
  settings: VizSettings,
  focusId: string | null,
): void {
  const mtypeRules = getVizLineMtypeRules();
  const anyLines =
    settings["lines.moveDest"] ||
    settings["lines.aggroTarget"] ||
    settings["lines.attackTarget"] ||
    settings["world.targetLine"];
  if (!anyLines) return;

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.dead || !ent.visible) continue;
    const from = entityMapXY(ent);
    if (!from) continue;

    if (lineEnabled(ent, "moveDest", settings, mtypeRules, focusId)) {
      if (entityIsMoving(ent) && ent.going_x != null && ent.going_y != null) {
        drawLine(
          gfx,
          from.x,
          from.y,
          ent.going_x,
          ent.going_y,
          COLOR_MOVE,
          1.5,
          0.75,
        );
        strokeCircle(gfx, ent.going_x, ent.going_y, 3, COLOR_MOVE, 1, 0.8, 0.5);
      }
    }

    if (ent.target == null || ent.target === "") continue;
    const target = findEntity(entities, ent.target);
    if (!target) continue;
    const to = entityMapXY(target);
    if (!to) continue;

    if (lineEnabled(ent, "aggroTarget", settings, mtypeRules, focusId)) {
      drawLine(gfx, from.x, from.y, to.x, to.y, COLOR_AGGRO, 1.5, 0.8);
      continue;
    }

    if (lineEnabled(ent, "attackTarget", settings, mtypeRules, focusId)) {
      drawLine(gfx, from.x, from.y, to.x, to.y, COLOR_ATTACK, 1.5, 0.7);
    }
  }
}

/** Design spawn pack centers from G.maps[map].monsters[].boundary. */
function paintSpawnPoints(
  gfx: GraphicsLike,
  labels: ContainerLike,
  settings: VizSettings,
): void {
  if (!settings["world.spawnPoints"]) return;
  const map = getMapName();
  if (!map) return;
  const packs = getG()?.maps?.[map]?.monsters;
  if (!Array.isArray(packs)) return;
  for (let i = 0; i < packs.length; i++) {
    const row = packs[i];
    if (!row || !Array.isArray(row.boundary) || row.boundary.length < 4) {
      continue;
    }
    const b = row.boundary;
    const x1 = Number(b[0]);
    const y1 = Number(b[1]);
    const x2 = Number(b[2]);
    const y2 = Number(b[3]);
    if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) continue;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    strokeCircle(gfx, cx, cy, 5, COLOR_SPAWN, 1.5, 0.85, 0.35);
    const label =
      typeof row.type === "string"
        ? `${row.type}${row.count ? `×${row.count}` : ""}`
        : "spawn";
    addOverlayLabel(labels, label, cx + 6, cy - 10, {
      fill: 0xaa8888,
      fontSize: 9,
    });
  }
}

function paintGridCoords(labels: ContainerLike, settings: VizSettings): void {
  if (!settings["debug.gridCoords"]) return;
  const map = getMapName();
  if (!map) return;
  const geo = getG()?.geometry?.[map] || getG()?.maps?.[map]?.data;
  if (!geo) return;
  const minX = typeof geo.min_x === "number" ? geo.min_x : null;
  const minY = typeof geo.min_y === "number" ? geo.min_y : null;
  const maxX = typeof geo.max_x === "number" ? geo.max_x : null;
  const maxY = typeof geo.max_y === "number" ? geo.max_y : null;
  if (minX == null || minY == null || maxX == null || maxY == null) return;
  addOverlayLabel(
    labels,
    `${Math.round(minX)},${Math.round(minY)}`,
    minX + 4,
    minY + 4,
    { fill: 0x444444, fontSize: 9 },
  );
  addOverlayLabel(
    labels,
    `${Math.round(maxX)},${Math.round(maxY)}`,
    maxX - 4,
    maxY - 4,
    { fill: 0x444444, fontSize: 9, anchorX: 1, anchorY: 1 },
  );
}

export function paintWorldOverlay(
  handle: OverlayHandle,
  opts: {
    entities: EntityLike[];
    focus: EntityLike | null;
  },
): void {
  const gfx = handle.gfx;
  const labels = handle.labels;
  gfx.clear();
  clearOverlayLabels(labels);
  syncWorldQuirkHotspots(handle.hotspots);
  refreshHoveredWorldQuirk();

  const settings = getVizSettings();
  paintWorldQuirkDebug(gfx, settings);

  const focus = opts.focus;
  const focusId = focus && focus.id != null ? String(focus.id) : null;

  paintSpawnPoints(gfx, labels, settings);
  paintGridCoords(labels, settings);

  if (focus && focus.visible && !focus.dead) {
    paintAbilityRings(gfx, labels, focus, settings, opts.entities);
  }

  paintEntityLines(gfx, opts.entities, settings, focusId);
}
