/**
 * Vitals ring + death snapshots for death_log / HP-in-log views.
 */

import type { EntityLike } from "../host/globals";
import type { DamageEvent } from "../sockets/hub";
import type { DeathSnapshot } from "./meterTypes";

const HP_RING = 40;
const HIT_RING = 24;

type VitalsShadow = {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
};

type HpSample = { at: number; hp: number; maxHp: number };
type HitSample = {
  at: number;
  actor?: string;
  damage: number;
  source?: string;
};

const vitalsShadow: Record<string, VitalsShadow> = {};
const hpRing: Record<string, HpSample[]> = {};
const hitRing: Record<string, HitSample[]> = {};
const nameCache: Record<string, string> = {};

function pushRing<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  while (arr.length > max) arr.shift();
}

export function syncShadowFromEntity(
  id: string,
  ent: EntityLike | undefined,
): void {
  if (!ent) return;
  const maxHp = ent.max_hp || 0;
  const maxMp = ent.max_mp || 0;
  if (!(maxHp > 0) && !(maxMp > 0)) return;
  if (ent.name) nameCache[id] = ent.name;
  vitalsShadow[id] = {
    hp: ent.hp != null ? ent.hp : maxHp,
    maxHp,
    mp: ent.mp != null ? ent.mp : maxMp,
    maxMp,
  };
  if (maxHp > 0) {
    if (!hpRing[id]) hpRing[id] = [];
    pushRing(
      hpRing[id],
      {
        at: Date.now(),
        hp: vitalsShadow[id].hp,
        maxHp,
      },
      HP_RING,
    );
  }
}

function ensureShadow(id: string): VitalsShadow | null {
  let s = vitalsShadow[id];
  if (s) return s;
  return null;
}

/**
 * Clamp heal/resource gain against the best pre-event vitals estimate.
 * Same Crown-safe logic as legacy partyCombat.
 */
export function effectiveGain(
  id: string,
  amount: number,
  kind: "hp" | "mp",
  live?: EntityLike,
): number {
  if (!(amount > 0)) return 0;
  const s = ensureShadow(id);
  if (kind === "hp") {
    const maxHp = (s && s.maxHp) || live?.max_hp || 0;
    if (!(maxHp > 0)) return amount;
    const liveHp = live?.hp;
    const shadowHp = s ? s.hp : undefined;
    let hp: number;
    if (liveHp != null && shadowHp != null) hp = Math.min(liveHp, shadowHp);
    else if (shadowHp != null) hp = shadowHp;
    else if (liveHp != null) hp = liveHp;
    else return amount;
    const missing = Math.max(0, maxHp - hp);
    const gained = Math.min(amount, missing);
    const next = Math.min(maxHp, hp + gained);
    if (s) {
      s.hp = next;
      s.maxHp = maxHp;
    } else {
      vitalsShadow[id] = {
        hp: next,
        maxHp,
        mp: live?.mp || 0,
        maxMp: live?.max_mp || 0,
      };
    }
    return gained;
  }
  const maxMp = (s && s.maxMp) || live?.max_mp || 0;
  if (!(maxMp > 0)) return amount;
  const liveMp = live?.mp;
  const shadowMp = s ? s.mp : undefined;
  let mp: number;
  if (liveMp != null && shadowMp != null) mp = Math.min(liveMp, shadowMp);
  else if (shadowMp != null) mp = shadowMp;
  else if (liveMp != null) mp = liveMp;
  else return amount;
  const missing = Math.max(0, maxMp - mp);
  const gained = Math.min(amount, missing);
  const next = Math.min(maxMp, mp + gained);
  if (s) {
    s.mp = next;
    s.maxMp = maxMp;
  } else {
    vitalsShadow[id] = {
      hp: live?.hp || 0,
      maxHp: live?.max_hp || 0,
      mp: next,
      maxMp,
    };
  }
  return gained;
}

export function applyDamageToShadow(id: string, damage: number): void {
  if (!(damage > 0)) return;
  const s = ensureShadow(id);
  if (!s || !(s.maxHp > 0)) return;
  s.hp = Math.max(0, s.hp - damage);
  if (!hpRing[id]) hpRing[id] = [];
  pushRing(hpRing[id], { at: Date.now(), hp: s.hp, maxHp: s.maxHp }, HP_RING);
}

export function noteIncomingHit(ev: DamageEvent): void {
  if (!ev.target || !(ev.damage && ev.damage > 0)) return;
  if (!hitRing[ev.target]) hitRing[ev.target] = [];
  pushRing(
    hitRing[ev.target],
    {
      at: ev.at,
      actor: ev.actor,
      damage: ev.damage,
      source: ev.source,
    },
    HIT_RING,
  );
}

export function buildDeathSnapshot(
  id: string,
  at: number,
  killerId?: string,
): DeathSnapshot {
  return {
    id,
    name: nameCache[id] || id,
    at,
    killerId,
    hpLog: (hpRing[id] || []).slice(),
    recentHits: (hitRing[id] || []).slice(),
  };
}

export function clearDeathRings(): void {
  // Keep vitalsShadow across fights for heal clamp continuity.
  const hKeys = Object.keys(hpRing);
  for (let i = 0; i < hKeys.length; i++) delete hpRing[hKeys[i]];
  const tKeys = Object.keys(hitRing);
  for (let i = 0; i < tKeys.length; i++) delete hitRing[tKeys[i]];
}
