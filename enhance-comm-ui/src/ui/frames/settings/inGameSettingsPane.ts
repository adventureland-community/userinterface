/**
 * Settings → Drawings — map rings, entity lines, labels, and per-ability appearance.
 * Persistence is vizSettings; this pane is checkboxes + tags only.
 */

import { e, getReact } from "../../../host/react";
import {
  overlayToggleSectionsForPane,
  type OverlayToggleDef,
  type OverlayToggleSection,
} from "../../../viz/overlayToggleCatalog";
import {
  getVizSettings,
  patchVizSettings,
  resetVizSettings,
  subscribeVizSettings,
  type VizSettingKey,
} from "../../../viz/vizSettings";
import { settingsCheckboxRow, settingsSection } from "./settingsPaneChrome";
import {
  InGameAbilityRulesSectionMemo,
  countInGameAbilityRuleMatches,
} from "./inGameAbilityRulesSection";
import { resetVizAbilityRules } from "../../../viz/vizAbilityRules";

export type InGameSettingsPaneProps = {
  query?: string;
};

type InGameSectionDef = {
  title: string;
  matchesQuery: (query: string) => number;
  render: (args: {
    settings: ReturnType<typeof getVizSettings>;
    setKey: (key: VizSettingKey, next: boolean) => void;
    bump: () => void;
    query: string;
  }) => any[];
};

function tagLabel(tag: OverlayToggleDef["tag"]): string | null {
  if (!tag) return null;
  switch (tag) {
    case "static":
      return "static";
    case "debug":
      return "debug";
    default: {
      const _never: never = tag;
      void _never;
      return null;
    }
  }
}

function matchesOverlayToggle(
  def: OverlayToggleDef,
  title: string,
  query: string,
): boolean {
  if (!query) return true;
  const hay =
    `${title} ${def.label} ${def.key} ${def.help || ""} ${def.tag || ""}`.toLowerCase();
  return hay.indexOf(query) !== -1;
}

function countOverlayToggleMatches(
  title: string,
  defs: readonly OverlayToggleDef[],
  query: string,
): number {
  if (!query) return defs.length;
  let total = 0;
  for (let i = 0; i < defs.length; i++) {
    if (matchesOverlayToggle(defs[i], title, query)) total += 1;
  }
  return total;
}

function renderOverlaySection(
  title: string,
  defs: readonly OverlayToggleDef[],
  settings: ReturnType<typeof getVizSettings>,
  setKey: (key: VizSettingKey, next: boolean) => void,
  query: string,
): any[] {
  const rows: any[] = [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (!matchesOverlayToggle(def, title, query)) continue;
    rows.push(
      settingsCheckboxRow(
        def.key,
        def.label,
        settings[def.key],
        (next) => setKey(def.key, next),
        {
          help: def.help,
          tag: tagLabel(def.tag) || undefined,
        },
      ),
    );
  }
  if (!rows.length) return [];
  return [settingsSection(title), ...rows];
}

function catalogSectionToInGameSection(
  sec: OverlayToggleSection,
): InGameSectionDef {
  return {
    title: sec.title,
    matchesQuery: (query) =>
      countOverlayToggleMatches(sec.title, sec.defs, query),
    render: ({ settings, setKey, query }) =>
      renderOverlaySection(sec.title, sec.defs, settings, setKey, query),
  };
}

const ABILITY_APPEARANCE_SECTION: InGameSectionDef = {
  title: "Ability appearance",
  matchesQuery: countInGameAbilityRuleMatches,
  render: ({ bump, query }) => [
    e(InGameAbilityRulesSectionMemo, {
      key: "abil-rules",
      bump,
      query,
    }),
  ],
};

function buildInGameSections(): readonly InGameSectionDef[] {
  const drawing = overlayToggleSectionsForPane("drawings");
  const out: InGameSectionDef[] = [];
  for (let i = 0; i < drawing.length; i++) {
    const section = drawing[i];
    out.push(catalogSectionToInGameSection(section));
    if (section.id === "labels") out.push(ABILITY_APPEARANCE_SECTION);
  }
  return out;
}

const IN_GAME_SECTIONS = buildInGameSections();

function InGameSettingsPaneView(props: InGameSettingsPaneProps): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  React.useEffect(
    () => subscribeVizSettings(() => bump((n: number) => n + 1)),
    [],
  );
  const settings = getVizSettings();
  const query = React.useMemo(
    () =>
      String(props.query || "")
        .trim()
        .toLowerCase(),
    [props.query],
  );
  const setKey = React.useCallback((key: VizSettingKey, next: boolean) => {
    patchVizSettings({ [key]: next });
  }, []);
  const forceBump = React.useCallback(() => bump((n: number) => n + 1), []);
  const kids = React.useMemo(() => {
    const nextKids: any[] = [
      e(
        "p",
        { key: "lead", className: "ecu-settings-lead" },
        "Rings, labels, entity lines, and debug overlays for the /comm world map.",
      ),
    ];
    for (let i = 0; i < IN_GAME_SECTIONS.length; i++) {
      const section = IN_GAME_SECTIONS[i];
      if (query && section.matchesQuery(query) === 0) continue;
      const rows = section.render({
        settings,
        setKey,
        bump: forceBump,
        query,
      });
      for (let j = 0; j < rows.length; j++) nextKids.push(rows[j]);
    }
    nextKids.push(
      e(
        "div",
        { key: "reset", className: "ecu-settings-row" },
        e("span", null, "Reset drawing defaults"),
        e(
          "button",
          {
            type: "button",
            className: "ecu-settings-reset",
            onClick: () => {
              resetVizSettings();
              resetVizAbilityRules();
              forceBump();
            },
          },
          "Reset",
        ),
      ),
    );
    if (nextKids.length === 2) {
      nextKids.splice(
        1,
        0,
        e(
          "p",
          { key: "empty", className: "ecu-settings-help" },
          "No drawing settings match this search.",
        ),
      );
    }
    return nextKids;
  }, [forceBump, query, setKey, settings]);
  return e("div", null, ...kids);
}

let paneMemo: ((props: InGameSettingsPaneProps) => any) | null = null;

export function countInGameSettingsMatches(query: string): number {
  const q = query.trim().toLowerCase();
  let total = 0;
  for (let i = 0; i < IN_GAME_SECTIONS.length; i++) {
    total += IN_GAME_SECTIONS[i].matchesQuery(q);
  }
  return total;
}

export function InGameSettingsPane(props?: InGameSettingsPaneProps): any {
  const React = getReact();
  if (!paneMemo) paneMemo = React.memo(InGameSettingsPaneView);
  return e(paneMemo, props || {});
}
