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
  minWidth: "min(360px, 92vw)",
  boxSizing: "border-box",
};

/** Combat metrics table / bars shell. */
export const COMBAT_PANEL_STYLE: Record<string, any> = {
  width: "min(420px, 94vw)",
  minWidth: "min(280px, 92vw)",
  minHeight: "180px",
  boxSizing: "border-box",
};

/** Threat table footprint. */
export const THREAT_PANEL_STYLE: Record<string, any> = {
  minWidth: "200px",
  width: "min(280px, 90vw)",
  minHeight: "96px",
  boxSizing: "border-box",
};

/** Command editor shell. */
export const COMMAND_PANEL_STYLE: Record<string, any> = {
  width: "min(560px, 94vw)",
  minHeight: "220px",
  boxSizing: "border-box",
};

/** Rank meters (PDPS / coop / hit DPS). */
export const METER_PANEL_STYLE: Record<string, any> = {
  width: "200px",
  minWidth: "160px",
  minHeight: "72px",
  boxSizing: "border-box",
};

/** Kill KPI panel. */
export const KILLS_PANEL_STYLE: Record<string, any> = {
  width: "min(280px, 90vw)",
  minWidth: "180px",
  minHeight: "80px",
  boxSizing: "border-box",
};

/** Stock condition / item info (`#topleftcornerdialog`) footprint. */
export const INFO_DIALOG_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(96vw, 520px)",
  // Above other play panels so buff/item tooltips stay readable.
  zIndex: 35,
  boxSizing: "border-box",
};
