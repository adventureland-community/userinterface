import {
  getEntitiesRecord,
  getObserving,
  getObservingId,
  simpleDistance,
} from "../host/al";
import type { EntityLike } from "../host/globals";
import { loadSettings, effectiveKillScope, type PartyScope } from "../lib/settings";
import { onDamage, onKill, type DamageEvent, type KillEvent } from "../sockets/hub";

/** How long a hit/target link still counts toward kill credit. */
const ATTRIBUTION_MS = 8_000;
/** Soft range credit when monster was near a credited player. */
const NEAR_RANGE = 400;

type TargetBlame = {
  at: number;
  actors: Set<string>;
  mtype?: string;
};

type SeenMonster = {
  mtype: string;
  nearAt?: number;
  nearPartyKey?: string;
};

type KillTiming = {
  firstAt: number;
  lastAt: number;
};

const mtypeCounts: Record<string, number> = {};
const partyKillCounts: Record<string, number> = {};
const mtypeTiming: Record<string, KillTiming> = {};
const partyTiming: Record<string, KillTiming> = {};
const lastSeen = new Map<string, SeenMonster>();
const blameByTarget = new Map<string, TargetBlame>();

let totalKills = 0;
let sessionStartedAt = 0;
let trackingId: string | undefined;
let trackingName = "";
let watchedPartyIds = new Set<string>();
let watchedPartyKey = "";
/** playerId -> partyKey for all visible players (all-parties mode). */
let playerParty = new Map<string, string>();
let unsubKill: (() => void) | null = null;
let unsubDmg: (() => void) | null = null;

export type MtypeKillRow = {
  mtype: string;
  count: number;
  /** Session kills/min for this mtype (null before first kill / no session). */
  killsPerMinute: number | null;
  /**
   * Mean seconds between consecutive kills of this mtype (needs ≥2 kills).
   * Kill pace from timestamps — not HP-based TTK.
   */
  avgIntervalSec: number | null;
};

export type PartyKillRow = {
  party: string;
  count: number;
  killsPerMinute: number | null;
};

function soloKey(id: string, name?: string): string {
  return `solo:${name || id}`;
}

function clearRecord(rec: Record<string, number> | Record<string, KillTiming>): void {
  const keys = Object.keys(rec);
  for (let i = 0; i < keys.length; i++) delete rec[keys[i]];
}

function clearCounts(): void {
  clearRecord(mtypeCounts);
  clearRecord(partyKillCounts);
  clearRecord(mtypeTiming);
  clearRecord(partyTiming);
  totalKills = 0;
  sessionStartedAt = 0;
}

function noteTiming(rec: Record<string, KillTiming>, key: string, at: number): void {
  const prev = rec[key];
  if (!prev) {
    rec[key] = { firstAt: at, lastAt: at };
    return;
  }
  prev.lastAt = at;
}

function ratePerMinute(count: number, startedAt: number, now: number): number | null {
  if (!startedAt || count <= 0) return null;
  const elapsedSec = Math.max(now - startedAt, 1_000) / 1000;
  return (count / elapsedSec) * 60;
}

/** Mean inter-kill interval in seconds when ≥2 kills were timed. */
function meanIntervalSec(timing: KillTiming | undefined, count: number): number | null {
  if (!timing || count < 2) return null;
  return (timing.lastAt - timing.firstAt) / (count - 1) / 1000;
}

function ensureSession(observingId: string, name: string): void {
  if (trackingId !== observingId) {
    trackingId = observingId;
    trackingName = name || observingId;
    clearCounts();
  } else if (name) {
    trackingName = name;
  }
}

function killScope(): PartyScope {
  const stored = loadSettings().killScope || "watched";
  const observingId = getObservingId();
  const hasObserver = observingId != null && observingId !== "";
  return effectiveKillScope(stored, hasObserver);
}

function isWatchedActor(actorId: string | undefined): boolean {
  if (!actorId || !trackingId) return false;
  if (actorId === trackingId) return true;
  return watchedPartyIds.has(actorId);
}

function creditedPartyKey(actorId: string): string | undefined {
  if (killScope() === "watched") {
    if (!isWatchedActor(actorId)) return undefined;
    return watchedPartyKey || soloKey(actorId);
  }
  return playerParty.get(actorId);
}

