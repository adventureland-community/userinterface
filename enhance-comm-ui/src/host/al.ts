import "./globals";
import type { EntityLike, GLike, ServerInfoLike, SocketLike } from "./globals";
import {
  markObserverCommandPending,
  scheduleObserverCommandPendingClear,
} from "./observerCommandPending";

export function getG(): GLike | undefined {
  return window.G;
}

export function getEntitiesRecord(): Record<string, EntityLike> {
  const raw = window.entities;
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: Record<string, EntityLike> = {};
    for (let i = 0; i < raw.length; i++) {
      const ent = raw[i];
      if (ent && ent.id != null) out[String(ent.id)] = ent;
    }
    mergeLocalCharacter(out);
    return out;
  }
  const out = { ...(raw as Record<string, EntityLike>) };
  mergeLocalCharacter(out);
  return out;
}

export function getEntitiesList(): EntityLike[] {
  const raw = window.entities;
  const list: EntityLike[] = !raw
    ? []
    : Array.isArray(raw)
      ? (raw.filter(Boolean) as EntityLike[])
      : Object.values(raw as Record<string, EntityLike>);
  return withLocalCharacter(list);
}

/** Self is drawn outside `entities` (game.js skips character.id). */
function mergeLocalCharacter(out: Record<string, EntityLike>): void {
  const self = getCharacter();
  if (!self || self.id == null) return;
  const id = String(self.id);
  if (!out[id]) out[id] = self;
}

function withLocalCharacter(list: EntityLike[]): EntityLike[] {
  const self = getCharacter();
  if (!self || self.id == null) return list;
  const id = String(self.id);
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].id) === id) return list;
  }
  return [self, ...list];
}

/**
 * Lookup by id with string coercion. Scans values so `DEAD${id}` bucket
 * entries (same `.id`) and number/string id mismatches still resolve.
 * Prefers a non-dead match when both exist.
 */
export function findEntityById(
  id: string | number | null | undefined,
): EntityLike | undefined {
  if (id == null || id === "") return undefined;
  const tid = String(id);
  const raw = window.entities;
  if (!raw) {
    const self = getCharacter();
    if (self && String(self.id) === tid) return self;
    return undefined;
  }

  const list: EntityLike[] = Array.isArray(raw)
    ? (raw.filter(Boolean) as EntityLike[])
    : Object.values(raw as Record<string, EntityLike>);

  let deadMatch: EntityLike | undefined;
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (!ent || String(ent.id) !== tid) continue;
    if (!ent.dead) return ent;
    if (!deadMatch) deadMatch = ent;
  }

  if (!Array.isArray(raw)) {
    const byKey = (raw as Record<string, EntityLike>)[tid];
    if (byKey && String(byKey.id) === tid) {
      if (!byKey.dead) return byKey;
      if (!deadMatch) deadMatch = byKey;
    }
  }

  if (deadMatch) return deadMatch;

  const self = getCharacter();
  if (self && String(self.id) === tid) return self;
  return undefined;
}

/**
 * Watched character for /comm. Prefer live soft entity over welcome snap.
 * `window.observing` is set once on welcome and is not refreshed by `player`
 * packets (those only update `character`, which is null while observing).
 * Live hp/target/etc. live on `entities[id]`. Fear badges use simulated
 * courage + caller-supplied aggro mobs.
 *
 * Live entity packets can omit `ctype` on later syncs; keep the welcome snap's
 * class when the live sprite lacks one so meters/frames still resolve class.
 */
export function getObserving(): EntityLike | null | undefined {
  const snap = window.observing;
  if (snap == null) return snap;
  if (snap.id != null) {
    const live = findEntityById(snap.id);
    if (live) {
      if (!live.ctype && snap.ctype) live.ctype = snap.ctype;
      return live;
    }
  }
  return snap;
}

export function getObservingId(): string | undefined {
  const obs = getObserving();
  return obs?.id != null ? String(obs.id) : undefined;
}

