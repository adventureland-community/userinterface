/**
 * Time Line lane build, scope seed, and fight origin.
 */

import { skillCooldownSec } from "../../../../lib/abilityIds";
import { conditionKind, itemSkin } from "../../../../lib/gameIcon";
import type { PartyFocus } from "../../../../lib/settingsFocus";
import { actorIdInScope } from "../../../../meters/meterQuery";
import { getPlayerMeta } from "../../../../meters/meterEngine";
import { isLiveCombatSegment, resolveSegment } from "../../../../meters/meterSession";
import { segmentRefKey } from "../../../../meters/meterSegmentRef";
import { resolvePlayerCtype } from "../../../../host/al";
import type {
  CastMarker,
  CombatSegment,
  ConditionInterval,
  GearSwapEvent,
  SegmentRef,
} from "../../../../meters/meterTypes";
import type { TimelineBlock, TimelineLane, TlFilter } from "./timelineModel";
import { laneCatsFromBlocks, skillKey } from "./timelineModel";
import { gearItemLabel, prettyKey } from "./timelineFormat";

export function buildActorMaps(segmentRef?: SegmentRef): {
  names: Record<string, string>;
  ctypes: Record<string, string | undefined>;
} {
  const names: Record<string, string> = {};
  const ctypes: Record<string, string | undefined> = {};
  const seg = resolveSegment(segmentRef);
  const liveRoster = !!(seg && isLiveCombatSegment(seg));
  if (liveRoster) {
    const meta = getPlayerMeta();
    const metaIds = Object.keys(meta);
    for (let i = 0; i < metaIds.length; i++) {
      const id = metaIds[i];
      names[id] = meta[id].name;
      ctypes[id] = meta[id].ctype;
    }
  }
  if (seg) {
    const meta = liveRoster ? null : getPlayerMeta();
    const actorIds = Object.keys(seg.actors);
    for (let i = 0; i < actorIds.length; i++) {
      const a = seg.actors[actorIds[i]];
      const extra = meta ? meta[a.id] : undefined;
      names[a.id] = a.name || extra?.name || names[a.id] || a.id;
      ctypes[a.id] =
        a.ctype || extra?.ctype || ctypes[a.id] || resolvePlayerCtype(a.id) || undefined;
      if (!a.ctype && ctypes[a.id]) a.ctype = ctypes[a.id];
    }
  }
  return { names, ctypes };
}

export function fillCastNextSame(blocks: TimelineBlock[]): void {
  const nextAt: Record<string, number> = {};
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.kind !== "cast") continue;
    const k = skillKey(b);
    if (nextAt[k] != null) b.nextSameAtSec = nextAt[k];
    nextAt[k] = b.atSec;
  }
}

export function eventsInScope<T>(
  items: T[],
  idOf: (item: T) => string,
  seg: CombatSegment | null | undefined,
  partyFocus: PartyFocus | undefined,
): T[] {
  if (!seg) return items;
  const out: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (actorIdInScope(idOf(items[i]), seg, partyFocus)) out.push(items[i]);
  }
  return out;
}

export function laneIdFor(
  actorId: string,
  names: Record<string, string>,
): string {
  if (names[actorId]) return actorId;
  const ids = Object.keys(names);
  for (let i = 0; i < ids.length; i++) {
    if (names[ids[i]] === actorId) return ids[i];
  }
  return actorId;
}

/**
 * Seed in-scope rows, even with zero events.
 * Live camera: vision roster. Stored fights: only actors on that fight.
 */
export function seedScopeLanes(
  byId: Record<string, TimelineLane>,
  ensure: (id: string, fallbackName?: string) => TimelineLane,
  seg: CombatSegment | null | undefined,
  partyFocus: PartyFocus | undefined,
): void {
  if (seg && isLiveCombatSegment(seg)) {
    const meta = getPlayerMeta();
    const metaIds = Object.keys(meta);
    for (let i = 0; i < metaIds.length; i++) {
      const id = metaIds[i];
      if (!actorIdInScope(id, seg, partyFocus)) continue;
      ensure(id, meta[id]?.name);
    }
  }
  if (!seg) return;
  const actorIds = Object.keys(seg.actors);
  for (let i = 0; i < actorIds.length; i++) {
    const id = actorIds[i];
    const a = seg.actors[id];
    if (!a.ctype && /^\d+$/.test(a.id)) continue;
    if (!actorIdInScope(id, seg, partyFocus)) continue;
    ensure(id, a.name);
  }
}

