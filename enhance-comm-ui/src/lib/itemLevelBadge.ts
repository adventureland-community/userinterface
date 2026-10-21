/**
 * Level pip text + color — matches stock `item_container` `.iuui` / `.ulevel*` /
 * `.clevel*` (and booster letter grades).
 */

import { getG } from "../host/al";

export type ItemLevelBadge = {
  /** Pip text: number or stock letter (X/Y/Z, V/S/R, A–E/W). */
  text: string;
  /** CSS color matching stock level classes. */
  color: string;
};

const DEFAULT_LEVEL_COLOR = "#cfcfcf";

const BOOSTER_LETTER: Record<number, string> = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
  5: "E",
};

const BOOSTER_COLOR: Record<string, string> = {
  A: "#FFC949",
  B: "#4A9AFF",
  C: "#FC4546",
  D: "#9353FF",
  E: "#FD8915",
  W: "#5BAD59",
};

export function coerceItemLevel(
  raw: number | string | null | undefined,
): number | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Stock-style level badge for an item instance.
 * Returns null when there is no level pip (0 / missing).
 */
export function resolveItemLevelBadge(
  itemName: string,
  level: number | string | null | undefined,
): ItemLevelBadge | null {
  const n = coerceItemLevel(level);
  if (n == null || n <= 0) return null;

  const G = getG() as
    | {
        items?: Record<
          string,
          { upgrade?: boolean; compound?: boolean; type?: string }
        >;
      }
    | undefined;
  const def = G?.items?.[itemName];
  const type = def && typeof def.type === "string" ? def.type : "";

  if (type === "booster") {
    const text =
      n > 5 ? "W" : BOOSTER_LETTER[Math.floor(n)] || String(Math.floor(n));
    return {
      text,
      color: BOOSTER_COLOR[text] || DEFAULT_LEVEL_COLOR,
    };
  }

  if (def && def.compound) {
    const lv = Math.floor(n);
    const text =
      lv === 7 ? "R" : lv === 6 ? "S" : lv === 5 ? "V" : String(lv);
    let color = DEFAULT_LEVEL_COLOR;
    if (lv === 4) color = "#FFC949";
    else if (lv === 5) color = "#B753C7";
    else if (lv === 6) color = "#FC2F72";
    else if (lv >= 7) color = "#D71D41";
    return { text, color };
  }

  // Upgrade gear (and anything else with a numeric level).
  const lv = Math.floor(n);
  const text =
    lv === 12 ? "Z" : lv === 11 ? "Y" : lv === 10 ? "X" : String(lv);
  let color = DEFAULT_LEVEL_COLOR;
  if (lv === 8) color = "#FFC949";
  else if (lv === 9) color = "#E64D31";
  else if (lv >= 10) color = "#B753C7";
  return { text, color };
}
