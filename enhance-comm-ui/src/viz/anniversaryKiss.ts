/**
 * Anniversary featured-player cue: 80px kiss-range ring + rising-hearts idle.
 * Uses stock `start_animation(..., "hearts_single")` when the target sprite exists.
 */

import {
  getCharacter,
  getCurrentMap,
  getG,
  getObserving,
  getS,
  simpleDistance,
} from "../host/al";
import type { EntityLike, ServerInfoLike } from "../host/globals";
import { entityMapXY } from "../lib/entityMapXY";
import { findEntity, isFocusablePlayer } from "../queries/entities";
import type { GraphicsLike } from "./mapHost";
import { strokeDashedCircle } from "./paintGfx";
import type { VizSettings } from "./vizSettings";

export const ANNIVERSARY_KISS_RANGE_FALLBACK = 80;

const COLOR_VISITOR = 0xf0b742;
const COLOR_HOST = 0xc9a227;
const HEART_MS_VISITOR = 4200;
const HEART_MS_HOST = 9000;

export type AnniversaryLiveStatus = {
  live: true;
  target?: string;
  id?: string | number;
  map?: string;
  x?: number;
  y?: number;
  expires?: number;
};

type HeartSprite = EntityLike & {
  animations?: Record<string, unknown>;
};

type KissFxState = {
  targetKey: string;
  lastHeartAt: number;
  wasInRange: boolean;
};

let fx: KissFxState | null = null;

export function resetAnniversaryKissFx(): void {
  fx = null;
}

export function kissRangePx(G = getG()): number {
  const r = G?.skills?.ikissyou?.range;
  return typeof r === "number" && r > 0 ? r : ANNIVERSARY_KISS_RANGE_FALLBACK;
}

export function readAnniversaryLive(
  S: ServerInfoLike | null | undefined = getS(),
): AnniversaryLiveStatus | null {
  if (!S) return null;
  const raw = S.anniversary;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    live?: unknown;
    target?: unknown;
    id?: unknown;
    map?: unknown;
    x?: unknown;
    y?: unknown;
    expires?: unknown;
  };
  if (!row.live) return null;
  if (row.target == null && row.id == null) return null;
  return {
    live: true,
    target: typeof row.target === "string" ? row.target : undefined,
    id:
      typeof row.id === "string" || typeof row.id === "number"
        ? row.id
        : undefined,
    map: typeof row.map === "string" ? row.map : undefined,
    x: typeof row.x === "number" ? row.x : undefined,
    y: typeof row.y === "number" ? row.y : undefined,
    expires: typeof row.expires === "number" ? row.expires : undefined,
  };
}

export function findAnniversaryTarget(
  entities: EntityLike[],
  status: AnniversaryLiveStatus,
): EntityLike | null {
  if (status.id != null) {
    const byId = findEntity(entities, status.id);
    if (byId && isFocusablePlayer(byId) && !byId.dead && !byId.rip) {
      return byId;
    }
  }
  const name = status.target ? String(status.target) : "";
  if (!name) return null;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!isFocusablePlayer(ent) || ent.dead || ent.rip) continue;
    if (ent.name != null && String(ent.name) === name) return ent;
    if (String(ent.id) === name) return ent;
  }
  return null;
}

function sameMapAsStatus(status: AnniversaryLiveStatus): boolean {
  if (!status.map) return true;
  const here = getCurrentMap();
  return !here || here === status.map;
}

function isHostOf(
  status: AnniversaryLiveStatus,
  target: EntityLike | null,
): boolean {
  const me = getObserving() || getCharacter();
  if (!me) return false;
  if (target && String(me.id) === String(target.id)) return true;
  if (status.id != null && String(me.id) === String(status.id)) return true;
  if (
    status.target &&
    me.name != null &&
    String(me.name) === String(status.target)
  ) {
    return true;
  }
  return false;
}

function callStartAnimation(sprite: HeartSprite, name: string): void {
  if (window.no_graphics) return;
  const fn = window.start_animation;
  if (typeof fn !== "function") return;
  if (!sprite.animations) return;
  try {
    fn(sprite, name);
  } catch {
    /* stock may throw if textures missing */
  }
}

function ensureFxState(targetKey: string): KissFxState {
  if (!fx || fx.targetKey !== targetKey) {
    fx = { targetKey, lastHeartAt: 0, wasInRange: false };
  }
  return fx;
}

function pulseHearts(
  sprite: HeartSprite,
  now: number,
  intervalMs: number,
  state: KissFxState,
): void {
  if (sprite.animations?.hearts_single) return;
  if (state.lastHeartAt > 0 && now - state.lastHeartAt < intervalMs) return;
  state.lastHeartAt = now;
  callStartAnimation(sprite, "hearts_single");
}

function tickEnterRangeCue(
  target: EntityLike,
  range: number,
  host: boolean,
  state: KissFxState,
): void {
  if (host) {
    state.wasInRange = true;
    return;
  }
  const viewer = getObserving() || getCharacter();
  if (!viewer || viewer.rip || viewer.dead) {
    state.wasInRange = false;
    return;
  }
  if (String(viewer.id) === String(target.id)) {
    state.wasInRange = true;
    return;
  }
  const d = simpleDistance(viewer, target);
  const inRange = typeof d === "number" && d < range;
  if (inRange && !state.wasInRange) {
    callStartAnimation(viewer as HeartSprite, "hearts_single");
  }
  state.wasInRange = inRange;
}

/**
 * Draw kiss-range ring + drive stock rising-hearts while anniversary is live.
 */
export function paintAnniversaryKiss(
  gfx: GraphicsLike,
  entities: EntityLike[],
  settings: VizSettings,
  now: number = Date.now(),
): void {
  if (!settings["world.anniversaryKiss"]) {
    resetAnniversaryKissFx();
    return;
  }
  const status = readAnniversaryLive();
  if (!status || !sameMapAsStatus(status)) {
    resetAnniversaryKissFx();
    return;
  }

  const target = findAnniversaryTarget(entities, status);
  const host = isHostOf(status, target);
  const range = kissRangePx();
  const origin = target
    ? entityMapXY(target)
    : status.x != null && status.y != null
      ? { x: status.x, y: status.y }
      : null;
  if (!origin) {
    resetAnniversaryKissFx();
    return;
  }

  const color = host ? COLOR_HOST : COLOR_VISITOR;
  const alpha = host ? 0.42 : 0.78;
  const width = host ? 1.5 : 2;
  strokeDashedCircle(
    gfx,
    origin.x,
    origin.y,
    range,
    color,
    width,
    alpha,
    8,
    6,
  );

  const targetKey =
    (target && target.id != null ? String(target.id) : "") ||
    status.target ||
    String(status.id ?? "");
  const state = ensureFxState(targetKey);

  if (target && target.visible !== false) {
    pulseHearts(
      target as HeartSprite,
      now,
      host ? HEART_MS_HOST : HEART_MS_VISITOR,
      state,
    );
    tickEnterRangeCue(target, range, host, state);
  }
}
