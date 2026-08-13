/**
 * Seal/draft tape packing. Live RAM stays object arrays; pack only on write.
 * SoA: one TypedArray per column. Dictionary pool on string values only.
 */

import type {
  CastMarker,
  CombatSegment,
  ConditionInterval,
  GearSwapEvent,
} from "./meterTypes";

export type SegmentAgg = Omit<
  CombatSegment,
  "casts" | "gearSwaps" | "conditions"
>;

export type PackedTapes = {
  v: 1;
  pool: string[];
  castAt: Uint32Array;
  castActor: Uint16Array;
  castSource: Uint16Array;
  castTarget: Uint16Array;
  castPid: Uint16Array;
  gearAt: Uint32Array;
  gearActor: Uint16Array;
  gearSlot: Uint16Array;
  gearOldName: Uint16Array;
  gearNewName: Uint16Array;
  gearOldLevel: Int32Array;
  gearNewLevel: Int32Array;
  gearSkin: Uint16Array;
  condActor: Uint16Array;
  condKey: Uint16Array;
  condStart: Uint32Array;
  condEnd: Uint32Array;
};

type PoolState = {
  pool: string[];
  idx: Record<string, number>;
};

function intern(state: PoolState, s: string | undefined): number {
  const v = s || "";
  const hit = state.idx[v];
  if (hit != null) return hit;
  const i = state.pool.length;
  state.pool.push(v);
  state.idx[v] = i;
  return i;
}

function relAt(at: number, startedAt: number): number {
  const d = at - startedAt;
  if (d < 0) return 0;
  if (d > 0xffffffff) return 0xffffffff;
  return d >>> 0;
}

function levelOrMissing(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : -1;
}

export function toAgg(seg: CombatSegment): SegmentAgg {
  return {
    id: seg.id,
    startedAt: seg.startedAt,
    endedAt: seg.endedAt,
    label: seg.label,
    outcome: seg.outcome,
    seq: seg.seq,
    observingId: seg.observingId,
    observingName: seg.observingName,
    observingCtype: seg.observingCtype,
    map: seg.map,
    mapIn: seg.mapIn,
    event: seg.event,
    serverRegion: seg.serverRegion,
    serverIdentifier: seg.serverIdentifier,
    partyKey: seg.partyKey,
    closeReason: seg.closeReason,
    kind: seg.kind,
    favorite: seg.favorite ? true : undefined,
    actors: seg.actors,
    deaths: seg.deaths,
  };
}

export function packTapes(seg: CombatSegment): PackedTapes {
  const startedAt = seg.startedAt || 0;
  const state: PoolState = { pool: [""], idx: { "": 0 } };
  const casts = seg.casts || [];
  const nC = casts.length;
  const castAt = new Uint32Array(nC);
  const castActor = new Uint16Array(nC);
  const castSource = new Uint16Array(nC);
  const castTarget = new Uint16Array(nC);
  const castPid = new Uint16Array(nC);
  for (let i = 0; i < nC; i++) {
    const c = casts[i];
    castAt[i] = relAt(c.at, startedAt);
    castActor[i] = intern(state, c.actorId);
    castSource[i] = intern(state, c.source);
    castTarget[i] = intern(state, c.targetId);
    castPid[i] = intern(
      state,
      c.pid == null ? "" : String(c.pid),
    );
  }
  const gears = seg.gearSwaps || [];
  const nG = gears.length;
  const gearAt = new Uint32Array(nG);
  const gearActor = new Uint16Array(nG);
  const gearSlot = new Uint16Array(nG);
  const gearOldName = new Uint16Array(nG);
  const gearNewName = new Uint16Array(nG);
  const gearOldLevel = new Int32Array(nG);
  const gearNewLevel = new Int32Array(nG);
  const gearSkin = new Uint16Array(nG);
  for (let i = 0; i < nG; i++) {
    const g = gears[i];
    gearAt[i] = relAt(g.at, startedAt);
    gearActor[i] = intern(state, g.actorId);
    gearSlot[i] = intern(state, g.slot);
    gearOldName[i] = intern(state, g.oldName);
    gearNewName[i] = intern(state, g.newName);
    gearOldLevel[i] = levelOrMissing(g.oldLevel);
    gearNewLevel[i] = levelOrMissing(g.newLevel);
    gearSkin[i] = intern(state, g.skin);
  }
  const conds = seg.conditions || [];
  const nK = conds.length;
  const condActor = new Uint16Array(nK);
  const condKey = new Uint16Array(nK);
  const condStart = new Uint32Array(nK);
  const condEnd = new Uint32Array(nK);
  for (let i = 0; i < nK; i++) {
    const k = conds[i];
    condActor[i] = intern(state, k.actorId);
    condKey[i] = intern(state, k.key);
    condStart[i] = relAt(k.startedAt, startedAt);
    condEnd[i] = k.endedAt == null ? 0 : relAt(k.endedAt, startedAt) || 1;
  }
  return {
    v: 1,
    pool: state.pool,
    castAt,
    castActor,
    castSource,
    castTarget,
    castPid,
    gearAt,
    gearActor,
    gearSlot,
    gearOldName,
    gearNewName,
    gearOldLevel,
    gearNewLevel,
    gearSkin,
    condActor,
    condKey,
    condStart,
    condEnd,
  };
}

