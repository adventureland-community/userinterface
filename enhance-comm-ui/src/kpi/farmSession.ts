/**
 * Farm session — gold + loot on top of session kills.
 * Kill attribution stays in sessionKills; this owns chest gold/items + gold rate series.
 */

import { getObserving } from "../host/al";
import {
  onLootSubscribe,
  type LootEvent,
} from "../sockets/hub";
import {
  getNearbyMtypes,
  getRecentKillMtype,
  getStats as getKillStats,
  noteRecentKillMtypeForPreview,
  resetKillSession,
  seedSessionKillsForPreview,
  startSessionKills,
  updateKillContext,
  type MtypeKillRow,
} from "./sessionKills";

const GOLD_SERIES_MAX = 24;
const GOLD_SAMPLE_MS = 5_000;

export type FarmLootRow = {
  name: string;
  q: number;
  level?: number;
  /** Session items/min. */
  perMin: number | null;
  firstAt: number;
  lastAt: number;
};

/** Top session drop attributed to an mtype (glance chip item). */
export type FarmMtypeDrop = {
  name: string;
  q: number;
  level?: number;
  perMin: number | null;
};

export type FarmStats = ReturnType<typeof getKillStats> & {
  goldGained: number;
  goldPerMinute: number | null;
  goldPerHour: number | null;
  goldPerKill: number | null;
  goldSeries: number[];
  loot: FarmLootRow[];
  lootPerMinute: number | null;
  nearbyMtypes: string[];
  downtimePct: number | null;
  /** Top drop per mtype for glance chips (kill→chest attribution). */
  topDropByMtype: Record<string, FarmMtypeDrop>;
};

type LootBucket = {
  q: number;
  level?: number;
  firstAt: number;
  lastAt: number;
};

let goldGained = 0;
let lastGoldSample: number | null = null;
let lastGoldAt = 0;
/** Rolling gold/min samples for sparkline. */
let goldSeries: number[] = [];
let lootByName: Record<string, LootBucket> = {};
/** Chest items attributed to a kill mtype (glance portrait+item). */
let lootByMtype: Record<string, Record<string, LootBucket>> = {};
let lootStartedAt = 0;
let unsubLoot: (() => void) | null = null;
let combatAt = 0;
let idleMs = 0;
let lastTickAt = 0;
let lastKillTotal = 0;

function clearFarm(): void {
  goldGained = 0;
  lastGoldSample = null;
  lastGoldAt = 0;
  goldSeries = [];
  lootByName = {};
  lootByMtype = {};
  lootStartedAt = 0;
  idleMs = 0;
  lastTickAt = 0;
  combatAt = 0;
  lastKillTotal = 0;
}

function bumpLootBucket(
  bag: Record<string, LootBucket>,
  name: string,
  q: number,
  level: number | undefined,
  at: number,
): void {
  const prev = bag[name];
  if (!prev) {
    bag[name] = { q, level, firstAt: at, lastAt: at };
    return;
  }
  prev.q += q;
  prev.lastAt = at;
  if (level != null) prev.level = level;
}

function sampleGold(now: number): void {
  const obs = getObserving();
  if (!obs || typeof obs.gold !== "number") return;
  const g = obs.gold;
  if (lastGoldSample == null) {
    lastGoldSample = g;
    lastGoldAt = now;
    return;
  }
  if (now - lastGoldAt < GOLD_SAMPLE_MS) return;
  const delta = g - lastGoldSample;
  lastGoldSample = g;
  const elapsedMin = Math.max(now - lastGoldAt, GOLD_SAMPLE_MS) / 60_000;
  lastGoldAt = now;
  if (delta > 0) {
    goldGained += delta;
    const rate = delta / elapsedMin;
    goldSeries = goldSeries.concat([rate]);
    while (goldSeries.length > GOLD_SERIES_MAX) goldSeries.shift();
  } else if (goldSeries.length) {
    // Flat sample keeps spark alive when gold is quiet.
    goldSeries = goldSeries.concat([goldSeries[goldSeries.length - 1] * 0.85]);
    while (goldSeries.length > GOLD_SERIES_MAX) goldSeries.shift();
  }
}

/**
 * Chest loot items only. Session gold comes from observing.gold samples so
 * party chest gold is not double-counted against the watched purse.
 * Optional `fromMtype` pins attribution (preview seed); else recent kill.
 */
