/**
 * Rough local upgrade/compound chance for the shrine dialog (~ prefix).
 * Tuned to public Discord-bot samples. Not the server's exact odds.
 */

export type ChanceEstimateInput = {
  mode: "upgrade" | "compound";
  /** Current item level (before the attempt). */
  level: number;
  /** calculate_item_grade for the gear. */
  itemGrade: number;
  /** Scroll grade (uscroll/cscroll). */
  scrollGrade?: number | null;
  /** Offering grade when present. */
  offeringGrade?: number | null;
  /** Item grace if known (soft bump only). */
  grace?: number | null;
};

/**
 * Base upgrade P(success) by target level (new_level = level+1).
 * Index = new_level. Grade-0 row anchored to common Discord samples
 * (+3→+4 ≈ 70%). Higher igrade rows are harsher.
 */
const UPGRADE_BASE: number[][] = [
  // igrade 0 — normal white/gear
  [1, 1, 0.98, 0.95, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1, 0.06],
  // igrade 1
  [1, 1, 0.95, 0.85, 0.55, 0.42, 0.32, 0.24, 0.16, 0.1, 0.06, 0.04, 0.02],
  // igrade 2
  [1, 1, 0.9, 0.7, 0.4, 0.28, 0.18, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01],
];

/** Compound base by target level. +0→+1 ≈ 99%, +1→+2 ≈ 75%. */
const COMPOUND_BASE: number[][] = [
  [1, 0.99, 0.75, 0.55, 0.35, 0.22, 0.12, 0.08],
  [1, 0.95, 0.6, 0.4, 0.22, 0.12, 0.06, 0.03],
  [1, 0.9, 0.45, 0.25, 0.12, 0.06, 0.03, 0.015],
];

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function baseFromTable(table: number[][], igrade: number, newLevel: number): number {
  const row = table[Math.max(0, Math.min(igrade, table.length - 1))] || table[0];
  if (!row || !row.length) return 0.5;
  if (newLevel < 0) return row[0] ?? 0.5;
  if (newLevel >= row.length) return row[row.length - 1] ?? 0.05;
  const v = row[newLevel];
  return v != null && Number.isFinite(v) ? v : 0.5;
}

/**
 * Apply the cheap, D-free parts of the server scroll/offering modifiers.
 * Grace is only a soft hint — full grace math needs server ugrace tables.
 */
function applyScrollOfferingMods(
  probability: number,
  opts: {
    itemGrade: number;
    newLevel: number;
    scrollGrade?: number | null;
    offeringGrade?: number | null;
    grace?: number | null;
  },
): number {
  let p = probability;
  let high = false;
  const scrollGrade =
    opts.scrollGrade != null && Number.isFinite(Number(opts.scrollGrade))
      ? Number(opts.scrollGrade)
      : null;
  const offeringGrade =
    opts.offeringGrade != null && Number.isFinite(Number(opts.offeringGrade))
      ? Number(opts.offeringGrade)
      : null;
  const grade = opts.itemGrade;
  const grace =
    opts.grace != null && Number.isFinite(Number(opts.grace))
      ? Number(opts.grace)
      : 0;

  if (scrollGrade != null && scrollGrade > grade && opts.newLevel <= 10) {
    p = p * 1.2 + 0.01;
    high = true;
  }

  if (offeringGrade != null) {
    if (offeringGrade > grade + 1) {
      p = p * 1.7 + Math.max(0, grace) * 0.05;
      high = true;
    } else if (offeringGrade > grade) {
      p = p * 1.5 + Math.max(0, grace) * 0.02;
      high = true;
    } else if (offeringGrade === grade) {
      p = p * 1.4;
    } else if (offeringGrade === grade - 1) {
      p = p * 1.15;
    } else {
      p = p * 1.08;
    }
  } else if (grace > 0) {
    // Soft grace bump without server ugrace — keep it small.
    p += Math.min(0.08, grace * 0.01);
  }

  const oprobability = probability;
  if (high) {
    p = Math.min(p, Math.min(oprobability + 0.36, oprobability * 3));
  } else {
    p = Math.min(p, Math.min(oprobability + 0.24, oprobability * 2));
  }
  return clamp01(p);
}

/** Approximate success chance in 0..1. */
export function estimateShrineChance(input: ChanceEstimateInput): number {
  const level =
    input.level != null && Number.isFinite(Number(input.level))
      ? Number(input.level)
      : 0;
  const newLevel = level + 1;
  const igrade = Math.max(0, Math.min(2, Number(input.itemGrade) | 0));
  const base =
    input.mode === "compound"
      ? baseFromTable(COMPOUND_BASE, igrade, newLevel)
      : baseFromTable(UPGRADE_BASE, igrade, newLevel);
  return applyScrollOfferingMods(base, {
    itemGrade: input.itemGrade,
    newLevel,
    scrollGrade: input.scrollGrade,
    offeringGrade: input.offeringGrade,
    grace: input.grace,
  });
}

export function formatApproxChancePct(chance: number): string {
  const pct = chance <= 1 ? chance * 100 : chance;
  return "~" + pct.toFixed(0) + "%";
}
