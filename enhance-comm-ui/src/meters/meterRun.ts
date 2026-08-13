/**
 * Instance vs world-event runs.
 * G/S shapes are from adventureland_mongodb main (`design/events.js`,
 * `design/maps.js`, `node/server_functions.js` E / `server_info`).
 */

import { getG, getS } from "../host/al";
import type { CombatSegment, SegmentRef } from "./meterTypes";

export function isInstanceMap(map: string | undefined): boolean {
  if (!map) return false;
  return !!getG()?.maps?.[map]?.instance;
}

export function isPvpMap(map: string | undefined): boolean {
  if (!map) return false;
  return !!getG()?.maps?.[map]?.pvp;
}

export function isProtectedInstance(
  map: string | undefined,
  mapIn: string | undefined,
  protectMapIn: string,
): boolean {
  return !!protectMapIn && !!mapIn && mapIn === protectMapIn && isInstanceMap(map);
}

function sObject(name: string): Record<string, any> | null {
  const entry = getS()?.[name];
  if (!entry || typeof entry !== "object") return null;
  return entry;
}

function eventIsActive(name: string): boolean {
  const entry = sObject(name);
  if (!entry) return false;
  if ("live" in entry) return !!entry.live;
  return true;
}

function eventIsJoinable(name: string): boolean {
  return !!getG()?.events?.[name]?.join;
}

function mapHostsEventMonster(map: string, eventName: string): boolean {
  const monsters = getG()?.maps?.[map]?.monsters;
  if (!monsters) return false;
  for (let i = 0; i < monsters.length; i++) {
    if (monsters[i]?.type === eventName) return true;
  }
  return false;
}

/** Joinable G.events, live G.monsters on S, or ignore (seasonal / noise). */
function classifyEventName(name: string): "join" | "monster" | null {
  if (!name || name === "schedule") return null;
  if (eventIsJoinable(name)) return eventIsActive(name) ? "join" : null;
  if (getG()?.events?.[name]) return null;
  if (getG()?.monsters?.[name] && eventIsActive(name)) return "monster";
  return null;
}

function onThisMap(name: string, map: string): boolean {
  const entry = sObject(name);
  if (entry && entry.map === map) return true;
  return mapHostsEventMonster(map, name);
}

/**
 * Meter run event on this camera map: joinable first, else a live `S`
 * world monster. `prefer` keeps the stamped fight from flipping if two
 * monsters are live on the same map (halloween bosses).
 */
export function eventOnMap(
  map: string | undefined,
  prefer?: string,
): string | undefined {
  if (!map) return undefined;
  const mapped = getG()?.maps?.[map]?.event;
  if (
    mapped &&
    classifyEventName(mapped) === "join" &&
    (map === mapped || eventIsActive(mapped))
  ) {
    return mapped;
  }
  let join: string | undefined;
  let monster: string | undefined;
  const S = getS();
  if (S) {
    const names = Object.keys(S);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const kind = classifyEventName(name);
      if (!kind || !onThisMap(name, map)) continue;
      if (kind === "join" && !join) join = name;
      if (kind === "monster" && !monster) monster = name;
    }
  }
  if (join) return join;
  if (
    prefer &&
    classifyEventName(prefer) === "monster" &&
    onThisMap(prefer, map)
  ) {
    return prefer;
  }
  if (monster) return monster;
  const events = getG()?.events;
  if (!events) return undefined;
  const names = Object.keys(events);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (classifyEventName(name) !== "join") continue;
    if (mapHostsEventMonster(map, name)) return name;
  }
  return undefined;
}

/**
 * Details battleground analog: do not idle-split while on a PvP map, a
 * map with `G.maps[].event`, or a stamped live world event / S monster.
 */
export function suppressIdleBreak(
  map: string | undefined,
  event: string | undefined,
): boolean {
  if (event) return true;
  if (isPvpMap(map)) return true;
  if (map && getG()?.maps?.[map]?.event) return true;
  return false;
}

export function eventDisplayName(event: string): string {
  return (
    getG()?.events?.[event]?.name || getG()?.monsters?.[event]?.name || event
  );
}

export function mapDisplayName(map: string): string {
  return getG()?.maps?.[map]?.name || map;
}

/** Picker overall for a stored fight, if it belongs to a run. */
export function runRefForSegment(
  seg: Pick<CombatSegment, "map" | "mapIn" | "event">,
): SegmentRef | null {
  if (seg.map && isInstanceMap(seg.map) && seg.mapIn) {
    return { mapIn: seg.mapIn };
  }
  if (seg.event) return { event: seg.event };
  return null;
}
