/**
 * Typical rendered footprints for layout-edit dummies.
 * Prefer content-driven sizing in components; these are floors / closed-bag reserves.
 */

/** 7-col × 6-row inventory + gold/shells bar (measured open bag ~385×395). */
export const BAG_FRAME_WIDTH = 385;
export const BAG_FRAME_HEIGHT = 395;

/** Compact sync timestamp + Refresh row above the inventory host. */
export const BAG_SYNC_CHROME_HEIGHT = 30;

export const BAG_PANEL_STYLE: Record<string, any> = {
  // minWidth floor only — fixed width + inventory host borders wraps slots.
  minWidth: BAG_FRAME_WIDTH,
  minHeight: BAG_FRAME_HEIGHT + BAG_SYNC_CHROME_HEIGHT,
  boxSizing: "border-box",
};

/** Paperdoll with header + vitals + stats + 4×4 gear (EntityInfo width). */
export const PAPERDOLL_FRAME_WIDTH = 268;

export const PAPERDOLL_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "340px",
  boxSizing: "border-box",
  // Above buffInfo/itemInfo (z=35) so gear stays clickable while Item info is open.
  zIndex: 36,
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

/** Crypt boss progress row (horizontal mob cards). */
export const CRYPT_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(720px, 96vw)",
  minWidth: "200px",
  boxSizing: "border-box",
};

/** Threat table footprint (HP rows + mob icon chips). */
export const THREAT_PANEL_STYLE: Record<string, any> = {
  minWidth: "240px",
  width: "min(320px, 92vw)",
  minHeight: "120px",
  boxSizing: "border-box",
};

/** Command editor shell. */
export const COMMAND_PANEL_STYLE: Record<string, any> = {
  width: "min(560px, 94vw)",
  minHeight: "220px",
  boxSizing: "border-box",
};

/** Rank meters — wide enough for title; size grows via frameW/H / resize. */
export const METER_PANEL_STYLE: Record<string, any> = {
  width: "320px",
  minWidth: "240px",
  minHeight: "140px",
  boxSizing: "border-box",
};

export const METER_FRAME_DEFAULT = { w: 320, h: 200 };
/** Inspector needs room for overview + ability tabs. */
export const INSPECTOR_FRAME_DEFAULT = { w: 560, h: 400 };
/** Shared Encounter / Deaths / Timeline report window. */
export const REPORT_FRAME_DEFAULT = { w: 480, h: 320 };
export const METER_FRAME_MIN = { w: 240, h: 140 };
export const METER_FRAME_MAX = { w: 720, h: 560 };

/** Kill KPI panel. */
export const KILLS_PANEL_STYLE: Record<string, any> = {
  width: "min(280px, 90vw)",
  minWidth: "180px",
  minHeight: "80px",
  boxSizing: "border-box",
};

/** Stock buff / item info dialog footprint. */
export const INFO_DIALOG_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(96vw, 520px)",
  // Above other play panels so buff/item tooltips stay readable.
  zIndex: 35,
  boxSizing: "border-box",
};
