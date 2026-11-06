/**
 * Lightweight Settings registry for the live two-pane hub.
 * Keeps nav/search data-driven without reviving the old module registry.
 */

import {
  AbilityTimelineSettingsPane,
  ABILITY_TIMELINE_SUBSECTIONS,
  countAbilityTimelineSettingsMatches,
} from "./abilityTimelineSettingsPane";
import {
  CommUiSettingsPane,
  COMM_UI_SUBSECTIONS,
  countCommUiSettingsMatches,
} from "./commUiSettingsPane";
import {
  CommHudSettingsPane,
  COMM_HUD_SUBSECTIONS,
  countCommHudSettingsMatches,
} from "./commHudSettingsPane";
import {
  InGameSettingsPane,
  DRAWINGS_SUBSECTIONS,
  countInGameSettingsMatches,
} from "./inGameSettingsPane";
import {
  BagSettingsPane,
  BAG_SUBSECTIONS,
  countBagSettingsMatches,
} from "./bagSettingsPane";
import { e } from "../../../host/react";
import type { PanelId, PanelPos } from "../../../lib/layout";
import type { HudDensity } from "../../../lib/perfPrefs";
import type { SettingsSubsection } from "./settingsPaneChrome";

export type SettingsPaneId =
  | "commUi"
  | "abilityTimeline"
  | "drawings"
  | "commHud"
  | "bag";

export type SettingsPaneRenderProps = {
  query: string;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  onReplayTour: (id: string) => void;
  onResetTour: (id: string) => void;
  onOpenChangelog: () => void;
  onOpenServerUpdateNotes: () => void;
  hudDensity?: HudDensity;
  setHudDensity?: (mode: HudDensity) => void;
};

export type SettingsPaneDef = {
  id: SettingsPaneId;
  label: string;
  description: string;
  countMatches: (query: string) => number;
  /** Fold-out jump links under the active left-nav entry. */
  subsections?: readonly SettingsSubsection[];
  render: (props: SettingsPaneRenderProps) => any;
};

export const SETTINGS_PANES: readonly SettingsPaneDef[] = [
  {
    id: "commUi",
    label: "Comm UI",
    description:
      "What's New, server notes, desktop camera controls, experimental FPS / render scale, mobile install help (desktop only), factory-reset local Comm UI data, and guided tours.",
    countMatches: countCommUiSettingsMatches,
    subsections: COMM_UI_SUBSECTIONS,
    render: (props) =>
      e(CommUiSettingsPane, {
        query: props.query,
        onReplayTour: props.onReplayTour,
        onResetTour: props.onResetTour,
        onOpenChangelog: props.onOpenChangelog,
        onOpenServerUpdateNotes: props.onOpenServerUpdateNotes,
      }),
  },
  {
    id: "abilityTimeline",
    label: "Ability Timeline",
    description:
      "Travel, icons, frames, and the live preview rail for timeline windows.",
    countMatches: countAbilityTimelineSettingsMatches,
    subsections: ABILITY_TIMELINE_SUBSECTIONS,
    render: (props) =>
      e(AbilityTimelineSettingsPane, {
        visibleBigIcon: props.visible("abilityTimelineBigIcon"),
        visibleHighlight: props.visible("abilityTimelineHighlight"),
        setVisible: props.setVisible,
        setPanelPos: props.setPanelPos,
        query: props.query,
      }),
  },
  {
    id: "drawings",
    label: "Drawings",
    description:
      "Map drawings master switch, rings, labels, debug lines, and per-ability appearance overrides.",
    countMatches: countInGameSettingsMatches,
    subsections: DRAWINGS_SUBSECTIONS,
    render: (props) => e(InGameSettingsPane, { query: props.query }),
  },
  {
    id: "bag",
    label: "Bag",
    description:
      "Inventory sort rules for the bag panel Sort button on the watched character.",
    countMatches: countBagSettingsMatches,
    subsections: BAG_SUBSECTIONS,
    render: (props) => e(BagSettingsPane, { query: props.query }),
  },
  {
    id: "commHud",
    label: "Comm HUD",
    description:
      "HUD density, meter windows, shell chips, spawn markers, and other Comm HUD helpers.",
    countMatches: countCommHudSettingsMatches,
    subsections: COMM_HUD_SUBSECTIONS,
    render: (props) =>
      e(CommHudSettingsPane, {
        query: props.query,
        hudDensity: props.hudDensity,
        setHudDensity: props.setHudDensity,
      }),
  },
];

export function defaultSettingsPaneId(): SettingsPaneId {
  return SETTINGS_PANES[0].id;
}

export function getSettingsPane(id: SettingsPaneId): SettingsPaneDef {
  for (let i = 0; i < SETTINGS_PANES.length; i++) {
    if (SETTINGS_PANES[i].id === id) return SETTINGS_PANES[i];
  }
  return SETTINGS_PANES[0];
}

export function settingsPaneMatchCounts(
  query: string,
): Record<SettingsPaneId, number> {
  const counts = {} as Record<SettingsPaneId, number>;
  for (let i = 0; i < SETTINGS_PANES.length; i++) {
    const pane = SETTINGS_PANES[i];
    counts[pane.id] = pane.countMatches(query);
  }
  return counts;
}

export function visibleSettingsSubsections(
  pane: SettingsPaneDef,
): SettingsSubsection[] {
  const list = pane.subsections;
  if (!list || !list.length) return [];
  const out: SettingsSubsection[] = [];
  for (let i = 0; i < list.length; i++) {
    const sub = list[i];
    if (sub.visible && !sub.visible()) continue;
    out.push(sub);
  }
  return out;
}
