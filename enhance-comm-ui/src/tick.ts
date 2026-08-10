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

/** Combat target of the watched character (`observing.target`), not `xtarget`. */
function resolveTarget(
  observing: EntityLike | null | undefined,
): EntityLike | undefined {
  if (
    observing == null ||
    observing.target == null ||
    observing.target === ""
  ) {
    return undefined;
  }
  const ent = findEntityById(observing.target);
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

function ensureInterval(): void {
  if (intervalId != null) return;
  const tick = () => {
    const snap = buildSnapshot();
    const cbs = Array.from(listeners);
    for (let i = 0; i < cbs.length; i++) {
      try {
        cbs[i](snap);
      } catch {
        // ignore listener errors
      }
    }
  };
  tick();
  intervalId = window.setInterval(tick, INTERVAL_MS);
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