function poolAt(pool: string[], i: number): string {
  return pool[i] || "";
}

function unpackCasts(t: PackedTapes, startedAt: number): CastMarker[] {
  const n = t.castAt.length;
  const out: CastMarker[] = [];
  for (let i = 0; i < n; i++) {
    const target = poolAt(t.pool, t.castTarget[i]);
    const pidRaw = poolAt(t.pool, t.castPid[i]);
    const row: CastMarker = {
      at: startedAt + t.castAt[i],
      actorId: poolAt(t.pool, t.castActor[i]),
      source: poolAt(t.pool, t.castSource[i]) || "attack",
    };
    if (target) row.targetId = target;
    if (pidRaw) row.pid = pidRaw;
    out.push(row);
  }
  return out;
}

function unpackGear(t: PackedTapes, startedAt: number): GearSwapEvent[] {
  const n = t.gearAt.length;
  const out: GearSwapEvent[] = [];
  for (let i = 0; i < n; i++) {
    const oldName = poolAt(t.pool, t.gearOldName[i]);
    const newName = poolAt(t.pool, t.gearNewName[i]);
    const skin = poolAt(t.pool, t.gearSkin[i]);
    const row: GearSwapEvent = {
      at: startedAt + t.gearAt[i],
      actorId: poolAt(t.pool, t.gearActor[i]),
      slot: poolAt(t.pool, t.gearSlot[i]),
    };
    if (oldName) row.oldName = oldName;
    if (newName) row.newName = newName;
    if (t.gearOldLevel[i] >= 0) row.oldLevel = t.gearOldLevel[i];
    if (t.gearNewLevel[i] >= 0) row.newLevel = t.gearNewLevel[i];
    if (skin) row.skin = skin;
    out.push(row);
  }
  return out;
}

function unpackConds(t: PackedTapes, startedAt: number): ConditionInterval[] {
  const n = t.condActor.length;
  const out: ConditionInterval[] = [];
  for (let i = 0; i < n; i++) {
    const row: ConditionInterval = {
      actorId: poolAt(t.pool, t.condActor[i]),
      key: poolAt(t.pool, t.condKey[i]),
      startedAt: startedAt + t.condStart[i],
    };
    if (t.condEnd[i]) row.endedAt = startedAt + t.condEnd[i];
    out.push(row);
  }
  return out;
}

export function unpackTapes(agg: SegmentAgg, tapes: PackedTapes): CombatSegment {
  const startedAt = agg.startedAt || 0;
  return {
    ...agg,
    casts: tapes && tapes.v === 1 ? unpackCasts(tapes, startedAt) : [],
    gearSwaps: tapes && tapes.v === 1 ? unpackGear(tapes, startedAt) : [],
    conditions: tapes && tapes.v === 1 ? unpackConds(tapes, startedAt) : [],
  };
}

export function packSegment(seg: CombatSegment): {
  agg: SegmentAgg;
  tapes: PackedTapes;
} {
  return { agg: toAgg(seg), tapes: packTapes(seg) };
}
