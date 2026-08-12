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
};

export const DEFAULT_METER_APPEARANCE: MeterAppearanceSettings = {
  showStatusbar: true,
  showTotalBar: true,
  animateBars: true,
  barHeight: 18,
  barSpacing: 1,
  windowScale: 1,
  showSpecIcons: true,
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
};

export function getMeterAppearance(): MeterAppearanceSettings {
  const s = getSettings();
  return { ...DEFAULT_METER_APPEARANCE, ...(s.meterAppearance || {}) };
}

export function patchMeterAppearance(
  partial: Partial<MeterAppearanceSettings>,
): void {
  patchSettings({
    meterAppearance: { ...getMeterAppearance(), ...partial },
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
