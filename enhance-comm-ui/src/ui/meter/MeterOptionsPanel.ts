/**
 * Details Options Panel shell — appearance & window settings.
 */

import { getReact, e } from "../../host/react";
import { TYPE } from "../../lib/typeScale";
import {
  DEFAULT_METER_APPEARANCE,
  getMeterAppearance,
  patchMeterAppearance,
  type MeterAppearanceSettings,
} from "../../meters/meterAppearance";
import {
  STATUSBAR_PLUGIN_OPTIONS,
  statusbarForInstance,
} from "../../meters/meterStatusbarPlugins";
import type {
  MeterInstance,
  StatusbarPluginId,
} from "../../meters/meterTypes";
import { injectMeterChromeCss } from "./meterChromeCss";

export type MeterOptionsPanelProps = {
  instanceLabel?: string;
  instance?: MeterInstance;
  onPatchInstance?: (partial: Partial<MeterInstance>) => void;
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

function section(label: string): any {
  return e("div", { className: "ecu-meter-opt-sec" }, label);
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

  const scale = app.windowScale > 0 ? app.windowScale : 1;

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
        style: { fontSize: `calc(${TYPE.body} * ${scale})` },
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
        props.instance && props.onPatchInstance
          ? section("This window")
          : null,
        props.instance && props.onPatchInstance
          ? row(
              "Hide header & footer until hover",
              e("input", {
                type: "checkbox",
                checked: !!props.instance.chromeOnHover,
                onChange: (ev: any) =>
                  props.onPatchInstance!({
                    chromeOnHover: ev.target.checked,
                  }),
              }),
            )
          : null,
        props.instance && props.onPatchInstance
          ? (() => {
              const sb = statusbarForInstance(props.instance!);
              const patchSlot = (
                slot: "left" | "center" | "right",
                value: StatusbarPluginId,
              ) => {
                props.onPatchInstance!({
                  statusbar: { ...sb, [slot]: value },
                });
              };
              const sel = (
                slot: "left" | "center" | "right",
                label: string,
              ) =>
                row(
                  label,
                  e(
                    "select",
                    {
                      className: "ecu-meter-opt-select",
                      value: sb[slot],
                      onChange: (ev: any) =>
                        patchSlot(slot, ev.target.value as StatusbarPluginId),
                    },
                    ...STATUSBAR_PLUGIN_OPTIONS.map((opt) =>
                      e(
                        "option",
                        { key: opt.id, value: opt.id },
                        opt.label,
                      ),
                    ),
                  ),
                );
              return e(
                React.Fragment,
                null,
                sel("left", "Statusbar left"),
                sel("center", "Statusbar center"),
                sel("right", "Statusbar right"),
              );
            })()
          : null,
        section("All meters"),
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
          "RAM fights",
          e("input", {
            type: "number",
            min: 3,
            max: 50,
            value: app.maxPastSegments,
            onChange: (ev: any) =>
              patch({ maxPastSegments: Number(ev.target.value) }),
          }),
        ),
        row(
          "Archive fights",
          e("input", {
            type: "number",
            min: 20,
            max: 250,
            title:
              "Oldest non-favorites are removed first. Favorited fights are never deleted and may exceed this cap.",
            value: app.maxArchivedSegments,
            onChange: (ev: any) =>
              patch({ maxArchivedSegments: Number(ev.target.value) }),
          }),
        ),
        row(
          "Idle close (sec)",
          e("input", {
            type: "number",
            min: 3,
            max: 120,
            title: "Skipped on PvP maps and live events",
            value: app.combatBreakSec,
            onChange: (ev: any) =>
              patch({ combatBreakSec: Number(ev.target.value) }),
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
