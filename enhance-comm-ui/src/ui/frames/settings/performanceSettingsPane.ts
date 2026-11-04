/**
 * Settings → Performance — HUD density, overlay, meters, mobile install help.
 * Does not pause meter/socket trackers on tab hide.
 */

import { e, getReact } from "../../../host/react";
import {
  getSettings,
  patchSettings,
} from "../../../lib/settings";
import {
  HUD_DENSITIES,
  hudDensityLabel,
  type HudDensity,
} from "../../../lib/perfPrefs";
import {
  startWorldOverlay,
  stopWorldOverlay,
} from "../../../viz/startWorldOverlay";
import { settingsCheckboxRow, settingsSection } from "./settingsPaneChrome";

export type PerformanceSettingsPaneProps = {
  query?: string;
  hudDensity?: HudDensity;
  setHudDensity?: (mode: HudDensity) => void;
};

const TAMPERMONKEY_MOBILE_FAQ =
  "https://www.tampermonkey.net/faq.php?locale=en&q=Q406";

function matchesQuery(hay: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return hay.toLowerCase().includes(q);
}

export function countPerformanceSettingsMatches(query: string): number {
  let n = 0;
  if (
    matchesQuery(
      "hud density lite full auto phone mobile windows panels clutter",
      query,
    )
  ) {
    n += 1;
  }
  if (
    matchesQuery(
      "world overlay drawings vision fog map rings performance battery",
      query,
    )
  ) {
    n += 1;
  }
  if (matchesQuery("meters hide dps hps combat skada", query)) n += 1;
  if (
    matchesQuery(
      "tampermonkey mobile phone android ios edge firefox safari q406 install",
      query,
    )
  ) {
    n += 1;
  }
  return n;
}

export function PerformanceSettingsPane(
  props: PerformanceSettingsPaneProps,
): any {
  const React = getReact();
  const query = String(props.query || "").trim();
  const [tick, setTick] = React.useState(0);
  void tick;

  const settings = getSettings();
  const density =
    props.hudDensity != null ? props.hudDensity : settings.hudDensity || "auto";
  const setDensity =
    props.setHudDensity ||
    ((mode: HudDensity) => {
      patchSettings({ hudDensity: mode });
      setTick((n: number) => n + 1);
    });

  const kids: any[] = [
    e(
      "p",
      { key: "lead", className: "ecu-settings-lead" },
      "Cut windows and optional map drawings. Combat meters and socket trackers keep running when the tab is in the background so desktop farming is not starved.",
    ),
  ];

  if (
    matchesQuery(
      "hud density lite full auto phone mobile windows panels clutter",
      query,
    )
  ) {
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

  if (
    matchesQuery(
      "world overlay drawings vision fog map rings performance battery",
      query,
    )
  ) {
    kids.push(settingsSection("Map drawings"));
    kids.push(
      settingsCheckboxRow(
        "overlay",
        "World overlay loop",
        settings.worldOverlayEnabled !== false,
        (next) => {
          patchSettings({ worldOverlayEnabled: next });
          if (next) startWorldOverlay();
          else stopWorldOverlay();
          setTick((n: number) => n + 1);
        },
        {
          help: "Rings, vision fog, and other PIXI drawings. Off saves GPU; socket combat tracking is unchanged.",
        },
      ),
    );
  }

  if (matchesQuery("meters hide dps hps combat skada", query)) {
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

  if (
    matchesQuery(
      "tampermonkey mobile phone android ios edge firefox safari q406 install",
      query,
    )
  ) {
    kids.push(settingsSection("Mobile install"));
    kids.push(
      e(
        "p",
        { key: "tm-help", className: "ecu-settings-help" },
        "ECU runs as a Tampermonkey userscript inside Adventure.land. On phone use Edge (Android), Firefox (Android), or Safari (iOS) with the matching Tampermonkey build.",
      ),
    );
    kids.push(
      e(
        "p",
        { key: "tm-link", className: "ecu-settings-help" },
        e(
          "a",
          {
            href: TAMPERMONKEY_MOBILE_FAQ,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { color: "#8ec8e8" },
          },
          "Tampermonkey FAQ · official mobile versions (Q406)",
        ),
      ),
    );
  }

  return e("div", { className: "ecu-settings-pane" }, kids);
}
