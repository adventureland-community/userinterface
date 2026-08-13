/**
 * Details Options Panel shell — appearance & window settings.
 */

import { getReact, e } from "../../host/react";
import {
  DEFAULT_METER_APPEARANCE,
  getMeterAppearance,
  patchMeterAppearance,
  type MeterAppearanceSettings,
} from "../../meters/meterAppearance";
import { injectMeterChromeCss } from "./meterChromeCss";

export type MeterOptionsPanelProps = {
  instanceLabel?: string;
  onClose: () => void;
};

function row(label: string, control: any): any {
  return e(
    "div",
    { className: "ecu-meter-opt-row" },
    e("span", { className: "ecu-meter-opt-label" }, label),
    control,
  );
}

export function MeterOptionsPanel(props: MeterOptionsPanelProps): any {
  const React = getReact();
  const [app, setApp] = React.useState(getMeterAppearance());
  injectMeterChromeCss();

  const patch = (partial: Partial<MeterAppearanceSettings>) => {
    patchMeterAppearance(partial);
    setApp(getMeterAppearance());
  };

  const chk = (key: keyof MeterAppearanceSettings, label: string) =>
    row(
      label,
      e("input", {
        type: "checkbox",
        checked: !!app[key],
        onChange: (ev: any) => patch({ [key]: ev.target.checked }),
      }),
    );

  return e(
    "div",
    {
      className: "ecu-meter-options-backdrop",
      onMouseDown: (ev: any) => {
        if (ev.target === ev.currentTarget) props.onClose();
      },
    },
    e(
      "div",
      {
        className: "ecu-meter-options-panel",
        onMouseDown: (ev: any) => ev.stopPropagation(),
      },
      e(
        "div",
        { className: "ecu-meter-options-hd" },
        e("b", null, "Options"),
        props.instanceLabel
          ? e(
              "span",
              { className: "ecu-meter-options-sub" },
              props.instanceLabel,
            )
          : null,
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-options-close",
            onClick: props.onClose,
          },
          "×",
        ),
      ),
      e(
        "div",
        { className: "ecu-meter-options-body" },
        chk("showStatusbar", "Show statusbar"),
        chk("showTotalBar", "Total bar"),
        chk("animateBars", "Animate bars"),
        chk("showSpecIcons", "Class icons on bars (optional)"),
        chk("showRankNumbers", "Rank numbers"),
        chk("segmentsLocked", "Segments locked (all windows)"),
        chk("disableGrouping", "Disable new grouping"),
        chk("autoHideCombat", "Fade in combat"),
        chk("autoHideOoc", "Fade out of combat"),
        chk("deathLogLifePct", "Death log life %"),
        chk("deathLogInvert", "Invert death log"),
        row(
          "Bar height",
          e("input", {
            type: "range",
            min: 14,
            max: 28,
            value: app.barHeight,
            onChange: (ev: any) =>
              patch({ barHeight: Number(ev.target.value) }),
          }),
        ),
        row(
          "Window scale",
          e("input", {
            type: "range",
            min: 80,
            max: 140,
            value: Math.round(app.windowScale * 100),
            onChange: (ev: any) =>
              patch({ windowScale: Number(ev.target.value) / 100 }),
          }),
        ),
        row(
          "Idle alpha",
          e("input", {
            type: "range",
            min: 20,
            max: 100,
            value: Math.round(app.idleAlpha * 100),
            onChange: (ev: any) =>
              patch({ idleAlpha: Number(ev.target.value) / 100 }),
          }),
        ),
        row(
          "Test bars",
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-opt-btn",
              onClick: () => patch({ testBars: !app.testBars }),
            },
            app.testBars ? "Hide test bars" : "Show test bars",
          ),
        ),
        row(
          "",
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-opt-btn",
              onClick: () => patch({ ...DEFAULT_METER_APPEARANCE }),
            },
            "Reset defaults",
          ),
        ),
      ),
    ),
  );
}
