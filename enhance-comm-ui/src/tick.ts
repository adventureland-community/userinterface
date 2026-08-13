import {
  findEntityById,
  getEntitiesList,
  getObserving,
  getObservingId,
  getS,
  getServerIdentifier,
  getServerRegion,
} from "./host/al";
import type { EntityLike, ServerInfoLike } from "./host/globals";

export type GameSnapshot = {
  entities: EntityLike[];
  observingId: string | undefined;
  observing: EntityLike | null | undefined;
  target: EntityLike | undefined;
  S: ServerInfoLike | undefined;
  serverRegion: string | undefined;
  serverIdentifier: string | undefined;
  now: number;
};

export type TickUnsubscribe = () => void;

const INTERVAL_MS = 100;

const listeners = new Set<(snap: GameSnapshot) => void>();
let intervalId: number | null = null;
let visBound = false;

/**
 * Combat target of a unit (`entity.target`), not `xtarget`.
 * Used for observing and spectator focus frames.
 */
export function resolveTarget(
  source: EntityLike | null | undefined,
): EntityLike | undefined {
  if (source == null || source.target == null || source.target === "") {
    return undefined;
  }
  const ent = findEntityById(source.target);
  // Prefer a living entity; corpses stay under DEAD* briefly after kill.
  if (!ent || ent.dead) return undefined;
  return ent;
}

function buildSnapshot(): GameSnapshot {
  const entities = getEntitiesList();
  const observing = getObserving();
  const observingId =
    observing?.id != null ? String(observing.id) : getObservingId();
  return {
    entities,
    observingId,
    observing,
    target: resolveTarget(observing),
    S: getS(),
    serverRegion: getServerRegion(),
    serverIdentifier: getServerIdentifier(),
    now: Date.now(),
  };
}

function statusFingerprint(ent: EntityLike, includeMs: boolean): string {
  const st = ent.s;
  if (!st) return "";
  const keys = Object.keys(st);
  let out = "";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const actual = st[key];
    if (!actual) continue;
    const stacks = typeof actual.s === "number" ? actual.s : 0;
    const msBucket =
      includeMs && actual.ms != null && actual.ms > 0
        ? Math.ceil(actual.ms / 2000)
        : 0;
    out += `${key}:${stacks}:${msBucket},`;
  }
  return out;
}

/**
 * Cheap visible-HUD signature. Used to skip React setSnap when party HP,
 * observing/target, xtarget, and effect identity have not changed.
 * Buff countdown uses 2s buckets — EffectIcon clocks remaining locally.
 */
export function snapshotUiKey(snap: GameSnapshot): string {
  const xt = (window as any).xtarget;
  const xtId = xt && xt.id != null ? String(xt.id) : "";
  const targetId =
    snap.target && snap.target.id != null ? String(snap.target.id) : "";
  const obsId = snap.observingId != null ? String(snap.observingId) : "";
  const parts: string[] = [
    obsId,
    targetId,
    xtId,
    snap.serverRegion || "",
    snap.serverIdentifier || "",
    String(snap.entities.length),
  ];
  const ents = snap.entities;
  for (let i = 0; i < ents.length; i++) {
    const ent = ents[i];
    const id = ent.id != null ? String(ent.id) : "";
    const hud =
      !!ent.player || id === obsId || id === targetId || !!ent.cooperative;
    const hp = ent.hp != null ? Math.round(ent.hp) : 0;
    const mp = hud && ent.mp != null ? Math.round(ent.mp) : 0;
    parts.push(
      `${id}|${hp}|${mp}|${ent.dead ? 1 : 0}|${ent.rip ? 1 : 0}|${
        hud ? ent.fear || 0 : 0
      }|${ent.in || ""}|${ent.target || ""}|${
        hud ? statusFingerprint(ent, true) : ""
      }`,
    );
  }
  return parts.join(";");
}

function publishSnapshot(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  const snap = buildSnapshot();
  const cbs = Array.from(listeners);
  for (let i = 0; i < cbs.length; i++) {
    try {
      cbs[i](snap);
    } catch {
      // ignore listener errors
    }
  }
}

function onTickVisibility(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  if (listeners.size === 0) return;
  publishSnapshot();
}

function ensureInterval(): void {
  if (intervalId != null) return;
  publishSnapshot();
  intervalId = window.setInterval(publishSnapshot, INTERVAL_MS);
  if (!visBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onTickVisibility);
    visBound = true;
  }
}

function maybeStopInterval(): void {
  if (listeners.size > 0 || intervalId == null) return;
  window.clearInterval(intervalId);
  intervalId = null;
}

/**
 * Subscribe to the shared 100ms game snapshot publisher.
 * Starts the interval on first subscriber; stops when the last unsubscribes.
 */
export function subscribeTick(
  cb: (snap: GameSnapshot) => void,
): TickUnsubscribe {
  listeners.add(cb);
  ensureInterval();
  return () => {
    listeners.delete(cb);
    maybeStopInterval();
  };
}

/** Single 100ms publisher for the whole UI (multicast via subscribeTick). */
export function startTick(cb: (snap: GameSnapshot) => void): TickUnsubscribe {
  return subscribeTick(cb);
}