export function laneDataSig(
  casts: CastMarker[],
  conditions: ConditionInterval[],
  gearSwaps: GearSwapEvent[],
  filter: TlFilter,
  start: number,
  rosterSig: string,
  deathCount: number,
): string {
  const c0 = casts.length ? casts[0].at : 0;
  const c1 = casts.length ? casts[casts.length - 1].at : 0;
  const g1 = gearSwaps.length ? gearSwaps[gearSwaps.length - 1].at : 0;
  let ended = 0;
  let lastCond = 0;
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (c.endedAt) ended++;
    if (c.startedAt > lastCond) lastCond = c.startedAt;
  }
  return `${filter}|${start}|${rosterSig}|${deathCount}|${casts.length}:${c0}:${c1}|${conditions.length}:${ended}:${lastCond}|${gearSwaps.length}:${g1}`;
}

export function rosterSigNow(): string {
  const meta = getPlayerMeta();
  const ids = Object.keys(meta);
  ids.sort();
  let s = "";
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    s += `${id}:${meta[id].name}:${meta[id].ctype || ""};`;
  }
  return s;
}

export function conditionsEndedCount(cs: ConditionInterval[]): number {
  let n = 0;
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].endedAt) n++;
  }
  return n;
}

/** Current vs past picker + live fight id. Same-fight scroll-back is not this. */
export function timelineFightKey(
  segmentRef: SegmentRef | undefined,
  seg: { id: string; startedAt: number } | null | undefined,
): string {
  const refKey = segmentRef ? segmentRefKey(segmentRef) : "current";
  if (!seg) return `${refKey}:empty`;
  return `${refKey}:${seg.id}:${seg.startedAt}`;
}

export function timelineOriginMs(
  seg: { startedAt?: number; endedAt?: number } | null | undefined,
  casts: CastMarker[],
  conditions: ConditionInterval[],
  deaths: Array<{ at: number }>,
  gearSwaps: Array<{ at: number }>,
  now: number,
): number {
  let start = now;
  if (seg && seg.startedAt) start = seg.startedAt;
  for (let i = 0; i < conditions.length; i++) {
    start = Math.min(start, conditions[i].startedAt);
  }
  for (let i = 0; i < casts.length; i++) {
    start = Math.min(start, casts[i].at);
  }
  for (let i = 0; i < deaths.length; i++) {
    start = Math.min(start, deaths[i].at);
  }
  for (let i = 0; i < gearSwaps.length; i++) {
    start = Math.min(start, gearSwaps[i].at);
  }
  return start;
}

