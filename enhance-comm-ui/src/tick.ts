import {
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

function buildSnapshot(): GameSnapshot {
  const entities = getEntitiesList();
  const observingId = getObservingId();
  const observing = getObserving();
  let target: EntityLike | undefined;
  if (observing?.target) {
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].id === observing.target) {
        target = entities[i];
        break;
      }
    }
  }
  return {
    entities,
    observingId,
    observing,
    target,
    S: getS(),
    serverRegion: getServerRegion(),
    serverIdentifier: getServerIdentifier(),
    now: Date.now(),
  };
}

/** Single 100ms publisher for the whole UI. */
export function startTick(cb: (snap: GameSnapshot) => void): TickUnsubscribe {
  const tick = () => {
    cb(buildSnapshot());
  };
  tick();
  const id = window.setInterval(tick, INTERVAL_MS);
  return () => window.clearInterval(id);
}
