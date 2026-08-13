/**
 * Hysteresis helpers so roster/threat UI does not flash every tick at
 * vision / aggro edges.
 */

import type { EntityLike } from "../host/globals";

/** True only for real death — stock also sets dead="vision" for cull. */
export function isActuallyDead(entity: EntityLike | null | undefined): boolean {
  return !!entity && entity.dead === true;
}

/** Keep threat rows this long after their last live aggro mob disappears. */
export const THREAT_STICKY_MS = 1400;

type ThreatSticky = {
  until: number;
  mobs: EntityLike[];
  name: string;
};

const threatStickyById = new Map<string, ThreatSticky>();

function isLiveAggroMob(ent: EntityLike): boolean {
  // Drop vision cull + real corpses from threat chips.
  if (ent.dead) return false;
  return ent.type === "monster" && !!ent.target;
}

/**
 * Live aggro map plus short sticky retention so Franky vision flaps
 * do not add/remove Threat rows every frame.
 */
export function stickyAggroByTarget(
  liveByTarget: Record<string, EntityLike[]> | null | undefined,
  resolveName: (tid: string) => string,
  now: number = Date.now(),
): Record<string, EntityLike[]> {
  const live = liveByTarget || {};
  const liveIds = Object.keys(live);
  for (let i = 0; i < liveIds.length; i++) {
    const tid = liveIds[i];
    const raw = live[tid] || [];
    const mobs: EntityLike[] = [];
    for (let j = 0; j < raw.length; j++) {
      if (isLiveAggroMob(raw[j])) mobs.push(raw[j]);
    }
    if (mobs.length === 0) {
      delete live[tid];
      continue;
    }
    live[tid] = mobs;
    threatStickyById.set(tid, {
      until: now + THREAT_STICKY_MS,
      mobs,
      name: resolveName(tid),
    });
  }

  const out: Record<string, EntityLike[]> = {};
  const liveKeys = Object.keys(live);
  for (let i = 0; i < liveKeys.length; i++) {
    out[liveKeys[i]] = live[liveKeys[i]];
  }

  const stickyIds = Array.from(threatStickyById.keys());
  for (let i = 0; i < stickyIds.length; i++) {
    const tid = stickyIds[i];
    const sticky = threatStickyById.get(tid);
    if (!sticky) continue;
    if (now > sticky.until) {
      threatStickyById.delete(tid);
      continue;
    }
    if (!out[tid]) {
      // Hold last membership so row height/order stay put briefly.
      out[tid] = sticky.mobs;
    }
  }

  return out;
}

/** Stable Threat sort: observed first, then name — never by flapping counts. */
export function sortThreatTargetIds(
  targetIds: string[],
  observingId: string | undefined,
  nameOf: (tid: string) => string,
): string[] {
  const ids = targetIds.slice();
  ids.sort((a, b) => {
    if (observingId) {
      if (a === observingId) return -1;
      if (b === observingId) return 1;
    }
    const na = nameOf(a);
    const nb = nameOf(b);
    const cmp = na.localeCompare(nb);
    if (cmp !== 0) return cmp;
    return a.localeCompare(b);
  });
  return ids;
}
