/**
 * Lightweight Settings registry for the live two-pane hub.
 * Keeps nav/search data-driven without reviving the old module registry.
 */

import {
  AbilityTimelineSettingsPane,
  countAbilityTimelineSettingsMatches,
} from "./abilityTimelineSettingsPane";
import {
  CommUiSettingsPane,
  countCommUiSettingsMatches,
} from "./commUiSettingsPane";
import {
  CommHudSettingsPane,
  countCommHudSettingsMatches,
} from "./commHudSettingsPane";
import {
  InGameSettingsPane,
  countInGameSettingsMatches,
} from "./inGameSettingsPane";
import { e } from "../../../host/react";
import type { PanelId, PanelPos } from "../../../lib/layout";

export type SettingsPaneId =
  "commUi" | "abilityTimeline" | "drawings" | "commHud";

export type SettingsPaneRenderProps = {
  query: string;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  onReplayIntroTour: () => void;
  onOpenChangelog: () => void;
};

export type SettingsPaneDef = {
  id: SettingsPaneId;
  label: string;
  description: string;
  countMatches: (query: string) => number;
  render: (props: SettingsPaneRenderProps) => any;
};

export const SETTINGS_PANES: readonly SettingsPaneDef[] = [
  {
    id: "commUi",
    label: "Comm UI",
    description: "Intro tour, What's New, and release history for the shell.",
    countMatches: countCommUiSettingsMatches,
    render: (props) =>
      e(CommUiSettingsPane, {
        query: props.query,
        onReplayIntroTour: props.onReplayIntroTour,
        onOpenChangelog: props.onOpenChangelog,
      }),
  },
  {
    id: "abilityTimeline",
    label: "Ability Timeline",
    description:
      "Travel, icons, frames, and the live preview rail for timeline windows.",
    countMatches: countAbilityTimelineSettingsMatches,
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
      "Map drawings, rings, labels, debug lines, and per-ability appearance overrides.",
    countMatches: countInGameSettingsMatches,
    render: (props) => e(InGameSettingsPane, { query: props.query }),
  },
  {
    id: "commHud",
    label: "Comm HUD",
    description:
      "Shell chips, spawn markers, and other Comm HUD panel helpers.",
    countMatches: countCommHudSettingsMatches,
    render: (props) => e(CommHudSettingsPane, { query: props.query }),
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
