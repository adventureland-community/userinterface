/**
 * Combat meter channel ids — shared by persistence (settings) and
 * partyCombat aggregation so the union stays consistent across load/save.
 *
 * AL hit tags (engine telemetry, not Details Displays):
 *   base  → direct / untagged hits
 *   blast → explosion splash secondaries
 *   burn  → G.conditions.burned ticks (packet source "burn")
 *   cleave→ cleave / aoe-flagged multi-target
 *
 * Details shows Burned as its own spell row in player breakdown.
 * These tags stay internal for aggregation; Inspector uses Spells / Targets.
 */

export type CombatChannel =
  | "dps"
  | "base"
  | "blast"
  | "burn"
  | "cleave"
  | "hps"
  | "mps"
  | "dr"
  | "reflect";

export const COMBAT_CHANNELS: CombatChannel[] = [
  "dps",
  "base",
  "blast",
  "burn",
  "cleave",
  "hps",
  "mps",
  "dr",
  "reflect",
];

/** UI labels — AL names. Channel ids stay wire names for persistence. */
export const CHANNEL_LABELS: Record<CombatChannel, string> = {
  dps: "DPS",
  base: "Direct",
  blast: "Explosion",
  burn: "Burned",
  cleave: "AoE",
  hps: "HPS",
  mps: "MPS",
  dr: "DR",
  reflect: "RF",
};

export const CHANNEL_COLORS: Record<CombatChannel, string> = {
  dps: "#E53935",
  base: "#7a8a9c",
  blast: "#d4a017",
  burn: "#d4542a",
  cleave: "#4caf7a",
  hps: "#43A047",
  mps: "#1E88E5",
  dr: "#546E7A",
  reflect: "#26A69A",
};