function pruneBlame(now: number): void {
  const cutoff = now - ATTRIBUTION_MS;
  const ids = Array.from(blameByTarget.keys());
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const row = blameByTarget.get(id);
    if (!row || row.at < cutoff) blameByTarget.delete(id);
  }
}

function recordDamage(ev: DamageEvent): void {
  if (!ev.target || !ev.damage || ev.damage <= 0) return;
  if (!ev.actor) return;
  const now = ev.at;
  pruneBlame(now);
  let row = blameByTarget.get(ev.target);
  if (!row) {
    row = { at: now, actors: new Set() };
    blameByTarget.set(ev.target, row);
  }
  row.at = now;
  row.actors.add(ev.actor);
  const seen = lastSeen.get(ev.target);
  if (seen?.mtype) row.mtype = seen.mtype;
}

function attributionPartyKey(monsterId: string, now: number): string | undefined {
  const observing = getObserving();
  if (observing?.target && String(observing.target) === monsterId) {
    return watchedPartyKey || (trackingId ? soloKey(trackingId) : undefined);
  }

  pruneBlame(now);
  const blame = blameByTarget.get(monsterId);
  if (blame && blame.at >= now - ATTRIBUTION_MS) {
    const actors = Array.from(blame.actors);
    for (let i = 0; i < actors.length; i++) {
      const key = creditedPartyKey(actors[i]);
      if (key) return key;
    }
  }

  const seen = lastSeen.get(monsterId);
  if (seen?.nearAt != null && now - seen.nearAt <= ATTRIBUTION_MS) {
    if (killScope() === "all" && seen.nearPartyKey) return seen.nearPartyKey;
    if (killScope() === "watched" && trackingId) {
      return watchedPartyKey || soloKey(trackingId);
    }
  }

  return undefined;
}

function handleKill(ev: KillEvent): void {
  const scope = killScope();
  const observingId = getObservingId();

  if (scope === "watched") {
    if (!observingId) return;
    const observing = getObserving();
    ensureSession(observingId, observing?.name || observingId);
  } else if (observingId) {
    const observing = getObserving();
    ensureSession(observingId, observing?.name || observingId);
  } else if (!sessionStartedAt) {
    sessionStartedAt = ev.at;
  }

  const partyKey = attributionPartyKey(ev.id, ev.at);
  if (!partyKey) return;

  const mtype =
    lastSeen.get(ev.id)?.mtype ||
    blameByTarget.get(ev.id)?.mtype ||
    getEntitiesRecord()[ev.id]?.mtype;
  if (!mtype) return;

  mtypeCounts[mtype] = (mtypeCounts[mtype] || 0) + 1;
  partyKillCounts[partyKey] = (partyKillCounts[partyKey] || 0) + 1;
  noteTiming(mtypeTiming, mtype, ev.at);
  noteTiming(partyTiming, partyKey, ev.at);
  totalKills += 1;
  if (!sessionStartedAt) sessionStartedAt = ev.at;
  blameByTarget.delete(ev.id);
  lastSeen.delete(ev.id);
}

/**
 * Keep mtype + proximity for attribution. Call every tick with live entities.
 */
