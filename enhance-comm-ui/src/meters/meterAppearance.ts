/**
 * Details-style meter appearance & behavior settings (global defaults).
 */

import { getSettings, patchSettings } from "../lib/settings";
import { markMeterDirty } from "./meterUiTick";

type AppearanceListener = () => void;
const appearanceListeners: AppearanceListener[] = [];

export function subscribeMeterAppearance(
  listener: AppearanceListener,
): () => void {
  appearanceListeners.push(listener);
  return () => {
    const idx = appearanceListeners.indexOf(listener);
    if (idx >= 0) appearanceListeners.splice(idx, 1);
  };
}

function notifyMeterAppearance(): void {
  markMeterDirty();
  for (let i = 0; i < appearanceListeners.length; i++) {
    appearanceListeners[i]();
  }
}

export type MeterAppearanceSettings = {
  showStatusbar: boolean;
  showTotalBar: boolean;
  animateBars: boolean;
  barHeight: number;
  barSpacing: number;
  windowScale: number;
  showSpecIcons: boolean;
  showRankNumbers: boolean;
  segmentsLocked: boolean;
  disableGrouping: boolean;
  autoHideCombat: boolean;
  autoHideOoc: boolean;
  hoverAlpha: number;
  idleAlpha: number;
  deathLogInvert: boolean;
  deathLogLifePct: boolean;
  deathLogRelevanceSec: number;
  testBars: boolean;
  maxPastSegments: number;
  maxArchivedSegments: number;
  combatBreakSec: number;
  /**
   * True after the old `showSpecIcons: true` default was migrated off.
   * Leftover saved `true` from that era must not keep painting ranking chips.
   */
  classIconsMigratedOff?: boolean;
};

export const DEFAULT_METER_APPEARANCE: MeterAppearanceSettings = {
  showStatusbar: true,
  showTotalBar: true,
  animateBars: true,
  barHeight: 18,
  barSpacing: 1,
  windowScale: 1,
  showSpecIcons: false,
  showRankNumbers: true,
  segmentsLocked: false,
  disableGrouping: false,
  autoHideCombat: false,
  autoHideOoc: false,
  hoverAlpha: 1,
  idleAlpha: 0.85,
  deathLogInvert: false,
  deathLogLifePct: true,
  deathLogRelevanceSec: 15,
  testBars: false,
  maxPastSegments: 12,
  maxArchivedSegments: 100,
  combatBreakSec: 12,
};

export function getMeterAppearance(): MeterAppearanceSettings {
  const s = getSettings();
  const saved = s.meterAppearance || {};
  // Old default was true and got baked into saved appearance blobs. Until the
  // user opts in via Options, ranking bars stay chip-free.
  const optedIn = !!saved.classIconsMigratedOff;
  const maxPast = clampInt(
    saved.maxPastSegments ?? DEFAULT_METER_APPEARANCE.maxPastSegments,
    3,
    50,
    12,
  );
  let maxArchived = clampInt(
    saved.maxArchivedSegments ?? DEFAULT_METER_APPEARANCE.maxArchivedSegments,
    20,
    250,
    100,
  );
  if (maxArchived < maxPast) maxArchived = maxPast;
  return {
    ...DEFAULT_METER_APPEARANCE,
    ...saved,
    showSpecIcons: optedIn ? !!saved.showSpecIcons : false,
    maxPastSegments: maxPast,
    maxArchivedSegments: maxArchived,
    combatBreakSec: clampInt(
      saved.combatBreakSec ?? DEFAULT_METER_APPEARANCE.combatBreakSec,
      3,
      120,
      12,
    ),
  };
}

function clampInt(
  n: number,
  lo: number,
  hi: number,
  fallback: number,
): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < lo) return lo;
  if (r > hi) return hi;
  return r;
}

export function patchMeterAppearance(
  partial: Partial<MeterAppearanceSettings>,
): void {
  patchSettings({
    meterAppearance: {
      ...getMeterAppearance(),
      ...partial,
      classIconsMigratedOff: true,
    },
  });
  notifyMeterAppearance();
}

/** CC / interrupt ability keys tracked for Misc → Interrupts display. */
export const INTERRUPT_ABILITY_KEYS = new Set([
  "agitate",
  "taunt",
  "scare",
  "stomp",
  "warcry",
]);

/** Dispel-like ability keys for Misc → Dispels display. */
export const DISPEL_ABILITY_KEYS = new Set(["curse", "partyheal"]);
