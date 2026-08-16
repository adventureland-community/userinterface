/**
 * Luck / gold-find for the paperdoll.
 * Soft sync omits luckm/goldm for observed and stranger entities alike —
 * always estimate from equipped gear + conditions (mluck, sets, …).
 * Wallet gold is not shown (welcome snap is connect-time only and misleading).
 */

import type { EntityLike } from "../../host/globals";
import { estimateMultipliersFromGear } from "../../lib/equippedProps";

/** Stock `colors.luck`. */
export const LUCK_COLOR = "#2A9A3D";
/** Stock `colors.gold`. */
export const GOLD_COLOR = "gold";

const ESTIMATE_HINT =
  "Estimated from equipped gear + conditions (mluck, sets, …). Soft /comm sync does not send luckm/goldm.";

export type PaperdollEconomy = {
  luckm?: number;
  goldm?: number;
};

export type StatView = {
  value: string;
  title: string;
  accent: string;
};

export type EconomyDelta = {
  theirs: number;
  ours: number;
  pct: boolean;
};

/**
 * Gear+condition estimates only — ignores entity.luckm/goldm and welcome snap.
 */
export function resolvePaperdollEconomy(entity: EntityLike): PaperdollEconomy {
  const est = estimateMultipliersFromGear(entity);
  if (!est) return {};
  return {
    luckm: est.luckm,
    goldm: est.goldm,
  };
}

/** Stock character sheet: `round(mult * 100) + "%"`. */
export function formatMultPct(mult: number): string {
  return `${Math.round(mult * 100)}%`;
}

function formatMultValue(mult: number): string {
  return `~${formatMultPct(mult)}`;
}

export function luckDisplay(eco: PaperdollEconomy): StatView {
  if (eco.luckm == null) {
    return {
      value: "—",
      title: "Luck — cannot estimate (no gear props)",
      accent: "#888",
    };
  }
  const value = formatMultValue(eco.luckm);
  return {
    value,
    title: `Luck ${value}\n${ESTIMATE_HINT}`,
    accent: LUCK_COLOR,
  };
}

/** Gold-find multiplier only — never wallet coins. */
export function goldFindDisplay(eco: PaperdollEconomy): StatView {
  if (eco.goldm == null) {
    return {
      value: "—",
      title: "Gold find — cannot estimate (no gear props)",
      accent: "#888",
    };
  }
  const value = formatMultValue(eco.goldm);
  return {
    value,
    title: `Gold find ${value}\n${ESTIMATE_HINT}`,
    accent: GOLD_COLOR,
  };
}

/** Luck as percentage points for DeltaStat (`luckm * 100`). */
export function luckDelta(
  theirs: PaperdollEconomy,
  ours: PaperdollEconomy,
): EconomyDelta | null {
  if (theirs.luckm == null || ours.luckm == null) return null;
  return { theirs: theirs.luckm * 100, ours: ours.luckm * 100, pct: true };
}

/** Compare gold-find % only. */
export function goldDelta(
  theirs: PaperdollEconomy,
  ours: PaperdollEconomy,
): EconomyDelta | null {
  if (theirs.goldm != null && ours.goldm != null) {
    return { theirs: theirs.goldm * 100, ours: ours.goldm * 100, pct: true };
  }
  return null;
}