export function ingestFarmLoot(
  ev: LootEvent & { fromMtype?: string },
): void {
  if (!lootStartedAt) lootStartedAt = ev.at;
  const mtype = ev.fromMtype || getRecentKillMtype();
  for (let i = 0; i < ev.items.length; i++) {
    const it = ev.items[i];
    bumpLootBucket(lootByName, it.name, it.q, it.level, ev.at);
    if (mtype) {
      if (!lootByMtype[mtype]) lootByMtype[mtype] = {};
      bumpLootBucket(lootByMtype[mtype], it.name, it.q, it.level, ev.at);
    }
  }
  if (ev.gold > 0 || ev.items.length) {
    combatAt = ev.at;
  }
}

function topDropFromBag(
  bag: Record<string, LootBucket> | undefined,
  started: number,
  now: number,
): FarmMtypeDrop | undefined {
  if (!bag) return undefined;
  const names = Object.keys(bag);
  if (!names.length) return undefined;
  let bestName = names[0];
  let best = bag[bestName];
  for (let i = 1; i < names.length; i++) {
    const name = names[i];
    const row = bag[name];
    if (row.q > best.q) {
      bestName = name;
      best = row;
    }
  }
  const span = Math.max(now - (best.firstAt || started || now), 1_000) / 1000;
  return {
    name: bestName,
    q: best.q,
    level: best.level,
    perMin: best.q > 0 ? (best.q / span) * 60 : null,
  };
}

export function updateFarmContext(
  entities: Parameters<typeof updateKillContext>[0],
): void {
  const now = Date.now();
  updateKillContext(entities);
  sampleGold(now);
  const kills = getKillStats().total;
  if (kills > lastKillTotal) {
    combatAt = now;
    lastKillTotal = kills;
  }
  if (lastTickAt) {
    const gap = now - lastTickAt;
    if (combatAt && now - combatAt > 8_000) {
      idleMs += gap;
    }
  }
  lastTickAt = now;
}

export function startFarmSession(): () => void {
  const stopKills = startSessionKills();
  if (!unsubLoot) unsubLoot = onLootSubscribe(ingestFarmLoot);
  return () => {
    stopKills();
    if (unsubLoot) {
      unsubLoot();
      unsubLoot = null;
    }
  };
}

export function resetFarmSession(): void {
  resetKillSession();
  clearFarm();
}

export function getFarmStats(): FarmStats {
  const kills = getKillStats();
  const now = Date.now();
  const started = kills.sessionStartedAt || lootStartedAt;
  let goldPerMinute: number | null = null;
  let goldPerHour: number | null = null;
  if (started && goldGained > 0) {
    const elapsedSec = Math.max(now - started, 1_000) / 1000;
    goldPerMinute = (goldGained / elapsedSec) * 60;
    goldPerHour = goldPerMinute * 60;
  } else if (goldSeries.length) {
    goldPerMinute = goldSeries[goldSeries.length - 1];
    goldPerHour = goldPerMinute * 60;
  }

  const loot: FarmLootRow[] = [];
  const names = Object.keys(lootByName);
  let lootTotal = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const row = lootByName[name];
    lootTotal += row.q;
    const span = Math.max(now - (row.firstAt || started || now), 1_000) / 1000;
    loot.push({
      name,
      q: row.q,
      level: row.level,
      perMin: row.q > 0 ? (row.q / span) * 60 : null,
      firstAt: row.firstAt,
      lastAt: row.lastAt,
    });
  }
  loot.sort((a, b) => b.q - a.q);

  let lootPerMinute: number | null = null;
  if (started && lootTotal > 0) {
    const elapsedSec = Math.max(now - started, 1_000) / 1000;
    lootPerMinute = (lootTotal / elapsedSec) * 60;
  }

  const goldPerKill =
    kills.total > 0 && goldGained > 0 ? goldGained / kills.total : null;

  let downtimePct: number | null = null;
  if (started && lastTickAt) {
    const span = Math.max(lastTickAt - started, 1);
    downtimePct = Math.max(0, Math.min(100, Math.round((idleMs / span) * 100)));
  }

  // Prefer nearby types that also have kill rows, then other nearby, then top kills.
  const nearby = getNearbyMtypes(12);
  const byMap: Record<string, MtypeKillRow> = {};
  for (let i = 0; i < kills.byMtype.length; i++) {
    byMap[kills.byMtype[i].mtype] = kills.byMtype[i];
  }
  const nearbyOrdered: string[] = [];
  const pushed = new Set<string>();
  for (let i = 0; i < nearby.length; i++) {
    const mt = nearby[i];
    if (!byMap[mt] || pushed.has(mt)) continue;
    nearbyOrdered.push(mt);
    pushed.add(mt);
  }
  for (let i = 0; i < nearby.length; i++) {
    const mt = nearby[i];
    if (pushed.has(mt)) continue;
    nearbyOrdered.push(mt);
    pushed.add(mt);
  }
  if (!nearbyOrdered.length) {
    for (let i = 0; i < Math.min(4, kills.byMtype.length); i++) {
      nearbyOrdered.push(kills.byMtype[i].mtype);
    }
  }

  const topDropByMtype: Record<string, FarmMtypeDrop> = {};
  const mtypes = Object.keys(lootByMtype);
  for (let i = 0; i < mtypes.length; i++) {
    const mt = mtypes[i];
    const top = topDropFromBag(lootByMtype[mt], started, now);
    if (top) topDropByMtype[mt] = top;
  }

  return {
    ...kills,
    goldGained,
    goldPerMinute,
    goldPerHour,
    goldPerKill,
    goldSeries: goldSeries.slice(),
    loot,
    lootPerMinute,
    nearbyMtypes: nearbyOrdered,
    downtimePct,
    topDropByMtype,
  };
}

