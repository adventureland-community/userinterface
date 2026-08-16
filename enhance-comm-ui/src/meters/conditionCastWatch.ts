/**
 * Watches player status bags for skill-condition onset / refresh and emits
 * synthetic casts. Keeps lastMs + first-sight state off the segment tape.
 */

import type { ActionEvent } from "../sockets/hub";
import {
  castFromConditionOnset,
  conditionMs,
  conditionMsRefreshed,
} from "./syntheticCast";

type WatchEntry = { lastMs?: number };

const byOpenKey: Record<string, WatchEntry> = {};
/** First sample of an actor is a snapshot — no casts for buffs already on. */
const seenActors: Record<string, true> = {};

/**
 * Diff one actor's `s` bag against prior watch state.
 * Call once per sample tick per actor (even with an empty bag to prune).
 */
export function castsFromConditionSample(
  actorId: string,
  statuses: Record<string, Record<string, unknown>> | null | undefined,
  at: number,
): ActionEvent[] {
  if (!actorId) return [];
  const bag = statuses && typeof statuses === "object" ? statuses : {};
  const firstSight = !seenActors[actorId];
  if (firstSight) seenActors[actorId] = true;

  const out: ActionEvent[] = [];
  const present: Record<string, true> = {};
  const keys = Object.keys(bag);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const openKey = `${actorId}:${key}`;
    present[openKey] = true;
    const status = bag[key];
    const ms = conditionMs(status);
    const prev = byOpenKey[openKey];
    if (!prev) {
      byOpenKey[openKey] = { lastMs: ms };
      if (!firstSight) {
        const cast = castFromConditionOnset(actorId, key, status, at);
        if (cast) out.push(cast);
      }
      continue;
    }
    if (!firstSight && conditionMsRefreshed(prev.lastMs, ms)) {
      const cast = castFromConditionOnset(actorId, key, status, at);
      if (cast) out.push(cast);
    }
    if (ms != null) prev.lastMs = ms;
  }

  const openKeys = Object.keys(byOpenKey);
  for (let i = 0; i < openKeys.length; i++) {
    const ok = openKeys[i];
    if (ok.indexOf(actorId + ":") !== 0) continue;
    if (present[ok]) continue;
    delete byOpenKey[ok];
  }
  return out;
}

export function clearConditionCastWatch(): void {
  const oks = Object.keys(byOpenKey);
  for (let i = 0; i < oks.length; i++) delete byOpenKey[oks[i]];
  const seen = Object.keys(seenActors);
  for (let i = 0; i < seen.length; i++) delete seenActors[seen[i]];
}
