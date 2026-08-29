/**
 * Typical rendered footprints for layout-edit dummies.
 * Prefer content-driven sizing in components; these are floors / closed-bag reserves.
 */

/** 7-col × 6-row inventory + gold/shells bar (measured open bag ~385×395). */
export const BAG_FRAME_WIDTH = 385;
export const BAG_FRAME_HEIGHT = 395;

/** Compact sync timestamp + Refresh row above the inventory host. */
export const BAG_SYNC_CHROME_HEIGHT = 30;

/** Party chip width in Players.ts. Auto-resize wraps after this many columns. */
export const PARTY_CHIP_WIDTH = 168;
export const PARTY_CHIP_GAP = 5;
export const PARTY_ROSTER_PAD = 4;
export const PARTY_MAX_COLS = 3;

export function partyChipRowWidth(cols = PARTY_MAX_COLS): number {
  const n = Math.max(1, Math.floor(cols));
  return n * PARTY_CHIP_WIDTH + (n - 1) * PARTY_CHIP_GAP;
}

/** Roster box: padding + N chip columns. Extra members wrap to a new row. */
export function partyRosterMaxWidth(cols = PARTY_MAX_COLS): number {
  return PARTY_ROSTER_PAD * 2 + partyChipRowWidth(cols);
}

/** Auto-resize width caps (px). Omit = viewport only. */
export function autoSizeMaxWidthPx(id: string): number | undefined {
  if (id === "players") return partyRosterMaxWidth(PARTY_MAX_COLS);
  if (id === "command") return 720;
  return undefined;
}

export function applyAutoSizeMaxWidth(
  style: Record<string, any>,
  id: string,
  autoSize: boolean,
): void {
  if (!autoSize) return;
  const maxW = autoSizeMaxWidthPx(id);
  if (!(typeof maxW === "number" && maxW > 0)) return;
  style.maxWidth = `min(${maxW}px, 100vw)`;
}

export const PLAYERS_FRAME_DEFAULT = { frameW: partyRosterMaxWidth() };
/** Threat table — width matches panel shell; height fits a party list. */
export const THREAT_FRAME_DEFAULT = { frameW: 300, frameH: 360 };
/** Enemy chip column (right-side list). */
export const ENEMIES_FRAME_DEFAULT = { frameW: 200, frameH: 96 };
/** playerFrame / targetFrame — matches UNIT_FRAME_STYLE footprint. */
export const UNIT_FRAME_DEFAULT = { frameW: 300, frameH: 112 };

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
  // Above buffInfo/itemInfo (35) and their raise stack floor so × / gear stay hittable.
  zIndex: 56,
  // Alt arrange strip + paperdoll title drag handle need visible overflow.
  overflow: "visible",
};

/** Wide stacked boss HP rows (top-center boss bar). */
export const BOSS_BAR_FRAME_DEFAULT = { frameW: 480, frameH: 180 };

export const BOSS_BAR_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(520px, 72vw)",
  minWidth: "min(360px, 92vw)",
  boxSizing: "border-box",
};

/** Combat metrics table / bars shell. */
export const COMBAT_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(420px, 94vw)",
  minWidth: "min(280px, 92vw)",
  minHeight: "180px",
  boxSizing: "border-box",
};

/** Crypt / instance boss cards (3-col readable grid). */
export const INSTANCE_FRAME_DEFAULT = { frameW: 560, frameH: 480 };

export const INSTANCE_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  maxWidth: "min(720px, 96vw)",
  minWidth: "200px",
  minHeight: "100%",
  height: "100%",
  boxSizing: "border-box",
  // Opaque shell — must not show map through or inherit meter idle fade.
  background: "rgba(0,0,0,0.94)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
  opacity: 1,
};

/** Instance run progress / phase strip. */
export const INSTANCE_RUN_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  maxWidth: "min(360px, 92vw)",
  minWidth: "160px",
  minHeight: "100%",
  height: "100%",
  boxSizing: "border-box",
  background: "rgba(0,0,0,0.94)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
  opacity: 1,
};

/**
 * Server / map HUD chips — transparent shell; opaque chip lives in the component.
 * No saved frameW/H — fixed hugContent caps caused stray scrollbars beside the chip.
 */
export const CHIP_HUD_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(360px, 94vw)",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
};

/**
 * World events list (closable). Shell stays transparent so hugContent
 * frameH floors do not paint a tall empty black slab — opaque chrome is
 * on the list body (matches serverInfo / mapInfo chips).
 */
export const EVENTS_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(360px, 94vw)",
  minWidth: "200px",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
};

/** A/B Testing horizontal score tug bar. */
export const EVENT_SCORE_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(420px, 94vw)",
  minWidth: "260px",
  boxSizing: "border-box",
  background: "rgba(0,0,0,0.94)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
};

/** A/B Testing team roster. */
export const EVENT_ROSTER_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(360px, 94vw)",
  minWidth: "180px",
  boxSizing: "border-box",
  background: "rgba(0,0,0,0.94)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
};