export function buildLanes(
  casts: CastMarker[],
  conditions: ConditionInterval[],
  deaths: Array<{ id: string; name: string; at: number }>,
  gearSwaps: GearSwapEvent[],
  start: number,
  filter: TlFilter,
  names: Record<string, string>,
  ctypes: Record<string, string | undefined>,
  seg?: CombatSegment | null,
  partyFocus?: PartyFocus,
): TimelineLane[] {
  const byId: Record<string, TimelineLane> = {};

  const ensure = (id: string, fallbackName?: string): TimelineLane => {
    const lid = laneIdFor(id, names);
    if (!byId[lid]) {
      byId[lid] = {
        id: lid,
        name: names[lid] || fallbackName || names[id] || id,
        ctype: ctypes[lid] || ctypes[id],
        blocks: [],
        cats: [],
      };
    }
    return byId[lid];
  };

  seedScopeLanes(byId, ensure, seg, partyFocus);

  const wantCds = filter === "all" || filter === "cds";
  const wantBuffs = filter === "all" || filter === "buffs";
  const wantDebuffs = filter === "all" || filter === "debuffs";
  const wantGear = filter === "all" || filter === "gear";

  if (wantBuffs || wantDebuffs) {
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const ck = conditionKind(c.key);
      if (ck === "buff" && !wantBuffs) continue;
      if (ck === "debuff" && !wantDebuffs) continue;
      const lane = ensure(c.actorId);
      const t0 = Math.max(0, (c.startedAt - start) / 1000);
      // Open auras: cooltip uses Date.now(); do not grow durationSec every tick.
      const t1 = c.endedAt ? Math.max(t0, (c.endedAt - start) / 1000) : t0;
      lane.blocks.push({
        kind: "condition",
        domKey: `cond:${c.actorId}:${c.startedAt}:${c.key}`,
        key: c.key,
        label: prettyKey(c.key),
        atSec: t0,
        durationSec: t1 - t0,
        startedAtMs: c.startedAt,
        isOpen: !c.endedAt,
        condKind: ck,
        source: lane.name,
        actorId: c.actorId,
      });
    }
  }

  if (wantCds) {
    // Cooldowns — AL casts stand in for CLEU cooldown hooks.
    // Attack / share:attack use recorded cast.attackMs only (never live frequency).
    for (let i = 0; i < casts.length; i++) {
      const c = casts[i];
      const lane = ensure(c.actorId);
      const t0 = Math.max(0, (c.at - start) / 1000);
      const src = c.source || "attack";
      lane.blocks.push({
        kind: "cast",
        domKey: `cast:${c.actorId}:${c.at}:${c.pid ?? ""}:${src}`,
        key: src,
        label: prettyKey(src),
        atSec: t0,
        durationSec: skillCooldownSec(src, c.attackMs),
        source: lane.name,
        actorId: c.actorId,
      });
    }
  }

  if (wantGear) {
    for (let i = 0; i < gearSwaps.length; i++) {
      const g = gearSwaps[i];
      const itemName = g.newName || g.oldName;
      if (!itemName) continue;
      const lane = ensure(g.actorId);
      const t0 = Math.max(0, (g.at - start) / 1000);
      const label = gearItemLabel(
        itemName,
        g.newName ? g.newLevel : g.oldLevel,
      );
      const oldSkin = g.oldName ? itemSkin(g.oldName) || undefined : undefined;
      // Pin: prefer new item (+ its skin); unequip falls back to old.
      // Simultaneous MH+OH share `g.at` and stack at one X on the track.
      lane.blocks.push({
        kind: "gear",
        domKey: `gear:${g.actorId}:${g.at}:${g.slot}:${itemName}`,
        key: itemName,
        label,
        atSec: t0,
        durationSec: 0,
        source: lane.name,
        actorId: g.actorId,
        slot: g.slot,
        oldName: g.oldName,
        oldLevel: g.oldLevel,
        oldSkin,
        newName: g.newName,
        newLevel: g.newLevel,
        skin: g.skin || oldSkin || itemSkin(itemName),
      });
    }
  }

  // Death pins on every mode (Details PlaceDeathPins on CD/Debuff rows).
  for (let i = 0; i < deaths.length; i++) {
    const d = deaths[i];
    const lane = ensure(d.id, d.name);
    const t0 = Math.max(0, (d.at - start) / 1000);
    lane.blocks.push({
      kind: "death",
      domKey: `death:${d.id}:${d.at}`,
      key: "death",
      label: `${d.name || lane.name} died`,
      atSec: t0,
      durationSec: 0,
      source: lane.name,
      actorId: d.id,
    });
  }

  const ids = Object.keys(byId);
  ids.sort((a, b) => {
    const na = byId[a].name.toLowerCase();
    const nb = byId[b].name.toLowerCase();
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  });
  const lanes: TimelineLane[] = [];
  for (let i = 0; i < ids.length; i++) {
    const lane = byId[ids[i]];
    lane.blocks.sort((x, y) => x.atSec - y.atSec);
    fillCastNextSame(lane.blocks);
    lane.cats = laneCatsFromBlocks(lane.blocks);
    lanes.push(lane);
  }
  return lanes;
}
