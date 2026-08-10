import "./globals";
import type { EntityLike, GLike, ServerInfoLike, SocketLike } from "./globals";

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

export function getObserving(): EntityLike | null | undefined {
  return window.observing;
}

export function getObservingId(): string | undefined {
  return window.observing?.id;
}

export function getS(): ServerInfoLike | undefined {
  return window.S;
}

export function getSocket(): SocketLike | undefined {
  return window.socket;
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