export function farmMtypeRow(
  stats: FarmStats,
  mtype: string,
): MtypeKillRow | undefined {
  for (let i = 0; i < stats.byMtype.length; i++) {
    if (stats.byMtype[i].mtype === mtype) return stats.byMtype[i];
  }
  return undefined;
}

/** Top chest drop attributed to this mtype (glance chip item). */
export function farmTopDrop(
  stats: FarmStats,
  mtype: string,
): FarmMtypeDrop | undefined {
  return stats.topDropByMtype[mtype];
}

/**
 * Overlay-only demo session for Farm council / polish shots.
 * No-op unless `window.__ecuOverlayPreview`.
 */
export function seedFarmPreviewDemo(): void {
  const w = window as Window & {
    __ecuOverlayPreview?: boolean;
    observing?: { gold?: number } | null;
  };
  if (!w.__ecuOverlayPreview) return;
  clearFarm();
  seedSessionKillsForPreview();
  const now = Date.now();
  lootStartedAt = now - 11 * 60_000;
  goldGained = 32_840;
  lastGoldSample =
    typeof w.observing?.gold === "number" ? w.observing.gold : 100_000;
  lastGoldAt = now;
  goldSeries = [
    1200, 1450, 1380, 1620, 1710, 1550, 1680, 1820, 1740, 1900, 1860, 2010,
  ];
  combatAt = now - 3_000;
  lastTickAt = now;
  const kills = getKillStats();
  lastKillTotal = kills.total;
  idleMs = 95_000;
  // Per-mtype drops so glance chips show portrait + rate + item (prototype).
  const dropPairs = [
    { name: "seashell", q: 41 },
    { name: "hpot0", q: 28 },
    { name: "mpot0", q: 19 },
    { name: "gem0", q: 3 },
    { name: "shadowstone", q: 2 },
    { name: "intearring", q: 1 },
  ];
  for (let i = 0; i < kills.byMtype.length && i < dropPairs.length; i++) {
    const mt = kills.byMtype[i].mtype;
    noteRecentKillMtypeForPreview(mt, now - 30_000 - i * 1000);
    ingestFarmLoot({
      gold: 0,
      party: true,
      at: now - 90_000 + i * 1000,
      fromMtype: mt,
      items: [dropPairs[i]],
    });
  }
  // Extra unattributed session loot still shows on Details · Loot.
  if (kills.byMtype.length < dropPairs.length) {
    ingestFarmLoot({
      gold: 0,
      party: true,
      at: now - 80_000,
      items: dropPairs.slice(kills.byMtype.length),
    });
  }
}

/** Install overlay seed hook used by council capture scripts. */
export function installFarmPreviewSeedHook(): void {
  const w = window as Window & {
    __ecuOverlayPreview?: boolean;
    __ecuSeedFarmPreview?: () => void;
  };
  if (!w.__ecuOverlayPreview) return;
  w.__ecuSeedFarmPreview = () => {
    seedFarmPreviewDemo();
  };
  seedFarmPreviewDemo();
}
