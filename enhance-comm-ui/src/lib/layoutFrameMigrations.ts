/** One-shot saved-layout bumps for panel shells that shipped with bad defaults. */

import type { PanelId, PanelPos } from "./layout";
import { TRADE_PANEL_MIN_HEIGHT, TRADE_PANEL_WIDTH } from "./frameSizes";

export type FrameMigration = (pos: PanelPos, def: PanelPos) => PanelPos;

/** Bump when adding a new one-shot frame migrator; settings runs them once. */
export const LAYOUT_FRAME_REV = 8;

/** Shipped defaults only — round off scale noise, do not match nearby user sizes. */
function shipped(n: number | undefined, target: number): boolean {
  return typeof n === "number" && Math.round(n) === target;
}

/**
 * Early alpha.4 mail shipped around 800×500 before the current profile defaults.
 */
export function migrateMailFrame(pos: PanelPos, def: PanelPos): PanelPos {
  if (!shipped(pos.frameW, 800) || !shipped(pos.frameH, 500)) return pos;
  return { ...pos, frameW: def.frameW, frameH: def.frameH };
}

/**
 * Early events shells defaulted to a tall empty black box (300×220).
 */
export function migrateEventsFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 260;
  const defH = typeof def.frameH === "number" ? def.frameH : 72;
  if (!shipped(pos.frameW, 300) || !shipped(pos.frameH, 220)) return pos;
  return { ...pos, frameW: defW, frameH: defH };
}

/**
 * Party roster saved a 522 empty shell, then an interim 360 width.
 * Height is a hug-content policy (stripped in mergeLayout), not a clamp here.
 */
export function migratePlayersFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 520;
  if (!shipped(pos.frameW, 522) && !shipped(pos.frameW, 360)) return pos;
  return { ...pos, frameW: defW };
}

/**
 * Threat min-width era: 326×117 empty shells. Later default was 300×240.
 * Missing height is a fill invariant (fixed box), not a size clamp on user resizes.
 */
export function migrateThreatFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 300;
  const defH = typeof def.frameH === "number" ? def.frameH : 360;
  const shippedWide = shipped(pos.frameW, 326);
  const shippedShort = shipped(pos.frameH, 117);
  const shippedCompact = shipped(pos.frameW, 300) && shipped(pos.frameH, 240);
  const noHeight = typeof pos.frameH !== "number" || pos.frameH <= 0;
  if (!shippedWide && !shippedShort && !shippedCompact && !noHeight) {
    return pos;
  }
  return {
    ...pos,
    frameW: shippedWide ? defW : pos.frameW,
    frameH: shippedShort || shippedCompact || noHeight ? defH : pos.frameH,
  };
}

/** playerFrame / targetFrame — 320×~144 from the min-box era. */
export function migrateUnitFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 300;
  const defH = typeof def.frameH === "number" ? def.frameH : 112;
  if (!shipped(pos.frameW, 320) || !shipped(pos.frameH, 144)) return pos;
  return { ...pos, frameW: defW, frameH: defH };
}

/** Compact instance shells: 360×288, 400×320, then 560×400 before taller cards. */
export function migrateInstanceFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 560;
  const defH = typeof def.frameH === "number" ? def.frameH : 480;
  const compact =
    (shipped(pos.frameW, 360) && shipped(pos.frameH, 288)) ||
    (shipped(pos.frameW, 400) && shipped(pos.frameH, 320)) ||
    (shipped(pos.frameW, 560) && shipped(pos.frameH, 400));
  if (!compact) return pos;
  return { ...pos, frameW: defW, frameH: defH };
}

export function migrateBossBarFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const defH = typeof def.frameH === "number" ? def.frameH : 180;
  if (!shipped(pos.frameH, 100)) return pos;
  return { ...pos, frameH: defH };
}

/**
 * Ability timeline shipped as 220×200 (wide box) or 44×~240 (icon column).
 * User-resized widths and mid-range rails are left alone.
 */
export function migrateAbilityTimelineFrame(
  pos: PanelPos,
  def: PanelPos,
): PanelPos {
  const defW = typeof def.frameW === "number" ? def.frameW : 50;
  const defH = typeof def.frameH === "number" ? def.frameH : 500;
  const shippedWide = shipped(pos.frameW, 220) && shipped(pos.frameH, 200);
  const shippedNarrow = shipped(pos.frameW, 44);
  if (!shippedWide && !shippedNarrow) return pos;
  return { ...pos, frameW: defW, frameH: defH };
}

/**
 * Command shipped autosize-off with a short 560×300 box. Alt outline tracked that
 * frame while snippets spilled past it. Flip matching shells onto autosize.
 * Also bumps the later 560×300 autosize-on default to the wider 720 shell.
 */
export function migrateCommandFrame(pos: PanelPos, def: PanelPos): PanelPos {
  const shippedNarrow =
    shipped(pos.frameW, 560) && shipped(pos.frameH, 300);
  if (pos.autoSize === true && !shippedNarrow) return pos;
  if (!shippedNarrow && pos.autoSize === false) return pos;
  return {
    ...pos,
    autoSize: true,
    frameW: typeof def.frameW === "number" ? def.frameW : pos.frameW,
    frameH: typeof def.frameH === "number" ? def.frameH : pos.frameH,
  };
}

/** Trade panel shipped at 220×200 before fixed personal+stand layout. */
export function migrateTradeFrame(pos: PanelPos, def: PanelPos): PanelPos {
  if (!shipped(pos.frameW, 220) || !shipped(pos.frameH, 200)) return pos;
  const defW = typeof def.frameW === "number" ? def.frameW : TRADE_PANEL_WIDTH;
  const defH = typeof def.frameH === "number" ? def.frameH : TRADE_PANEL_MIN_HEIGHT;
  return { ...pos, frameW: defW, frameH: defH };
}

/** Panels whose saved frameW/frameH get a one-shot migration. */
export const FRAME_MIGRATIONS: Partial<Record<PanelId, FrameMigration>> = {
  mail: migrateMailFrame,
  events: migrateEventsFrame,
  players: migratePlayersFrame,
  threat: migrateThreatFrame,
  playerFrame: migrateUnitFrame,
  targetFrame: migrateUnitFrame,
  instance: migrateInstanceFrame,
  bossBar: migrateBossBarFrame,
  abilityTimeline: migrateAbilityTimelineFrame,
  command: migrateCommandFrame,
  trade: migrateTradeFrame,
};

export function applyFrameMigrations(
  layout: Record<PanelId, PanelPos>,
  defaults: Record<PanelId, PanelPos>,
): void {
  const ids = Object.keys(FRAME_MIGRATIONS) as PanelId[];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const migrate = FRAME_MIGRATIONS[id];
    const def = defaults[id];
    if (!migrate || !def) continue;
    layout[id] = migrate(layout[id], def);
  }
}
