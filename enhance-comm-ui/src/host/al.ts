import "./globals";
import type { EntityLike, GLike, ServerInfoLike, SocketLike } from "./globals";
import { resolveObserverFear } from "../lib/fear";

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
    return out;
  }
  return raw as Record<string, EntityLike>;
}

export function getEntitiesList(): EntityLike[] {
  const raw = window.entities;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean) as EntityLike[];
  return Object.values(raw);
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
  if (!raw) return undefined;

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

  return deadMatch;
}

/**
 * Watched character for /comm. Soft stranger sync omits fear; we never trust
 * welcome `fear` either. Courage pools are noted from welcome, then fear is
 * estimated each tick from live monster aggro on the watched id.
 */
export function getObserving(): EntityLike | null | undefined {
  const snap = window.observing;
  if (snap == null) return snap;
  if (snap.id != null) {
    const live = findEntityById(snap.id);
    if (live) {
      const fear = resolveObserverFear(live, snap, getEntitiesList());
      if (typeof fear === "number") {
        const liveFear = (live as { fear?: number }).fear;
        if (liveFear === fear) return live;
        if (fear === 0 && typeof liveFear !== "number") return live;
        return { ...live, fear };
      }
      return live;
    }
  }
  return snap;
}

export function getObservingId(): string | undefined {
  const obs = getObserving();
  return obs?.id != null ? String(obs.id) : undefined;
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
  return true;
}

export function getServerRegion(): string | undefined {
  return window.server_region;
}

export function getServerIdentifier(): string | undefined {
  return window.server_identifier;
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
