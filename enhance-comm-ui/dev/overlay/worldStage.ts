/**
 * Overlay-only world canvas: map walls + entity dots + fake PIXI overlay.
 * Camera follows the observing player. Paint is in game real_x/y.
 */

import { resolveMapGeometry } from "../../src/ui/minimap/mapExtent";
import { entityMapXY } from "../../src/lib/entityMapXY";
import { patchVizSettings, VIZ_SETTINGS_KEY } from "../../src/viz/vizSettings";
import {
  installFakePixi,
  renderFakePixiTree,
} from "./fakePixi";

const SCALE = 1.35;
const CANVAS_ID = "ecu-world-stage";

function seedOverlayVizDefaults(): void {
  try {
    if (localStorage.getItem(VIZ_SETTINGS_KEY)) return;
  } catch {
    return;
  }
  patchVizSettings({
    "world.attackRange": true,
    "world.abilityGhost": true,
  });
}

function ensureCanvas(): HTMLCanvasElement | null {
  const stage = document.getElementById("stage");
  if (!stage) return null;
  let canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.setAttribute("aria-hidden", "true");
    stage.appendChild(canvas);
  }
  return canvas;
}

function camXY(): { x: number; y: number } {
  const obs = window.observing;
  const x = obs?.real_x ?? obs?.x;
  const y = obs?.real_y ?? obs?.y;
  if (typeof x === "number" && typeof y === "number" && Number.isFinite(x + y)) {
    return { x, y };
  }
  const geo = resolveMapGeometry(window.map?.map_name || window.current_map);
  if (geo.extent) {
    return {
      x: (geo.extent.minX + geo.extent.maxX) / 2,
      y: (geo.extent.minY + geo.extent.maxY) / 2,
    };
  }
  return { x: 0, y: 0 };
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  mapKey: string | undefined,
): void {
  const geo = resolveMapGeometry(mapKey);
  ctx.strokeStyle = "rgba(90, 110, 130, 0.85)";
  ctx.lineWidth = 2 / SCALE;
  const xLines = geo.xLines;
  for (let i = 0; i < xLines.length; i++) {
    const line = xLines[i];
    if (!line || line.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(line[0], line[1]);
    ctx.lineTo(line[0], line[2]);
    ctx.stroke();
  }
  const yLines = geo.yLines;
  for (let i = 0; i < yLines.length; i++) {
    const line = yLines[i];
    if (!line || line.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(line[1], line[0]);
    ctx.lineTo(line[2], line[0]);
    ctx.stroke();
  }
}

function drawEntities(ctx: CanvasRenderingContext2D): void {
  const rec = window.entities;
  if (!rec) return;
  const ids = Object.keys(rec);
  const observingId =
    window.observing && window.observing.id != null
      ? String(window.observing.id)
      : "";
  for (let i = 0; i < ids.length; i++) {
    const ent = rec[ids[i]];
    if (!ent || ent.dead || ent.visible === false) continue;
    const xy = entityMapXY(ent);
    if (!xy) continue;
    const isPlayer = ent.type === "character" || !!ent.player;
    const r = isPlayer ? 7 : 8;
    ctx.beginPath();
    ctx.arc(xy.x, xy.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isPlayer ? "#6ec8ff" : "#e08040";
    ctx.fill();
    if (String(ent.id) === observingId) {
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2 / SCALE;
      ctx.stroke();
    }
    const label = isPlayer
      ? ent.name || String(ent.id)
      : ent.mtype || ent.name || String(ent.id);
    ctx.fillStyle = "rgba(230,230,230,0.9)";
    ctx.font = `${11 / SCALE}px pixel, ui-sans-serif, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, xy.x, xy.y + r + 2);
  }
}

function paintFrame(canvas: HTMLCanvasElement): void {
  const stage = canvas.parentElement;
  if (!stage) return;
  const dpr = window.devicePixelRatio || 1;
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, 0, w, h);

  const cam = camXY();
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-cam.x, -cam.y);
  drawWalls(ctx, window.map?.map_name || window.current_map);
  drawEntities(ctx);
  renderFakePixiTree(ctx);
  ctx.restore();
}

let rafId = 0;
let started = false;

export function startWorldStage(): void {
  if (started) return;
  started = true;
  installFakePixi();
  seedOverlayVizDefaults();

  const loop = () => {
    const canvas = ensureCanvas();
    if (canvas) paintFrame(canvas);
    rafId = window.requestAnimationFrame(loop);
  };
  if (document.getElementById("stage")) {
    loop();
    return;
  }
  document.addEventListener("DOMContentLoaded", loop, { once: true });
}

export function stopWorldStage(): void {
  started = false;
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
}
