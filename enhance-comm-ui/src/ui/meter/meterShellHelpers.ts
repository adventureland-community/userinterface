import { e } from "../../host/react";
import {
  BAR_MODE_CYCLE,
  DISPLAY_TREE,
  displayLabelForQuery,
  supportsViewModes,
} from "../../meters/meterCatalog";
import { CHANNEL_LABELS } from "../../meters/combatChannels";
import { listSegmentChoices } from "../../meters/meterSession";
import { refsEqual } from "../../meters/meterSegmentRef";
import type {
  MeterInstance,
  MeterPresentation,
  MeterQuery,
  PlayersMetric,
  PlayersPrimary,
  SegmentRef,
} from "../../meters/meterTypes";
import type { MeterCooltipItem } from "./meterCooltipMenu";
import type { ToolbarIconId } from "./meterToolbarIcons";

export function presentationFor(inst: MeterInstance): MeterPresentation {
  const p = (inst.presentation || "bars") as string;
  // Legacy ranked view modes removed — paint as bars.
  if (p === "table") return "bars";
  if ((p === "realtime" || p === "compare") && supportsViewModes(inst.query)) {
    return "bars";
  }
  return p as MeterPresentation;
}

export function rootQuery(inst: MeterInstance): MeterQuery {
  return inst.query;
}

export function meterShellTourId(query: MeterQuery): string | undefined {
  if (query.kind === "snapshot") {
    if (query.mode === "pdps") return "meter-pdps";
    if (query.mode === "coop_v1" || query.mode === "coop_v2")
      return "meter-coop";
  }
  return undefined;
}

export { formatCompactRatePerSec } from "../../lib/format";

export function detailsAttributeLabel(
  metric?: PlayersMetric,
  primary?: PlayersPrimary,
): string {
  const rate = primary === "rate";
  if (metric === "heal") return rate ? "HPS" : "Healing Done";
  if (metric === "taken") return "Damage Taken";
  if (metric === "healing_required") return "Healing Required";
  if (metric === "avoidance") return "Avoidance";
  return rate ? "DPS" : "Damage Done";
}

/** Details title: "{Attribute} of {player}". */
export function detailsWindowTitle(
  actorName: string,
  metric?: PlayersMetric,
  primary?: PlayersPrimary,
): string {
  return `${detailsAttributeLabel(metric, primary)} of ${actorName}`;
}

export function modeLabel(q: MeterQuery, label?: string): string {
  const fromCycle = displayLabelForQuery(q);
  if (fromCycle) return fromCycle;
  if (label) return label;
  switch (q.kind) {
    case "players":
      return q.metric === "heal"
        ? "Healing"
        : q.metric === "taken"
          ? "Damage taken"
          : q.metric === "healing_required"
            ? "Healing required"
            : q.metric === "avoidance"
              ? "Avoidance"
              : "Damage";
    case "channel":
      return CHANNEL_LABELS[q.channel] || q.channel;
    case "rolling":
    case "realtime":
      return "Hit DPS";
    case "snapshot":
      return q.mode;
    case "death_log":
      return "Deaths";
    case "history":
      return "DPS graph";
    case "compare":
      return "Compare";
    case "encounter_summary":
      return "Encounter Details";
    case "taken_by_spell":
      return "Damage Taken by Spell";
    case "enemy_damage":
      return "Adds";
    case "timeline":
      return "Time Line";
    case "pie":
      return "Pie";
    case "summary":
      return "Summary";
    case "details":
      return detailsAttributeLabel(q.metric, q.primary);
    case "abilities":
    case "ability_targets":
    case "targets":
    case "avoidance":
    case "conditions":
    case "misc":
      return "Meter";
    default: {
      const _exhaustive: never = q;
      return String(_exhaustive);
    }
  }
}

export function chromeBtn(
  title: string,
  label: string,
  onClick: (ev: any) => void,
  active?: boolean,
  wide?: boolean,
): any {
  return e(
    "button",
    {
      type: "button",
      title,
      onClick: (ev: any) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick(ev);
      },
      onPointerDown: (ev: any) => ev.stopPropagation(),
      className:
        "ecu-meter-btn" + (wide ? " wide" : "") + (active ? " active" : ""),
    },
    label,
  );
}

export type ToolBtnOpts = {
  title: string;
  /** Fallback text when icon atlas unavailable. */
  glyph?: string;
  icon?: ToolbarIconId;
  active?: boolean;
  /** Guided tour spotlight target. */
  tourId?: string;
  onClick?: (ev: any) => void;
  onContextMenu?: (ev: any) => void;
  onEnter?: (el: HTMLElement) => void;
  onLeave?: () => void;
};

