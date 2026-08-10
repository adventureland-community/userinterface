/**
 * Combat meter channel ids — shared by persistence (settings) and
 * partyCombat aggregation so the union stays consistent across load/save.
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

export const CHANNEL_LABELS: Record<CombatChannel, string> = {
  dps: "DPS",
  base: "Base",
  blast: "Blast",
  burn: "Burn",
  cleave: "Cleave",
  hps: "HPS",
  mps: "MPS",
  dr: "DR",
  reflect: "RF",
};

export const CHANNEL_COLORS: Record<CombatChannel, string> = {
  dps: "#E53935",
  base: "#6D1B7B",
  blast: "#FB8C00",
  burn: "#FDD835",
  cleave: "#8D6E63",
  hps: "#43A047",
  mps: "#1E88E5",
  dr: "#546E7A",
  reflect: "#26A69A",
};
