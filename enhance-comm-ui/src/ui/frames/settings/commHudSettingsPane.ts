import { e, getReact } from "../../../host/react";
import {
  overlayToggleSectionsForPane,
  type OverlayToggleDef,
} from "../../../viz/overlayToggleCatalog";
import {
  getVizSettings,
  patchVizSettings,
  subscribeVizSettings,
  type VizSettingKey,
} from "../../../viz/vizSettings";
import { settingsCheckboxRow, settingsSection } from "./settingsPaneChrome";

export type CommHudSettingsPaneProps = {
  query?: string;
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

function matchesOverlayToggle(def: OverlayToggleDef, query: string): boolean {
  if (!query) return true;
  const hay =
    `${def.label} ${def.key} ${def.help || ""} ${def.tag || ""}`.toLowerCase();
  return hay.includes(query);
}

export function countCommHudSettingsMatches(query: string): number {
  const q = query.trim().toLowerCase();
  const sections = overlayToggleSectionsForPane("commHud");
  let total = 0;
  for (let s = 0; s < sections.length; s++) {
    const defs = sections[s].defs;
    for (let i = 0; i < defs.length; i++) {
      if (matchesOverlayToggle(defs[i], q)) total += 1;
    }
  }
  return total;
}

export function CommHudSettingsPane(props: CommHudSettingsPaneProps): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  React.useEffect(
    () => subscribeVizSettings(() => bump((n: number) => n + 1)),
    [],
  );
  const settings = getVizSettings();
  const query = String(props.query || "")
    .trim()
    .toLowerCase();
  const sections = overlayToggleSectionsForPane("commHud");
  const kids: any[] = [
    e(
      "p",
      { className: "ecu-settings-lead" },
      "Comm HUD overlay helpers that add chips and markers to the shell itself.",
    ),
  ];
  let rowCount = 0;
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const rows: any[] = [];
    for (let i = 0; i < section.defs.length; i++) {
      const def = section.defs[i];
      if (!matchesOverlayToggle(def, query)) continue;
      rows.push(
        settingsCheckboxRow(
          def.key,
          def.label,
          settings[def.key],
          (next) =>
            patchVizSettings({ [def.key]: next } as Partial<
              Record<VizSettingKey, boolean>
            >),
          {
            help: def.help,
            tag: tagLabel(def.tag) || undefined,
          },
        ),
      );
    }
    if (!rows.length) continue;
    rowCount += rows.length;
    kids.push(settingsSection(section.title), ...rows);
  }
  if (!rowCount) {
    kids.push(
      e(
        "p",
        { className: "ecu-settings-help" },
        "No Comm HUD settings match this search.",
      ),
    );
  }
  return e("div", null, ...kids);
}
