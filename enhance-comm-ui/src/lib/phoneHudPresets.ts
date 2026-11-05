/**
 * Phone HUD layout presets — patch phoneHudVisible + hudDensity via saveSettings.
 */

import type { PanelId } from "./layout";
import type { HudDensity } from "./perfPrefs";
import type { PanelVisibleMap } from "./panelCatalog";

export type PhoneHudPresetId = "combat" | "social" | "minimal";

export type PhoneHudPresetPatch = {
  phoneHudVisible: PanelVisibleMap;
  hudDensity: HudDensity;
  /** When true, replace phoneHudVisible instead of merging (Minimal preset). */
  replacePhoneHudVisible?: boolean;
};

const COMBAT_WIDGETS: readonly PanelId[] = [
  "playerFrame",
  "targetFrame",
  "threat",
  "abilityTimeline",
  "enemies",
  "kills",
  "minimap",
];

const SOCIAL_WIDGETS: readonly PanelId[] = [
  "events",
  "eventScore",
  "eventRoster",
  "paperdoll",
];

function visibleMap(ids: readonly PanelId[], on: boolean): PanelVisibleMap {
  const out: PanelVisibleMap = {};
  for (let i = 0; i < ids.length; i++) out[ids[i]] = on;
  return out;
}

export const PHONE_HUD_PRESET_LABELS: Record<PhoneHudPresetId, string> = {
  combat: "Combat",
  social: "Social",
  minimal: "Minimal",
};

export function phoneHudPresetPatch(id: PhoneHudPresetId): PhoneHudPresetPatch {
  switch (id) {
    case "combat":
      return {
        hudDensity: "auto",
        phoneHudVisible: visibleMap(COMBAT_WIDGETS, true),
      };
    case "social":
      return {
        hudDensity: "auto",
        phoneHudVisible: {
          ...visibleMap(COMBAT_WIDGETS, false),
          ...visibleMap(SOCIAL_WIDGETS, true),
        },
      };
    case "minimal":
      return {
        hudDensity: "lite",
        phoneHudVisible: {},
        replacePhoneHudVisible: true,
      };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export const PHONE_HUD_PRESET_IDS: readonly PhoneHudPresetId[] = [
  "combat",
  "social",
  "minimal",
];
