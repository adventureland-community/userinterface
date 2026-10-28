/**
 * Craft / exchange / dismantle station access — computer OR sell_dist (400).
 * Mirrors adventureland_mongodb server checks (B.sell_dist, player.computer).
 */

import { getG, getObserving, simpleDistance } from "../host/al";
import type { EntityLike, GLike } from "../host/globals";

/** Server `B.sell_dist` for craft / exchange / dismantle / shops. */
export const STATION_SELL_DIST = 400;

export type StationCoords = {
  map: string;
  x: number;
  y: number;
  id?: string;
};

export type StationAccess = {
  ok: boolean;
  /** True when bag holds computer / supercomputer. */
  hasComputer: boolean;
  /** True when on the station map and within sell_dist. */
  inRange: boolean;
  station: StationCoords | null;
  /** Human reason when !ok. */
  reason?: string;
};

const COMPUTER_NAMES: Record<string, true> = {
  computer: true,
  supercomputer: true,
};

function liveObservingItems(): Array<{ name?: string } | null | undefined> | null {
  if (typeof window === "undefined") return null;
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return null;
  return obs.items;
}

/** Observed bag holds a computer (server sets player.computer from these). */
export function observingHasComputer(
  items?: Array<{ name?: string } | null | undefined> | null,
): boolean {
  const bag = items || liveObservingItems();
  if (!bag) return false;
  for (let i = 0; i < bag.length; i++) {
    const it = bag[i];
    if (it && it.name && COMPUTER_NAMES[String(it.name)]) return true;
  }
  return false;
}

/**
 * Client equivalent of server `get_npc_coords(id)` — first `G.maps[*].ref[id]`.
 */
export function findNpcCoords(
  npcId: string,
  G?: GLike | null,
): StationCoords | null {
  const g = G || getG();
  const id = String(npcId || "").trim();
  if (!g || !g.maps || !id) return null;
  const mapNames = Object.keys(g.maps);
  for (let i = 0; i < mapNames.length; i++) {
    const mapName = mapNames[i];
    const map = g.maps[mapName];
    const ref = map && (map as { ref?: Record<string, any> }).ref;
    if (!ref || !ref[id]) continue;
    const c = ref[id];
    const x = Number(c.x);
    const y = Number(c.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    return {
      map: String(c.map || mapName),
      x,
      y,
      id: String(c.id || id),
    };
  }
  return null;
}

/** Exchange shrine: item.quest → G.quests[quest], else G.maps.main.exchange. */
export function exchangeStationForItem(
  itemName: string,
  G?: GLike | null,
): StationCoords | null {
  const g = G || getG();
  if (!g) return null;
  const def = g.items && g.items[itemName];
  const quest = def && def.quest != null ? String(def.quest) : "";
  if (quest) {
    const quests = (g as GLike & { quests?: Record<string, any> }).quests;
    const q = quests && quests[quest];
    if (q && Number.isFinite(Number(q.x)) && Number.isFinite(Number(q.y))) {
      return {
        map: String(q.map || q.in || "main"),
        x: Number(q.x),
        y: Number(q.y),
        id: String(q.id || quest),
      };
    }
    const byNpc = findNpcCoords(quest, g);
    if (byNpc) return byNpc;
  }
  const main = g.maps && g.maps.main;
  const exch = main && (main as { exchange?: any }).exchange;
  if (exch && Number.isFinite(Number(exch.x)) && Number.isFinite(Number(exch.y))) {
    return {
      map: String(exch.map || "main"),
      x: Number(exch.x),
      y: Number(exch.y),
      id: String(exch.id || "exchange"),
    };
  }
  return findNpcCoords("exchange", g);
}

/** Craft station: recipe.quest NPC, else craftsman. */
export function craftStationForRecipe(
  outputName: string,
  G?: GLike | null,
): StationCoords | null {
  const g = G || getG();
  if (!g) return null;
  const craftMap = (g as GLike & { craft?: Record<string, any> }).craft;
  const recipe = craftMap && craftMap[outputName];
  const quest = recipe && recipe.quest != null ? String(recipe.quest) : "";
  if (quest) {
    const byNpc = findNpcCoords(quest, g);
    if (byNpc) return byNpc;
  }
  return findNpcCoords("craftsman", g);
}

/** Dismantle always uses craftsman (server: G.maps.main.ref.craftsman). */
export function dismantleStation(G?: GLike | null): StationCoords | null {
  return findNpcCoords("craftsman", G || getG());
}

/** Map shrine coords from `G.maps.main.upgrade` / `.compound` (newupgrade NPC). */
function mainShrineCoords(
  kind: "upgrade" | "compound",
  G?: GLike | null,
): StationCoords | null {
  const g = G || getG();
  const main = g && g.maps && g.maps.main;
  const shrine = main && (main as Record<string, any>)[kind];
  if (shrine && Number.isFinite(Number(shrine.x)) && Number.isFinite(Number(shrine.y))) {
    return {
      map: String(shrine.map || "main"),
      x: Number(shrine.x),
      y: Number(shrine.y),
      id: String(shrine.id || kind),
    };
  }
  // Fallback: NPC id often matches shrine role.
  return findNpcCoords(kind, g);
}

export function upgradeStation(G?: GLike | null): StationCoords | null {
  return mainShrineCoords("upgrade", G);
}

export function compoundStation(G?: GLike | null): StationCoords | null {
  return mainShrineCoords("compound", G);
}

function distToStation(
  ent: EntityLike,
  station: StationCoords,
): number {
  if (typeof window !== "undefined" && typeof window.simple_distance === "function") {
    return simpleDistance(ent, station);
  }
  const ax = ent.real_x ?? ent.x ?? 0;
  const ay = ent.real_y ?? ent.y ?? 0;
  const dx = Number(ax) - station.x;
  const dy = Number(ay) - station.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function entityAtStation(
  ent: EntityLike | null | undefined,
  station: StationCoords | null,
): { inRange: boolean; dist?: number } {
  if (!ent || !station) return { inRange: false };
  const entMap = ent.map != null ? String(ent.map) : "";
  if (entMap && entMap !== station.map) return { inRange: false };
  const dist = distToStation(ent, station);
  if (!Number.isFinite(dist)) return { inRange: false };
  return { inRange: dist <= STATION_SELL_DIST, dist };
}

function resolveObservedEntity(
  explicit?: EntityLike | null,
): EntityLike | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return null;
  try {
    return getObserving() || window.observing || null;
  } catch {
    return window.observing || null;
  }
}

export function evaluateStationAccess(
  station: StationCoords | null,
  options?: {
    items?: Array<{ name?: string } | null | undefined> | null;
    entity?: EntityLike | null;
  },
): StationAccess {
  const hasComputer = observingHasComputer(options && options.items);
  if (hasComputer) {
    return {
      ok: true,
      hasComputer: true,
      inRange: true,
      station,
    };
  }
  const ent = resolveObservedEntity(options && options.entity);
  const { inRange, dist } = entityAtStation(ent, station);
  if (inRange) {
    return {
      ok: true,
      hasComputer: false,
      inRange: true,
      station,
    };
  }
  const where = station
    ? station.id || station.map
    : "station";
  const distLabel =
    dist != null && Number.isFinite(dist)
      ? ` · ${Math.round(dist)}px`
      : "";
  return {
    ok: false,
    hasComputer: false,
    inRange: false,
    station,
    reason: station
      ? `Need computer or within ${STATION_SELL_DIST}px of ${where}${distLabel}`
      : "Need computer or a nearby station",
  };
}
