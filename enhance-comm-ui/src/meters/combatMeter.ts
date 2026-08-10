/**
 * Sliding 10s hit-window meter (combatMeter.ts) for the Hit DPS panel.
 *
 * Intentionally separate from partyCombat session aggregation:
 * - combatMeter: short rolling window by actor (Hit DPS / TTK helpers)
 * - partyCombat: session rates + channels for the Combat metrics panel
 *
 * RankMeter is shared presentation only; do not merge these pipelines.
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

function prune(now: number): void {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0].at < cutoff) {
    samples.shift();
  }
}

function onEvent(ev: DamageEvent): void {
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

export function startCombatMeter(): () => void {
  if (!unsub) {
    unsub = onDamage(onEvent);
  }
  return () => {
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
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
  let hits = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!s.damage || !s.target || String(s.target) !== tid) continue;
    total += s.damage;
    hits += 1;
  }
  // Single tiny hit over a full window is too noisy for TTK.
  if (hits < 2 && total < 100) return 0;
  return total / (WINDOW_MS / 1000);
}

export function estimateTtk(
  hp: number | undefined,
  dps: number = getDps(),
): number | undefined {
  if (hp == null || hp <= 0 || !dps || dps <= 0) return undefined;
  return hp / dps;
}