/** Local play / bag-borrowed self — null on /comm unless inventory borrows it. */
export function getCharacter(): EntityLike | null | undefined {
  return window.character;
}

const KNOWN_CTYPES = new Set([
  "warrior",
  "mage",
  "priest",
  "rogue",
  "ranger",
  "paladin",
  "merchant",
]);

function asCtype(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const key = v.toLowerCase();
  return KNOWN_CTYPES.has(key) ? key : undefined;
}

/**
 * Resolve player class for meters when `entities[id].ctype` is missing.
 * Order: entity → observing/character self → X.characters[].type (own roster).
 */
export function resolvePlayerCtype(
  id: string | undefined,
  ent?: EntityLike | null,
): string | undefined {
  if (!id) return undefined;
  const tid = String(id);
  const fromEnt = asCtype(ent?.ctype);
  if (fromEnt) return fromEnt;

  const live = ent || findEntityById(tid);
  const fromLive = asCtype(live?.ctype);
  if (fromLive) return fromLive;

  const observing = window.observing;
  if (
    observing &&
    (String(observing.id) === tid ||
      (observing.name != null && String(observing.name) === tid))
  ) {
    const fromObs = asCtype(observing.ctype);
    if (fromObs) return fromObs;
  }

  const character = getCharacter();
  if (
    character &&
    (String(character.id) === tid ||
      (character.name != null && String(character.name) === tid))
  ) {
    const fromChar = asCtype(character.ctype);
    if (fromChar) return fromChar;
  }

  const chars = window.X?.characters || [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!c) continue;
    if (
      (c.name != null && String(c.name) === tid) ||
      (c.id != null && String(c.id) === tid)
    ) {
      const fromX = asCtype(c.type);
      if (fromX) return fromX;
    }
  }

  return undefined;
}

export function getS(): ServerInfoLike | undefined {
  return window.S;
}

export function getSocket(): SocketLike | undefined {
  return window.socket;
}

/**
 * Observer COMMAND path: `/comm` → `o:command` → observed player's `code_eval`.
 * Returns false if socket missing / empty code.
 */
export function emitObserverCommand(code: string): boolean {
  const sock = getSocket();
  if (!sock || typeof sock.emit !== "function") return false;
  const trimmed = String(code || "").trim();
  if (!trimmed) return false;
  sock.emit("o:command", trimmed);
  markObserverCommandPending();
  scheduleObserverCommandPendingClear();
  return true;
}

export function getServerRegion(): string | undefined {
  return window.server_region;
}

export function getServerIdentifier(): string | undefined {
  return window.server_identifier;
}

/** Live camera map (`welcome` / `new_map`). Not `window.map.map_name`. */
export function getCurrentMap(): string | undefined {
  if (window.current_map) return String(window.current_map);
  const obs = getObserving();
  if (obs?.map) return String(obs.map);
  return undefined;
}

/** Live camera instance id (`welcome` / `new_map`). */
export function getCurrentIn(): string | undefined {
  if (window.current_in != null && String(window.current_in) !== "") {
    return String(window.current_in);
  }
  const obs = getObserving();
  if (obs?.in != null && String(obs.in) !== "") return String(obs.in);
  return undefined;
}

export function getMapName(): string | undefined {
  return window.map?.map_name;
}

export function simpleDistance(a: any, b: any): number {
  if (typeof window.simple_distance === "function") {
    return window.simple_distance(a, b);
  }
  const ax = a?.real_x ?? a?.x ?? 0;
  const ay = a?.real_y ?? a?.y ?? 0;
  const bx = b?.real_x ?? b?.x ?? 0;
  const by = b?.real_y ?? b?.y ?? 0;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateDifficulty(monster: any): number {
  if (typeof window.calculate_difficulty === "function") {
    return window.calculate_difficulty(monster);
  }
  return 0;
}