/** Forward ability CD timeline — transparent shell; icon rail is ~44px wide. */
/** Icon rail — Better Timeline-ish: ~52px wide, 44px icons, ~360px travel. */
export const ABILITY_TIMELINE_ICON_SIZE = 44;
/** Better Timeline vertical rail width (otherSize). */
export const ABILITY_TIMELINE_RAIL_WIDTH = 50;
export const ABILITY_TIMELINE_FRAME_DEFAULT = {
  frameW: ABILITY_TIMELINE_RAIL_WIDTH,
  frameH: 500,
};

/** Wide short rail when Settings → Orientation is Horizontal. */
export const ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT = {
  frameW: 500,
  frameH: 80,
};

export const ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT = {
  frameW: 140,
  frameH: 180,
};

export const ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT = {
  frameW: 280,
  frameH: 72,
};

export const ABILITY_TIMELINE_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  height: "100%",
  minWidth: "40px",
  minHeight: "40px",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
};

export const ABILITY_TIMELINE_BIGICON_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  height: "100%",
  minWidth: "64px",
  minHeight: "64px",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
};

export const ABILITY_TIMELINE_HIGHLIGHT_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  height: "100%",
  minWidth: "80px",
  minHeight: "28px",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
};

/** Canvas minimap / radar — sizing only; appearance lives on `.comm-minimap[data-bg]`. */
export const MINIMAP_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  height: "100%",
  minWidth: "180px",
  minHeight: "200px",
  boxSizing: "border-box",
  background: "transparent",
  boxShadow: "none",
  overflow: "hidden",
};

/** Party roster — hug chips when Auto-resize is on; otherwise fill frameW. */
export const PLAYERS_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: `min(${partyRosterMaxWidth()}px, 78vw)`,
  minWidth: PARTY_CHIP_WIDTH,
  boxSizing: "border-box",
};

/** Threat table shell — opaque, fills positioned panel frame. */
export const THREAT_PANEL_STYLE: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  minWidth: "200px",
  minHeight: "80px",
  maxWidth: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
  background: "rgba(0,0,0,0.94)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
  opacity: 1,
};

/** Inner bordered table chrome (header + scrollable rows). */
export const THREAT_TABLE_SHELL: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  boxSizing: "border-box",
  border: "2px double gray",
  gap: "2px",
  overflow: "hidden",
};

/** Command editor shell — wide CODE pane; width capped via autosize max. */
export const COMMAND_PANEL_STYLE: Record<string, any> = {
  width: "min(720px, 94vw)",
  minWidth: "min(560px, 92vw)",
  maxWidth: "min(720px, 94vw)",
  boxSizing: "border-box",
};

export const MAIL_PANEL_STYLE: Record<string, any> = {
  width: "100%",
  height: "100%",
  minWidth: "min(480px, 96vw)",
  minHeight: "360px",
  maxWidth: "100%",
  maxHeight: "100%",
  boxSizing: "border-box",
};

/** Rank meters — wide enough for title; size grows via frameW/H / resize. */
export const METER_PANEL_STYLE: Record<string, any> = {
  width: "320px",
  minWidth: "240px",
  minHeight: "140px",
  // Fill-screen ceiling — not a design max. Defaults still come from *FRAME_DEFAULT.
  maxWidth: "100vw",
  maxHeight: "100vh",
  boxSizing: "border-box",
};

export const METER_FRAME_DEFAULT = { w: 320, h: 200 };
/** Inspector needs room for overview + ability tabs. */
export const INSPECTOR_FRAME_DEFAULT = { w: 560, h: 400 };
/** Shared Encounter / Deaths / Timeline report window. */
export const REPORT_FRAME_DEFAULT = { w: 780, h: 520 };
export const METER_FRAME_MIN = { w: 240, h: 140 };

/**
 * Resize ceiling is the layout root / viewport so a window can fill the screen.
 * (Previously a hard 960×720 cap in METER_FRAME_MAX.)
 */
export function clampMeterFrame(
  w: number,
  h: number,
  viewportW: number,
  viewportH: number,
): { frameW: number; frameH: number } {
  const maxW =
    Number.isFinite(viewportW) && viewportW > 0
      ? Math.round(viewportW)
      : Number.POSITIVE_INFINITY;
  const maxH =
    Number.isFinite(viewportH) && viewportH > 0
      ? Math.round(viewportH)
      : Number.POSITIVE_INFINITY;
  return {
    frameW: Math.min(maxW, Math.max(METER_FRAME_MIN.w, Math.round(w))),
    frameH: Math.min(maxH, Math.max(METER_FRAME_MIN.h, Math.round(h))),
  };
}

/** Kill KPI panel. */
export const KILLS_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(280px, 90vw)",
  minWidth: "180px",
  minHeight: "80px",
  boxSizing: "border-box",
  // Keep above-frame arrange chrome (hide × / drag) unclipped.
  overflow: "visible",
};

/** Stock buff / item info dialog footprint. */
export const INFO_DIALOG_PANEL_STYLE: Record<string, any> = {
  width: "fit-content",
  maxWidth: "min(96vw, 520px)",
  // Above other play panels so buff/item tooltips stay readable.
  zIndex: 35,
  boxSizing: "border-box",
};
