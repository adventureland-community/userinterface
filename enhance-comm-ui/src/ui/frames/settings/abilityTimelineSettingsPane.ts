/**
 * Ability Timeline settings — Travel / Icons / Frames + in-modal dummy preview.
 * Patches prefs immediately. Frame checkboxes write panelVisible.
 */

import { e, getReact } from "../../../host/react";
import type { PanelId, PanelPos } from "../../../lib/layout";
import { getSettings, layoutForProfile } from "../../../lib/settings";
import {
  getAbilityTimelinePrefs,
  patchAbilityTimelinePrefs,
  type AbilityGrowDir,
  type AbilityHighlightGrow,
  type AbilityTextAnchor,
  type AbilityTimelineOrient,
  type AbilityTimelinePrefs,
  type AbilityTimelineScope,
} from "../../../instance/abilityTimelinePrefs";
import {
  defaultAbilityPreviewMtypes,
  listAbilityPreviewCasters,
  type AbilityPreviewCaster,
} from "../../../instance/abilityTimelineDummy";
import {
  useAbilityTimelineLive,
  useAbilityTimelineMotion,
} from "../../hooks/useAbilityTimelineLive";
import { renderAbilityTimelineShell } from "../abilityTimelineRender";
import { renderAbilityBigIcons } from "../AbilityTimelineBigIconPanel";
import { renderAbilityHighlights } from "../AbilityTimelineHighlightPanel";
import { SettingsColorInput } from "./settingsColorInput";

export type AbilityTimelineSettingsPaneProps = {
  visibleBigIcon: boolean;
  visibleHighlight: boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  query?: string;
};

type SettingsPreviewProps = {
  prefs: AbilityTimelinePrefs;
  picked: string[];
};

/**
 * Owns the dummy clock + rAF rail. Keep this off the form tree — a 100ms
 * tick (and combat CommUI snapshots) must not rebuild every Settings control.
 */
function AbilityTimelineSettingsPreview(props: SettingsPreviewProps): any {
  const React = getReact();
  const epochRef = React.useRef(Date.now());
  const hostRef = React.useRef(null as HTMLDivElement | null);
  const { model, hasActive, tickKey } = useAbilityTimelineLive({
    entities: [],
    dummyEpoch: epochRef.current,
    dummyMtypes: props.picked,
  });
  useAbilityTimelineMotion(hostRef, hasActive, tickKey);
  const preview = model || { sections: [] };
  return e(
    "div",
    { className: "ecu-settings-preview" },
    e(
      "div",
      {
        ref: hostRef,
        className: "ecu-settings-preview-rail",
        "data-orient": props.prefs.orient,
      },
      renderAbilityTimelineShell(preview, props.prefs, true, "outward"),
    ),
    e(
      "div",
      { className: "ecu-settings-preview-side" },
      renderAbilityBigIcons(preview, props.prefs),
      renderAbilityHighlights(preview, props.prefs),
    ),
  );
}

function section(label: string): any {
  return e("div", { className: "ecu-settings-sec" }, label);
}

function row(label: string, control: any): any {
  return e(
    "div",
    { className: "ecu-settings-row" },
    e("span", null, label),
    control,
  );
}

