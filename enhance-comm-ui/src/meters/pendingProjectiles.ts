/**
 * In-flight HP-bar ghosts from projectiles.
 *
 * Bar model (UI): red = HP left, black = already lost.
 * Pending damage paints on remaining HP; pending heal paints into missing HP.
 * Landed hits clear the matching pid — the bar HP already reflects them.
 */

import { findEntityById, getG, simpleDistance } from "../host/al";
import {
  onActionSubscribe,
  onDamage,
  type ActionEvent,
  type DamageEvent,
} from "../sockets/hub";

const DEFAULT_ETA_MS = 800;
const ETA_GRACE_MS = 250;
/** Close-range shots land fast — hold pending ghosts for the 100ms UI tick. */
const MIN_VISIBLE_MS = 450;

export type PendingProjectile = {
  pid: string;
  targetId: string;
  damage: number;
  heal: number;
  expiresAt: number;
};

export type HpBarGhosts = {
  /** In-flight projectile damage (not landed yet). */
  pendingDamage: number;
  /** In-flight projectile heal. */
  pendingHeal: number;
};

/** @deprecated use getHpBarGhosts — kept for older call sites/tests. */
export type PendingHpDelta = {
  damage: number;
  heal: number;
};

const byPid = new Map<string, PendingProjectile>();
let unsubAction: (() => void) | null = null;
let unsubDamage: (() => void) | null = null;
let ownedByEngine = false;

function etaFromAction(ev: ActionEvent): number {
  if (typeof ev.eta === "number" && Number.isFinite(ev.eta) && ev.eta > 0) {
    return ev.eta;
  }
  const name = ev.projectile;
  const G = getG();
  const proj =
    name && G && G.projectiles ? (G.projectiles as any)[name] : null;
  const speed =
    proj && typeof proj.speed === "number" ? Number(proj.speed) : NaN;
  if (speed > 0 && ev.actor && ev.target) {
    const attacker = findEntityById(ev.actor);
    const target = findEntityById(ev.target);
    if (attacker && target) {
      const dist = simpleDistance(attacker, target);
      if (Number.isFinite(dist) && dist >= 0) {
        return (dist / speed) * 1000;
      }
    }
  }
  return DEFAULT_ETA_MS;
}

function prunePending(now: number): void {
  const keys = Array.from(byPid.keys());
  for (let i = 0; i < keys.length; i++) {
    const row = byPid.get(keys[i]);
    if (!row || row.expiresAt <= now) byPid.delete(keys[i]);
  }
}

/** True when the action is an instant ray / non-projectile (no in-flight ghost). */
export function isInstantAction(ev: ActionEvent): boolean {
  const raw = ev.raw;
  if (raw && raw.instant) return true;
  if (ev.pid == null || ev.pid === "") return true;
  return false;
}

export function ingestPendingAction(ev: ActionEvent): void {
  if (isInstantAction(ev)) return;
  if (!ev.target) return;
  const damage =
    typeof ev.damage === "number" && ev.damage > 0 ? ev.damage : 0;
  const heal = typeof ev.heal === "number" && ev.heal > 0 ? ev.heal : 0;
  if (!(damage > 0) && !(heal > 0)) return;

  const pid = String(ev.pid);
  const eta = etaFromAction(ev);
  const at = ev.at || Date.now();
  const holdMs = Math.max(eta, MIN_VISIBLE_MS) + ETA_GRACE_MS;
  byPid.set(pid, {
    pid,
    targetId: String(ev.target),
    damage,
    heal,
    expiresAt: at + holdMs,
  });
}

/** Clear matching in-flight pid when the hit lands (or misses). */
export function clearPendingByHit(ev: DamageEvent): void {
  if (ev.pid != null && ev.pid !== "") {
    byPid.delete(String(ev.pid));
  }
}

export function getHpBarGhosts(
  targetId: string | number | null | undefined,
  now = Date.now(),
): HpBarGhosts {
  const empty: HpBarGhosts = {
    pendingDamage: 0,
    pendingHeal: 0,
  };
  if (targetId == null || targetId === "") return empty;
  prunePending(now);
  const tid = String(targetId);
  let pendingDamage = 0;
  let pendingHeal = 0;
  const pendingRows = Array.from(byPid.values());
  for (let i = 0; i < pendingRows.length; i++) {
    const row = pendingRows[i];
    if (row.targetId !== tid) continue;
    pendingDamage += row.damage;
    pendingHeal += row.heal;
  }
  return { pendingDamage, pendingHeal };
}

/** Back-compat: pending in-flight only. */
export function getPendingHpDelta(
  targetId: string | number | null | undefined,
  now = Date.now(),
): PendingHpDelta {
  const g = getHpBarGhosts(targetId, now);
  return { damage: g.pendingDamage, heal: g.pendingHeal };
}

export function clearPendingProjectiles(): void {
  byPid.clear();
}

/** Test / standalone subscribe when meterEngine is not running. */
export function startPendingProjectiles(): () => void {
  if (ownedByEngine) return () => {};
  if (!unsubAction) unsubAction = onActionSubscribe(ingestPendingAction);
  if (!unsubDamage) unsubDamage = onDamage(clearPendingByHit);
  return () => {
    if (unsubAction) {
      unsubAction();
      unsubAction = null;
    }
    if (unsubDamage) {
      unsubDamage();
      unsubDamage = null;
    }
  };
}

/** meterEngine owns the hub listeners. */
export function attachPendingProjectilesToEngine(): void {
  ownedByEngine = true;
  if (unsubAction) {
    unsubAction();
    unsubAction = null;
  }
  if (unsubDamage) {
    unsubDamage();
    unsubDamage = null;
  }
}

export function onPendingActionEvent(ev: ActionEvent): void {
  ingestPendingAction(ev);
}

export function onPendingDamageEvent(ev: DamageEvent): void {
  clearPendingByHit(ev);
}
