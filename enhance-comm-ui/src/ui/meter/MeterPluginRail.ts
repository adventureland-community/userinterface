/**
 * Details Plugin Container left rail — Plugins (Encounter / Time Line / Deaths)
 * shared by the on-demand report window. Encounter Details and Timeline agents
 * both mount this; keep edits additive.
 */

import { getReact, e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import type { ReportKind } from "../../meters/meterCatalog";

export type MeterPluginRailProps = {
  active: ReportKind | null;
  onSelect: (kind: ReportKind) => void;
};

const PLUGINS: Array<{
  kind: ReportKind;
  label: string;
  icon: string;
  title: string;
}> = [
  {
    kind: "encounter",
    label: "Encounter Details",
    icon: "☠",
    title: "Encounter Details",
  },
  {
    kind: "timeline",
    label: "Time Line",
    icon: "▶",
    title: "Time Line",
  },
  {
    kind: "deaths",
    label: "Deaths",
    icon: "✝",
    title: "Death Log",
  },
];

export function MeterPluginRail(props: MeterPluginRailProps): any {
  getReact();
  return e(
    "aside",
    {
      className: "ecu-meter-plugin-rail",
      style: { ...PIXEL_TEXT },
      "aria-label": "Plugins",
    },
    e("div", { className: "ecu-meter-plugin-rail-sec" }, "Plugins"),
    ...PLUGINS.map((p) =>
      e(
        "button",
        {
          key: p.kind,
          type: "button",
          className:
            "ecu-meter-plugin-rail-item" +
            (props.active === p.kind ? " is-active" : ""),
          title: p.title,
          onClick: () => props.onSelect(p.kind),
        },
        e(
          "span",
          { className: "ecu-meter-plugin-rail-ico", "aria-hidden": true },
          p.icon,
        ),
        e("span", { className: "ecu-meter-plugin-rail-lab" }, p.label),
      ),
    ),
    e("div", { className: "ecu-meter-plugin-rail-sec" }, "Tools"),
    e(
      "div",
      {
        className: "ecu-meter-plugin-rail-item is-muted",
        title: "Options live on the meter Mode menu",
      },
      e(
        "span",
        { className: "ecu-meter-plugin-rail-ico", "aria-hidden": true },
        "⚙",
      ),
      e("span", { className: "ecu-meter-plugin-rail-lab" }, "Options"),
    ),
  );
}
