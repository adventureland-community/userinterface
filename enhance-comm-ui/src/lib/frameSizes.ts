/**
 * Typical rendered footprints for layout-edit dummies.
 * Prefer content-driven sizing in components; these are floors / closed-bag reserves.
 */

/** 7-col × 6-row inventory + gold/shells bar (measured open bag ~385×395). */
export const BAG_FRAME_WIDTH = 385;
export const BAG_FRAME_HEIGHT = 395;

export const BAG_PANEL_STYLE: Record<string, any> = {
  width: BAG_FRAME_WIDTH,
  minWidth: BAG_FRAME_WIDTH,
  minHeight: BAG_FRAME_HEIGHT,
  boxSizing: "border-box",
};

/** Paperdoll with header + vitals + stats + 4×4 gear (EntityInfo width). */
export const PAPERDOLL_FRAME_WIDTH = 268;

export const PAPERDOLL_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "340px",
  boxSizing: "border-box",
};

/** Wide stacked boss HP rows (top-center boss bar). */
export const BOSS_BAR_PANEL_STYLE: Record<string, any> = {
  width: "min(520px, 72vw)",
  minWidth: "360px",
  boxSizing: "border-box",
};