/** Details toolbar icon — hover opens Cooltip. */
export function toolBtn(opts: ToolBtnOpts): any {
  const iconClass = opts.icon ? " is-icon icon-" + opts.icon : "";
  // Native browser tooltips steal hover / cover menus — skip when Cooltip owns hover.
  const useNativeTitle = !opts.onEnter;
  return e(
    "button",
    {
      type: "button",
      title: useNativeTitle ? opts.title : undefined,
      "aria-label": opts.title,
      ...(opts.tourId ? { "data-ecu-tour": opts.tourId } : {}),
      onClick: (ev: any) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (opts.onClick) opts.onClick(ev);
      },
      onContextMenu: opts.onContextMenu
        ? (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            opts.onContextMenu!(ev);
          }
        : undefined,
      onPointerDown: (ev: any) => ev.stopPropagation(),
      onMouseEnter: (ev: any) => {
        if (opts.onEnter) opts.onEnter(ev.currentTarget as HTMLElement);
      },
      onMouseLeave: () => {
        if (opts.onLeave) opts.onLeave();
      },
      className: "ecu-meter-tool" + iconClass + (opts.active ? " active" : ""),
    },
    opts.icon ? null : opts.glyph || "",
  );
}

export function attrBallClass(q: MeterQuery): string {
  if (q.kind === "players") {
    if (q.metric === "heal" || q.metric === "healing_required")
      return "attr-heal";
    if (q.metric === "taken") return "attr-taken";
    return "attr-damage";
  }
  return "attr-other";
}

export function cooltipItemNode(
  item: MeterCooltipItem,
  onHoverDetail?: (
    key: string,
    text: string | null,
    el?: HTMLElement | null,
  ) => void,
): any {
  const run = (ev: any) => {
    ev.preventDefault();
    ev.stopPropagation();
    item.onSelect();
  };
  const itemKey = item.itemKey || item.label;
  const label = (item.selected ? "● " : "") + item.label;
  const enter = onHoverDetail
    ? (ev: any) =>
        onHoverDetail(
          itemKey,
          item.detail || null,
          ev.currentTarget as HTMLElement,
        )
    : undefined;
  if (!item.trailing) {
    return e(
      "button",
      {
        key: itemKey,
        type: "button",
        className:
          "ecu-meter-cooltip-item" +
          (item.selected ? " is-selected" : "") +
          (item.muted ? " is-muted" : "") +
          (item.className ? " " + item.className : ""),
        onMouseEnter: enter,
        onMouseDown: run,
        onClick: (ev: any) => {
          ev.preventDefault();
          ev.stopPropagation();
        },
      },
      label,
    );
  }
  const trail = item.trailing;
  return e(
    "div",
    {
      key: itemKey,
      className:
        "ecu-meter-cooltip-row" +
        (item.selected ? " is-selected" : "") +
        (item.muted ? " is-muted" : "") +
        (item.className ? " " + item.className : ""),
      onMouseEnter: enter,
    },
    e(
      "button",
      {
        type: "button",
        className: "ecu-meter-cooltip-main",
        onMouseDown: run,
        onClick: (ev: any) => {
          ev.preventDefault();
          ev.stopPropagation();
        },
      },
      label,
    ),
    e(
      "button",
      {
        type: "button",
        className:
          "ecu-meter-cooltip-trail" +
          (trail.className ? " " + trail.className : ""),
        title: trail.title,
        onMouseDown: (ev: any) => {
          ev.preventDefault();
          ev.stopPropagation();
          trail.onSelect();
        },
        onClick: (ev: any) => {
          ev.preventDefault();
          ev.stopPropagation();
        },
      },
      trail.label,
    ),
  );
}

/** Details segment L/R cycle: +1 older, -1 newer. */
export function cycleSegmentRef(
  current: SegmentRef,
  delta: number,
): SegmentRef {
  const chain = listSegmentChoices();
  if (!chain.length) return current;
  let idx = 0;
  for (let i = 0; i < chain.length; i++) {
    if (refsEqual(chain[i].ref, current)) {
      idx = i;
      break;
    }
  }
  const next = idx + delta;
  if (next < 0) return chain[chain.length - 1].ref;
  if (next >= chain.length) return chain[0].ref;
  return chain[next].ref;
}

/** Portal to body when createPortal exists; otherwise render inline. */
export function portalOrInline(
  ReactDOM: { createPortal?: (node: any, container: Element) => any },
  node: any,
  container: Element = document.body,
): any {
  if (!node) return null;
  if (ReactDOM.createPortal) return ReactDOM.createPortal(node, container);
  return node;
}