export function updateKillContext(entities: EntityLike[]): void {
  const observingId = getObservingId();
  const observing = getObserving();
  const now = Date.now();
  const nextParty = new Map<string, string>();
  const nextWatched = new Set<string>();

  if (observingId && observing) {
    ensureSession(observingId, observing.name || observingId);
    nextWatched.add(observingId);
    watchedPartyKey = observing.party || soloKey(observingId, observing.name);
    if (observing.party) {
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (ent.player && ent.party === observing.party && ent.id) {
          nextWatched.add(String(ent.id));
        }
      }
    }
  } else {
    watchedPartyKey = "";
  }
  watchedPartyIds = nextWatched;

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.player && ent.id) {
      nextParty.set(
        String(ent.id),
        ent.party || soloKey(String(ent.id), ent.name),
      );
    }
  }
  playerParty = nextParty;

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type !== "monster" || !ent.mtype || ent.id == null) continue;
    const id = String(ent.id);
    const prev = lastSeen.get(id);
    const row: SeenMonster = {
      mtype: ent.mtype,
      nearAt: prev?.nearAt,
      nearPartyKey: prev?.nearPartyKey,
    };

    if (observing) {
      const dist = simpleDistance(observing, ent);
      if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
        row.nearAt = now;
        row.nearPartyKey = watchedPartyKey || soloKey(observing.id, observing.name);
      }
    }

    if (ent.target) {
      const tid = String(ent.target);
      if (killScope() === "watched" && watchedPartyIds.has(tid)) {
        row.nearAt = now;
        row.nearPartyKey = watchedPartyKey;
      } else if (killScope() === "all" && playerParty.has(tid)) {
        row.nearAt = now;
        row.nearPartyKey = playerParty.get(tid);
      }
    }

    // Proximity to any visible player party in all-mode
    if (killScope() === "all") {
      for (let p = 0; p < entities.length; p++) {
        const pl = entities[p];
        if (!pl.player) continue;
        const dist = simpleDistance(pl, ent);
        if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
          row.nearAt = now;
          row.nearPartyKey =
            pl.party || soloKey(String(pl.id), pl.name);
          break;
        }
      }
    }

    lastSeen.set(id, row);
    const blame = blameByTarget.get(id);
    if (blame) blame.mtype = ent.mtype;
  }
}

/** @deprecated use updateKillContext */
export function updateSeenMtypes(
  entities: Array<{ id: string; mtype?: string; type?: string }>,
): void {
  updateKillContext(entities as EntityLike[]);
}

export function startSessionKills(): () => void {
  if (!unsubKill) unsubKill = onKill(handleKill);
  if (!unsubDmg) unsubDmg = onDamage(recordDamage);
  return () => {
    if (unsubKill) {
      unsubKill();
      unsubKill = null;
    }
    if (unsubDmg) {
      unsubDmg();
      unsubDmg = null;
    }
  };
}

export function resetKillSession(): void {
  clearCounts();
  blameByTarget.clear();
}

export function getStats(): {
  total: number;
  byMtype: MtypeKillRow[];
  byParty: PartyKillRow[];
  trackingId?: string;
  trackingName: string;
  sessionStartedAt: number;
  killsPerMinute: number | null;
  killsPerHour: number | null;
  killsPerDay: number | null;
  active: boolean;
  scope: PartyScope;
} {
  const now = Date.now();
  const byMtype: MtypeKillRow[] = [];
  const keys = Object.keys(mtypeCounts);
  for (let i = 0; i < keys.length; i++) {
    const mtype = keys[i];
    const count = mtypeCounts[mtype];
    byMtype.push({
      mtype,
      count,
      killsPerMinute: ratePerMinute(count, sessionStartedAt, now),
      avgIntervalSec: meanIntervalSec(mtypeTiming[mtype], count),
    });
  }
  byMtype.sort((a, b) => b.count - a.count);

  const byParty: PartyKillRow[] = [];
  const pkeys = Object.keys(partyKillCounts);
  for (let i = 0; i < pkeys.length; i++) {
    const party = pkeys[i];
    const count = partyKillCounts[party];
    byParty.push({
      party,
      count,
      killsPerMinute: ratePerMinute(count, sessionStartedAt, now),
    });
  }
  byParty.sort((a, b) => b.count - a.count);

  const scope = killScope();
  const observingId = getObservingId();
  const hasObserver = observingId != null && observingId !== "";
  const active = scope === "all" || hasObserver;

  let killsPerMinute: number | null = null;
  let killsPerHour: number | null = null;
  let killsPerDay: number | null = null;
  if (sessionStartedAt && totalKills > 0) {
    const elapsedSec = Math.max(now - sessionStartedAt, 1_000) / 1000;
    const perSec = totalKills / elapsedSec;
    killsPerMinute = perSec * 60;
    killsPerHour = perSec * 3600;
    killsPerDay = perSec * 86400;
  }

  return {
    total: totalKills,
    byMtype,
    byParty,
    trackingId: observingId || trackingId,
    trackingName: getObserving()?.name || trackingName,
    sessionStartedAt,
    killsPerMinute,
    killsPerHour,
    killsPerDay,
    active,
    scope,
  };
}
