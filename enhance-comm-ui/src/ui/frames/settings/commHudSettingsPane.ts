import { e, getReact } from "../../../host/react";
import {
  HUD_DENSITIES,
  hudDensityLabel,
  type HudDensity,
} from "../../../lib/perfPrefs";
import { getSettings, patchSettings } from "../../../lib/settings";
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
import {
  settingsCheckboxRow,
  settingsSection,
  settingsSectionId,
  type SettingsSubsection,
} from "./settingsPaneChrome";

export type CommHudSettingsPaneProps = {
  query?: string;
  hudDensity?: HudDensity;
  setHudDensity?: (mode: HudDensity) => void;
};

function buildCommHudSubsections(): readonly SettingsSubsection[] {
  const out: SettingsSubsection[] = [
    { id: settingsSectionId("HUD density"), label: "HUD density" },
    { id: settingsSectionId("Meters"), label: "Meters" },
  ];
  const sections = overlayToggleSectionsForPane("commHud");
  for (let i = 0; i < sections.length; i++) {
    out.push({
      id: settingsSectionId(sections[i].title),
      label: sections[i].title,
    });
  }
  return out;
}

export const COMM_HUD_SUBSECTIONS: readonly SettingsSubsection[] =
  buildCommHudSubsections();

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

function matchesQuery(hay: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return hay.toLowerCase().includes(q);
}

function hudDensityMatches(query: string): boolean {
  return matchesQuery(
    "hud density lite full auto phone mobile windows panels clutter",
    query,
  );
}

function metersMatches(query: string): boolean {
  return matchesQuery("meters hide dps hps combat skada", query);
}

export function countCommHudSettingsMatches(query: string): number {
  const q = query.trim().toLowerCase();
  const sections = overlayToggleSectionsForPane("commHud");
  let total = 0;
  if (hudDensityMatches(query)) total += 1;
  if (metersMatches(query)) total += 1;
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
  const [tick, setTick] = React.useState(0);
  void tick;
  React.useEffect(
    () => subscribeVizSettings(() => bump((n: number) => n + 1)),
    [],
  );
  const vizSettings = getVizSettings();
  const settings = getSettings();
  const query = String(props.query || "")
    .trim()
    .toLowerCase();
  const density =
    props.hudDensity != null ? props.hudDensity : settings.hudDensity || "auto";
  const setDensity =
    props.setHudDensity ||
    ((mode: HudDensity) => {
      patchSettings({ hudDensity: mode });
      setTick((n: number) => n + 1);
    });
  const sections = overlayToggleSectionsForPane("commHud");
  const kids: any[] = [
    e(
      "p",
      { className: "ecu-settings-lead" },
      "HUD density, meter window visibility, and Comm HUD overlay chips on the shell.",
    ),
  ];
  let rowCount = 0;

  if (hudDensityMatches(query)) {
    rowCount += 1;
    kids.push(settingsSection("HUD density"));
    kids.push(
      e(
        "p",
        { key: "density-help", className: "ecu-settings-help" },
        "Lite hides ability timeline, minimap, threat, kills, unit frames, instance, and enemies until you reopen them. Auto uses lite on phone only. Bank / mail / market polls also run slower on phone.",
      ),
    );
    const densityKids: any[] = [];
    for (let i = 0; i < HUD_DENSITIES.length; i++) {
      const mode = HUD_DENSITIES[i];
      densityKids.push(
        e(
          "label",
          {
            key: mode,
            className: "ecu-settings-row",
            style: { display: "flex", gap: "10px", alignItems: "center" },
          },
          e("input", {
            type: "radio",
            name: "ecu-hud-density",
            checked: density === mode,
            onChange: () => setDensity(mode),
          }),
          e("span", null, hudDensityLabel(mode)),
        ),
      );
    }
    kids.push(e("div", { key: "density" }, densityKids));
  }

  if (metersMatches(query)) {
    rowCount += 1;
    kids.push(settingsSection("Meters"));
    kids.push(
      settingsCheckboxRow(
        "meters",
        "Hide meter windows",
        !!settings.metersHidden,
        (next) => {
          patchSettings({ metersHidden: next });
          setTick((n: number) => n + 1);
        },
        {
          help: "Hides DPS/HPS frames. Damage ingest still runs so reports stay correct when you show them again.",
        },
      ),
    );
  }

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
          vizSettings[def.key],
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
