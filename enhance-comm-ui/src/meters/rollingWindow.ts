/**
 * Sliding hit-window samples (Hit DPS / TTK helpers / realtime).
 * ThreatTable and TargetFrame import getIncomingDps from here (via combatMeter re-export).
 */

import { onDamage, type DamageEvent } from "../sockets/hub";

const WINDOW_MS = 10_000;

type Sample = {
  at: number;
  actor?: string;
  target?: string;
  damage: number;
  heal: number;
};

const samples: Sample[] = [];
let unsub: (() => void) | null = null;
let ownedByEngine = false;

function prune(now: number): void {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0].at < cutoff) {
    samples.shift();
  }
}

export function ingestRollingSample(ev: DamageEvent): void {
  const damage = ev.damage || 0;
  const heal = ev.heal || 0;
  if (!damage && !heal) return;
  samples.push({
    at: ev.at,
    actor: ev.actor,
    target: ev.target,
    damage,
    heal,
  });
  prune(ev.at);
}

/** Standalone subscribe when meterEngine is not running (tests). */
export function startRollingWindow(): () => void {
  if (ownedByEngine) return () => {};
  if (!unsub) {
    unsub = onDamage(ingestRollingSample);
  }
  return () => {
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
}

/** meterEngine calls this so only one hub subscriber owns samples. */
export function attachRollingToEngine(): void {
  ownedByEngine = true;
  if (unsub) {
    unsub();
    unsub = null;
  }
}

export function getDps(now = Date.now()): number {
  prune(now);
  let total = 0;
  for (let i = 0; i < samples.length; i++) {
    total += samples[i].damage;
  }
  return total / (WINDOW_MS / 1000);
}

export function getHealPerSec(now = Date.now()): number {
  prune(now);
  let total = 0;
  for (let i = 0; i < samples.length; i++) {
    total += samples[i].heal;
  }
  return total / (WINDOW_MS / 1000);
}

export function getActorDamage(now = Date.now()): Record<string, number> {
  prune(now);
  const out: Record<string, number> = {};
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!s.actor || !s.damage) continue;
    out[s.actor] = (out[s.actor] || 0) + s.damage;
  }
  return out;
}

export function getActorHeal(now = Date.now()): Record<string, number> {
  prune(now);
  const out: Record<string, number> = {};
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!s.actor || !s.heal) continue;
    out[s.actor] = (out[s.actor] || 0) + s.heal;
  }
  return out;
}

/**
 * Rolling incoming DPS for a specific target (10s hit window).
 * Returns 0 when no recent damage landed on that id.
 */
export function getIncomingDps(
  targetId: string | number | undefined,
  now = Date.now(),
): number {
  if (targetId == null || targetId === "") return 0;
  prune(now);
  const tid = String(targetId);
  let total = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.target !== tid || !s.damage) continue;
    total += s.damage;
  }
  return total / (WINDOW_MS / 1000);
}

export function getRollingWindowMs(): number {
  return WINDOW_MS;
}

export function clearRollingWindow(): void {
  samples.length = 0;
}

/** Seconds until HP reaches 0 at the given DPS, or null if unknown. */
export function estimateTtk(
  hp: number | undefined | null,
  dps: number,
): number | null {
  if (hp == null || !(hp > 0) || !(dps > 0)) return null;
  return hp / dps;
}
