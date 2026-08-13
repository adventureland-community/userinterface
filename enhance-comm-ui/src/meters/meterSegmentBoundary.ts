/**
 * Keep-or-close policy for camera / instance / crypt-boss hits.
 */

import { CRYPT_BOSSES_MTYPES } from "../crypt/tracker";
import { isInstanceMap } from "./meterRun";
import type { CombatSegment, SegmentCloseReason } from "./meterTypes";

export type MeterCamera = {
  observingId: string;
  map: string;
  mapIn: string;
  event?: string;
  serverRegion: string;
  serverIdentifier: string;
  partyKey: string;
  observingName: string;
  observingCtype: string;
};

export type BoundaryDecision =
  | { action: "keep" }
  | {
      action: "close";
      reason: SegmentCloseReason;
      /** Clear rolling Current history. Do not drop RAM past fights. */
      wipeSessionOverall?: true;
    };

function isCryptBoss(mtype: string | undefined): boolean {
  if (!mtype) return false;
  return CRYPT_BOSSES_MTYPES.indexOf(mtype) >= 0;
}

function samePartySameIn(prev: MeterCamera, next: MeterCamera): boolean {
  if (!prev.observingId || !next.observingId) return false;
  if (!prev.mapIn || prev.mapIn !== next.mapIn) return false;
  if (!prev.partyKey || prev.partyKey !== next.partyKey) return false;
  if (prev.partyKey.indexOf("solo:") === 0) return false;
  return true;
}

export function decideSegmentBoundary(args: {
  prev: MeterCamera | null;
  next: MeterCamera;
  live: CombatSegment | null;
  hitMtype?: string;
}): BoundaryDecision {
  const { prev, next, live, hitMtype } = args;
  if (!live) return { action: "keep" };
  if (!prev) return { action: "keep" };

  const prevServer = `${prev.serverRegion}|${prev.serverIdentifier}`;
  const nextServer = `${next.serverRegion}|${next.serverIdentifier}`;
  if (prevServer !== nextServer && (prev.serverRegion || prev.serverIdentifier)) {
    return { action: "close", reason: "server_change" };
  }

  if (prev.mapIn !== next.mapIn) {
    if (!prev.mapIn && next.mapIn) return { action: "keep" };
    const wipe =
      (isInstanceMap(next.map) && !!next.mapIn) ||
      (!!next.event && next.event !== prev.event);
    if (wipe) {
      return { action: "close", reason: "map_change", wipeSessionOverall: true };
    }
    return { action: "close", reason: "map_change" };
  }

  if (prev.observingId && !next.observingId) {
    return { action: "close", reason: "observe_cleared" };
  }

  if (next.event !== prev.event) {
    if (next.event) {
      return {
        action: "close",
        reason: "map_change",
        wipeSessionOverall: true,
      };
    }
    return { action: "close", reason: "map_change" };
  }

  if (
    next.observingId &&
    prev.observingId &&
    next.observingId !== prev.observingId
  ) {
    if (samePartySameIn(prev, next)) return { action: "keep" };
    return { action: "close", reason: "observe_swap" };
  }

  if (
    hitMtype &&
    live.map === "crypt" &&
    live.kind !== "boss" &&
    isCryptBoss(hitMtype)
  ) {
    return { action: "close", reason: "boss_start" };
  }

  return { action: "keep" };
}
