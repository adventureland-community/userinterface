/**
 * Luck / gold for the paperdoll. Soft stranger sync omits luckm/gold/goldm;
 * fall back to the welcome `window.observing` snap when inspecting that id,
 * then a gear/condition estimate for luckm / goldm (wallet gold cannot
 * be reconstructed).
 */

import type { EntityLike } from "../../host/globals";
import { estimateMultipliersFromGear } from "../../lib/equippedProps";
import { formatCompactNumber } from "../../lib/format";

/** Stock `colors.luck`. */
export const LUCK_COLOR = "#2A9A3D";
/** Stock `colors.gold`. */
export const GOLD_COLOR = "gold";

export type PaperdollEconomy = {
  luckm?: number;
  gold?: number;
  goldm?: number;
  luckEstimated?: boolean;
  goldmEstimated?: boolean;
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

function finiteNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function pickField(
  entity: EntityLike,
  snap: EntityLike | undefined,
  key: "luckm" | "gold" | "goldm",
): number | undefined {
  return finiteNumber(entity[key]) ?? finiteNumber(snap?.[key]);
}

/**
 * Prefer live/full-sync fields, then the welcome snap for the same id,
 * then gear+condition reconstruct for luckm / goldm.
 */
export function resolvePaperdollEconomy(
  entity: EntityLike,
  welcomeSnap?: EntityLike | null,
): PaperdollEconomy {
  const snap =
    welcomeSnap != null && String(welcomeSnap.id) === String(entity.id)
      ? welcomeSnap
      : undefined;
  let luckm = pickField(entity, snap, "luckm");
  let goldm = pickField(entity, snap, "goldm");
  const gold = pickField(entity, snap, "gold");
  let luckEstimated = false;
  let goldmEstimated = false;
  if (luckm == null || goldm == null) {
    const est = estimateMultipliersFromGear(entity);
    if (est) {
      if (luckm == null) {
        luckm = est.luckm;
        luckEstimated = true;
      }
      if (goldm == null) {
        goldm = est.goldm;
        goldmEstimated = true;
      }
    }
  }
  return { luckm, gold, goldm, luckEstimated, goldmEstimated };
}

/** Stock character sheet: `round(mult * 100) + "%"`. */
export function formatMultPct(mult: number): string {
  return `${Math.round(mult * 100)}%`;
}

export function luckDisplay(eco: PaperdollEconomy): StatView {
  if (eco.luckm == null) {
    return {
      value: "—",
      title: "Luck — not on this sync",
      accent: "#888",
    };
  }
  const pct = formatMultPct(eco.luckm);
  const est = eco.luckEstimated ? " (from gear)" : "";
  return { value: pct, title: `Luck ${pct}${est}`, accent: LUCK_COLOR };
}

/**
 * Wallet gold if present; otherwise gold-find % like the character sheet.
 */
export function goldDisplay(eco: PaperdollEconomy): StatView {
  if (eco.gold != null) {
    const coins = formatCompactNumber(eco.gold);
    const find =
      eco.goldm != null ? ` · gold find ${formatMultPct(eco.goldm)}` : "";
    const est = eco.goldmEstimated ? " (from gear)" : "";
    return {
      value: coins,
      title: `Gold ${coins}${find}${est}`,
      accent: GOLD_COLOR,
    };
  }
  if (eco.goldm != null) {
    const pct = formatMultPct(eco.goldm);
    const est = eco.goldmEstimated ? " (from gear)" : "";
    return {
      value: pct,
      title: `Gold find ${pct}${est}`,
      accent: GOLD_COLOR,
    };
  }
  return {
    value: "—",
    title: "Gold — not on this sync",
    accent: "#888",
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

/**
 * Compare the same gold mode both sides can show: coins if both have a wallet,
 * else gold-find %. Mixed modes are not comparable.
 */
export function goldDelta(
  theirs: PaperdollEconomy,
  ours: PaperdollEconomy,
): EconomyDelta | null {
  if (theirs.gold != null && ours.gold != null) {
    return { theirs: theirs.gold, ours: ours.gold, pct: false };
  }
  if (theirs.goldm != null && ours.goldm != null) {
    return { theirs: theirs.goldm * 100, ours: ours.goldm * 100, pct: true };
  }
  return null;
}
