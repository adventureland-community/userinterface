/**
 * Account bank snapshot from hub `load_bank`.
 */

export type BankItem = {
  name: string;
  level?: number;
  q?: number;
  p?: string | null;
  [key: string]: unknown;
};

/** Official packs are `items0`, `items1`, … — arrays of items or null slots. */
export type BankPacks = Record<string, Array<BankItem | null | undefined>>;

export type BankSnapshot = {
  packs: BankPacks;
  gold: number;
  /** Wall-clock ms when this snapshot was loaded. */
  loadedAt: number;
};

export type BankSlotRef = {
  pack: string;
  index: number;
  item: BankItem;
};

/** Aggregated stack across packs (merged by name + level + title). */
export type BankAggItem = {
  key: string;
  name: string;
  level?: number;
  p?: string | null;
  q: number;
  /** Distinct pack locations (pack + slot index). */
  locs: Array<{ pack: string; index: number; q: number }>;
};