function matchesQuery(label: string, query: string, extra?: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${label} ${extra || ""}`.toLowerCase();
  return hay.indexOf(q) !== -1;
}

type AbilityTimelineSearchRowId =
  | "casters"
  | "orientation"
  | "reverseNow"
  | "window"
  | "ticks"
  | "staticZone"
  | "iconMargin"
  | "railTint"
  | "iconSize"
  | "textAnchor"
  | "showReady"
  | "bigIcon"
  | "bigIconGrow"
  | "bigIconMargin"
  | "highlight"
  | "highlightGrow"
  | "highlightMargin"
  | "imminentWindow"
  | "preview";

type AbilityTimelineSearchSection = {
  title: string;
  rows: ReadonlyArray<{
    id: AbilityTimelineSearchRowId;
    label: string;
    extra?: string;
  }>;
};

const ABILITY_TIMELINE_SEARCH_SECTIONS: readonly AbilityTimelineSearchSection[] =
  [
    {
      title: "Travel",
      rows: [
        {
          id: "casters",
          label: "Casters",
          extra: "all visible current target scope",
        },
        {
          id: "orientation",
          label: "Orientation",
          extra: "vertical horizontal",
        },
        { id: "reverseNow", label: "Reverse NOW", extra: "timeline direction" },
        { id: "window", label: "Window", extra: "5s 8s 10s 12s 15s 20s" },
        { id: "ticks", label: "Ticks", extra: "tick marks" },
        { id: "staticZone", label: "Static zone", extra: "ratio still zone" },
        { id: "iconMargin", label: "Icon margin", extra: "spacing" },
        { id: "railTint", label: "Rail tint", extra: "color" },
      ],
    },
    {
      title: "Icons",
      rows: [
        { id: "iconSize", label: "Icon size", extra: "28 36 44 52" },
        {
          id: "textAnchor",
          label: "Text anchor",
          extra: "left right top bottom",
        },
        { id: "showReady", label: "Show ready", extra: "ready state" },
      ],
    },
    {
      title: "Frames",
      rows: [
        { id: "bigIcon", label: "Big Icon", extra: "frame panel visibility" },
        {
          id: "bigIconGrow",
          label: "Big Icon grow",
          extra: "right left down up",
        },
        { id: "bigIconMargin", label: "Big Icon margin", extra: "spacing" },
        {
          id: "highlight",
          label: "Highlight",
          extra: "frame panel visibility",
        },
        { id: "highlightGrow", label: "Highlight grow", extra: "up down" },
        { id: "highlightMargin", label: "Highlight margin", extra: "spacing" },
        { id: "imminentWindow", label: "Imminent window", extra: "3s 5s 8s" },
      ],
    },
    {
      title: "Preview",
      rows: [
        {
          id: "preview",
          label: "Preview",
          extra: "dummy casters monsters rail",
        },
      ],
    },
  ];

function searchRowMeta(id: AbilityTimelineSearchRowId): {
  label: string;
  extra?: string;
} {
  for (let i = 0; i < ABILITY_TIMELINE_SEARCH_SECTIONS.length; i++) {
    const rows = ABILITY_TIMELINE_SEARCH_SECTIONS[i].rows;
    for (let j = 0; j < rows.length; j++) {
      if (rows[j].id === id) return rows[j];
    }
  }
  return { label: id };
}

export function countAbilityTimelineSettingsMatches(query: string): number {
  const q = query.trim();
  if (!q) {
    let total = 0;
    for (let i = 0; i < ABILITY_TIMELINE_SEARCH_SECTIONS.length; i++) {
      total += ABILITY_TIMELINE_SEARCH_SECTIONS[i].rows.length;
    }
    return total;
  }
  let matches = 0;
  for (let i = 0; i < ABILITY_TIMELINE_SEARCH_SECTIONS.length; i++) {
    const rows = ABILITY_TIMELINE_SEARCH_SECTIONS[i].rows;
    for (let j = 0; j < rows.length; j++) {
      if (matchesQuery(rows[j].label, q, rows[j].extra)) matches += 1;
    }
  }
  return matches;
}

function selectCtrl(
  value: string,
  options: Array<{ value: string; label: string }>,
  onChange: (v: string) => void,
): any {
  const kids: any[] = [];
  for (let i = 0; i < options.length; i++) {
    kids.push(
      e(
        "option",
        { key: options[i].value, value: options[i].value },
        options[i].label,
      ),
    );
  }
  return e(
    "select",
    {
      value,
      onChange: (ev: { target: { value: string } }) =>
        onChange(ev.target.value),
    },
    ...kids,
  );
}

function toggleMtype(prev: string[], mtype: string): string[] {
  const next: string[] = [];
  let had = false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] === mtype) {
      had = true;
      continue;
    }
    next.push(prev[i]);
  }
  if (!had) next.push(mtype);
  return next;
}

function previewPickKids(
  casters: AbilityPreviewCaster[],
  picked: string[],
  onToggle: (mtype: string) => void,
): any[] {
  const kids: any[] = [];
  for (let i = 0; i < casters.length; i++) {
    const caster = casters[i];
    let on = false;
    for (let j = 0; j < picked.length; j++) {
      if (picked[j] === caster.mtype) {
        on = true;
        break;
      }
    }
    kids.push(
      e(
        "label",
        {
          key: caster.mtype,
          className: "ecu-settings-pick",
          "data-on": on ? "1" : "0",
        },
        e("input", {
          type: "checkbox",
          checked: on,
          onChange: () => onToggle(caster.mtype),
        }),
        caster.name,
      ),
    );
  }
  return kids;
}

function AbilityTimelineSettingsPaneView(
  props: AbilityTimelineSettingsPaneProps,
): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  const [picked, setPicked] = React.useState(defaultAbilityPreviewMtypes);
  const [casters] = React.useState(listAbilityPreviewCasters);
  const prefs = getAbilityTimelinePrefs();
  const query = (props.query || "").trim();
  const patch = (partial: Partial<AbilityTimelinePrefs>) => {
    patchAbilityTimelinePrefs(partial);
    bump((n: number) => n + 1);
  };
  const patchOrient = (orient: AbilityTimelineOrient) => {
    patch({ orient });
    const pos = layoutForProfile(getSettings()).abilityTimeline;
    if (pos) props.setPanelPos("abilityTimeline", pos);
  };
  const vertical = prefs.orient === "vertical";
  const anchorOpts = vertical
    ? [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ]
    : [
        { value: "top", label: "Top" },
        { value: "bottom", label: "Bottom" },
      ];
  const castersRow = searchRowMeta("casters");
  const orientationRow = searchRowMeta("orientation");
  const reverseNowRow = searchRowMeta("reverseNow");
  const windowRow = searchRowMeta("window");
  const ticksRow = searchRowMeta("ticks");
  const staticZoneRow = searchRowMeta("staticZone");
  const iconMarginRow = searchRowMeta("iconMargin");
  const railTintRow = searchRowMeta("railTint");
  const iconSizeRow = searchRowMeta("iconSize");
  const textAnchorRow = searchRowMeta("textAnchor");
  const showReadyRow = searchRowMeta("showReady");
  const bigIconRow = searchRowMeta("bigIcon");
  const bigIconGrowRow = searchRowMeta("bigIconGrow");
  const bigIconMarginRow = searchRowMeta("bigIconMargin");
  const highlightRow = searchRowMeta("highlight");
  const highlightGrowRow = searchRowMeta("highlightGrow");
  const highlightMarginRow = searchRowMeta("highlightMargin");
  const imminentWindowRow = searchRowMeta("imminentWindow");
  const previewRow = searchRowMeta("preview");

  const kids: any[] = [];
  const pushSection = (
    label: string,
    rows: Array<any | null>,
    extra?: string,
  ) => {
    if (!matchesQuery(label, query, extra)) {
      let anyRow = false;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i]) {
          anyRow = true;
          break;
        }
      }
      if (!anyRow) return;
    }
    kids.push(section(label));
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]) kids.push(rows[i]);
    }
  };
  const maybeRow = (label: string, control: any, extra?: string): any | null =>
    matchesQuery(label, query, extra) ? row(label, control) : null;

  const previewVisible = matchesQuery(
    previewRow.label,
    query,
    previewRow.extra,
  );

  pushSection("Travel", [
    maybeRow(
      castersRow.label,
      selectCtrl(
        prefs.scope,
        [
          { value: "all", label: "All visible" },
          { value: "target", label: "Current target" },
        ],
        (v) => patch({ scope: v as AbilityTimelineScope }),
      ),
      castersRow.extra,
    ),
    maybeRow(
      orientationRow.label,
      selectCtrl(
        prefs.orient,
        [
          { value: "vertical", label: "Vertical" },
          { value: "horizontal", label: "Horizontal" },
        ],
        (v) => patchOrient(v as AbilityTimelineOrient),
      ),
      orientationRow.extra,
    ),
    maybeRow(
      reverseNowRow.label,
      e("input", {
        type: "checkbox",
        checked: prefs.reverse,
        onChange: (ev: { target: { checked: boolean } }) =>
          patch({ reverse: ev.target.checked }),
      }),
      reverseNowRow.extra,
    ),
    maybeRow(
      windowRow.label,
      selectCtrl(
        String(prefs.windowMs),
        [
          { value: "5000", label: "5s" },
          { value: "8000", label: "8s" },
          { value: "10000", label: "10s" },
          { value: "12000", label: "12s" },
          { value: "15000", label: "15s" },
          { value: "20000", label: "20s" },
        ],
        (v) => patch({ windowMs: Number(v) }),
      ),
      windowRow.extra,
    ),
    maybeRow(
      ticksRow.label,
      e("input", {
        type: "checkbox",
        checked: prefs.showTicks,
        onChange: (ev: { target: { checked: boolean } }) =>
          patch({ showTicks: ev.target.checked }),
      }),
      ticksRow.extra,
    ),
    maybeRow(
      staticZoneRow.label,
      e("input", {
        type: "number",
        min: 0.2,
        max: 0.7,
        step: 0.02,
        value: prefs.staticRatio,
        onChange: (ev: { target: { value: string } }) =>
          patch({ staticRatio: Number(ev.target.value) }),
      }),
      staticZoneRow.extra,
    ),
    maybeRow(
      iconMarginRow.label,
      e("input", {
        type: "number",
        min: 0,
        max: 32,
        step: 1,
        value: prefs.iconMargin,
        onChange: (ev: { target: { value: string } }) =>
          patch({ iconMargin: Number(ev.target.value) }),
      }),
      iconMarginRow.extra,
    ),
    maybeRow(
      railTintRow.label,
      e(SettingsColorInput, {
        value: prefs.railTint,
        placeholder: "transparent",
        fallbackColor: "#666666",
        clearLabel: "Reset rail tint",
        allowTransparent: true,
        onCommit: (value: string) => patch({ railTint: value }),
        onClear: () => patch({ railTint: "transparent" }),
      }),
      railTintRow.extra,
    ),
  ]);

  pushSection("Icons", [
    maybeRow(
      iconSizeRow.label,
      selectCtrl(
        String(prefs.iconSize),
        [
          { value: "28", label: "28" },
          { value: "36", label: "36" },
          { value: "44", label: "44" },
          { value: "52", label: "52" },
        ],
        (v) => patch({ iconSize: Number(v) }),
      ),
      iconSizeRow.extra,
    ),
    maybeRow(
      textAnchorRow.label,
      selectCtrl(prefs.textAnchor, anchorOpts, (v) =>
        patch({ textAnchor: v as AbilityTextAnchor }),
      ),
      textAnchorRow.extra,
    ),
    maybeRow(
      showReadyRow.label,
      e("input", {
        type: "checkbox",
        checked: prefs.showReady,
        onChange: (ev: { target: { checked: boolean } }) =>
          patch({ showReady: ev.target.checked }),
      }),
      showReadyRow.extra,
    ),
  ]);

  pushSection("Frames", [
    maybeRow(
      bigIconRow.label,
      e("input", {
        type: "checkbox",
        checked: props.visibleBigIcon,
        onChange: (ev: { target: { checked: boolean } }) =>
          props.setVisible("abilityTimelineBigIcon", ev.target.checked),
      }),
      bigIconRow.extra,
    ),
    maybeRow(
      bigIconGrowRow.label,
      selectCtrl(
        prefs.bigIconGrow,
        [
          { value: "right", label: "Right" },
          { value: "left", label: "Left" },
          { value: "down", label: "Down" },
          { value: "up", label: "Up" },
        ],
        (v) => patch({ bigIconGrow: v as AbilityGrowDir }),
      ),
      bigIconGrowRow.extra,
    ),
    maybeRow(
      bigIconMarginRow.label,
      e("input", {
        type: "number",
        min: 0,
        max: 32,
        step: 1,
        value: prefs.bigIconMargin,
        onChange: (ev: { target: { value: string } }) =>
          patch({ bigIconMargin: Number(ev.target.value) }),
      }),
      bigIconMarginRow.extra,
    ),
    maybeRow(
      highlightRow.label,
      e("input", {
        type: "checkbox",
        checked: props.visibleHighlight,
        onChange: (ev: { target: { checked: boolean } }) =>
          props.setVisible("abilityTimelineHighlight", ev.target.checked),
      }),
      highlightRow.extra,
    ),
    maybeRow(
      highlightGrowRow.label,
      selectCtrl(
        prefs.highlightGrow,
        [
          { value: "up", label: "Up" },
          { value: "down", label: "Down" },
        ],
        (v) => patch({ highlightGrow: v as AbilityHighlightGrow }),
      ),
      highlightGrowRow.extra,
    ),
    maybeRow(
      highlightMarginRow.label,
      e("input", {
        type: "number",
        min: 0,
        max: 32,
        step: 1,
        value: prefs.highlightMargin,
        onChange: (ev: { target: { value: string } }) =>
          patch({ highlightMargin: Number(ev.target.value) }),
      }),
      highlightMarginRow.extra,
    ),
    maybeRow(
      imminentWindowRow.label,
      selectCtrl(
        String(prefs.imminentMs),
        [
          { value: "3000", label: "3s" },
          { value: "5000", label: "5s" },
          { value: "8000", label: "8s" },
        ],
        (v) => patch({ imminentMs: Number(v) }),
      ),
      imminentWindowRow.extra,
    ),
  ]);

  if (previewVisible) {
    kids.push(section(previewRow.label));
    kids.push(
      e(
        "div",
        { className: "ecu-settings-picks" },
        ...previewPickKids(casters, picked, (mtype) =>
          setPicked((prev: string[]) => toggleMtype(prev, mtype)),
        ),
      ),
    );
    kids.push(e(AbilityTimelineSettingsPreview, { prefs, picked }));
  }

  if (!kids.length) {
    kids.push(
      e(
        "p",
        { className: "ecu-settings-help" },
        "No ability timeline settings match this search.",
      ),
    );
  }

  return e("div", null, ...kids);
}

let paneMemo: ((props: AbilityTimelineSettingsPaneProps) => any) | null = null;

export function AbilityTimelineSettingsPane(
  props: AbilityTimelineSettingsPaneProps,
): any {
  const React = getReact();
  if (!paneMemo) paneMemo = React.memo(AbilityTimelineSettingsPaneView);
  return e(paneMemo, props);
}
