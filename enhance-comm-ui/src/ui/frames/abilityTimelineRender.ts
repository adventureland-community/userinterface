/**
 * Ability timeline rail (icons) + panel shell. Combat HUD has no toolbar.
 * BigIcon / highlight are their own panels.
 */

import { e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { ABILITY_TIMELINE_PANEL_STYLE } from "../../lib/frameSizes";
import {
  type AbilityTimelinePanelModel,
  type AbilityTimelineSection,
  formatAbilityMs,
  staticStackIndex,
} from "../../instance/abilityTimelineModel";
import {
  abilityVisibleOnRail,
  type AbilityTimelinePrefs,
} from "../../instance/abilityTimelinePrefs";
import {
  formatAbilityCountdown,
  nearTimelineTick,
  rowCdClass,
  timelineTickMs,
} from "../../instance/abilityTimelineChrome";
import { ensureAbilityTimelineCss } from "./abilityTimelineCss";
import {
  abilityIcon,
  cycleKey,
  markerStyle,
  motionDataset,
  tickStyle,
  trailStyle,
} from "./abilityTimelineRenderUtil";
import {
  abilityTimelineHover,
  hideAbilityTimelineTip,
} from "./abilityTimelineTip";

function renderTicks(prefs: AbilityTimelinePrefs): any[] {
  if (!prefs.showTicks) return [];
  const ticks = timelineTickMs(prefs.windowMs);
  const out: any[] = [];
  for (let i = 0; i < ticks.length; i++) {
    const ms = ticks[i];
    out.push(
      e(
        "div",
        {
          key: "tick-" + ms,
          className: "ecu-abil-tick",
          style: tickStyle(ms / prefs.windowMs, prefs),
        },
        e(
          "span",
          { className: "ecu-abil-tick-label" },
          Math.round(ms / 1000) + "s",
        ),
      ),
    );
  }
  return out;
}

function renderScroll(
  section: AbilityTimelineSection,
  prefs: AbilityTimelinePrefs,
): any {
  const rows = section.rows;
  const children: any[] = renderTicks(prefs);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!abilityVisibleOnRail(row.id, row.cooldown, prefs)) continue;
    const stack = row.pinned ? staticStackIndex(rows, row.id) : 0;
    const showTrail = !row.pinned && !row.ready && row.scrollPos > 0;
    if (showTrail) {
      children.push(
        e("div", {
          key: `trail-${cycleKey(section, row)}`,
          className: "ecu-abil-scroll-trail",
          "data-ability": row.id,
          style: trailStyle(row, prefs),
          ...motionDataset(row, prefs, "trail"),
        }),
      );
    }
    const cd = row.ready
      ? formatAbilityMs(row.ms)
      : formatAbilityCountdown(row.ms);
    const remaining = cd || "ready";
    const hot = row.imminent || row.ready;
    const tickFlash = nearTimelineTick(row.ms, prefs.windowMs);
    const markerClass = [
      "ecu-abil-scroll-marker",
      row.imminent ? "ecu-abil-scroll-marker--imminent" : "",
      row.ready ? "ecu-abil-scroll-marker--ready" : "",
      row.pinned ? "ecu-abil-scroll-marker--static" : "",
      !row.pinned && !row.ready ? "ecu-abil-scroll-marker--dynamic" : "",
      tickFlash ? "ecu-abil-scroll-marker--tickflash" : "",
      row.castGen > 0 ? "ecu-abil-scroll-marker--cast" : "",
    ]
      .filter(Boolean)
      .join(" ");
    children.push(
      e(
        "div",
        {
          key: `mk-${cycleKey(section, row)}`,
          className: markerClass,
          "data-ability": row.id,
          ...motionDataset(row, prefs, "marker"),
          ...abilityTimelineHover(
            {
              caster: section.targetName,
              abilityId: row.id,
              abilityName: row.name,
              remainingLabel: remaining,
              cooldown: row.cooldown,
            },
            markerStyle(row, stack, prefs),
          ),
        },
        e(
          "div",
          { className: "ecu-abil-icon-stack" },
          abilityIcon(row.id, hot, prefs.iconSize, section.targetMtype),
          e(
            "span",
            {
              className: ["ecu-abil-icon-cd", rowCdClass(row, prefs)]
                .filter(Boolean)
                .join(" "),
            },
            cd,
          ),
          e("span", { className: "ecu-abil-icon-name" }, row.name),
        ),
      ),
    );
  }
  const secs = String(Math.round(prefs.windowMs / 1000));
  const labels = e(
    "div",
    { className: "ecu-abil-scroll-labels" },
    e(
      "span",
      { className: "ecu-abil-zone-label ecu-abil-zone-label--static" },
      `static >${secs}s`,
    ),
    e(
      "span",
      { className: "ecu-abil-zone-label ecu-abil-zone-label--dynamic" },
      `dynamic ≤${secs}s`,
    ),
  );
  const lane = e("div", { className: "ecu-abil-scroll-lane" }, ...children);
  return e(
    "div",
    {
      className: "ecu-abil-timeline",
      "data-orient": prefs.orient,
    },
    labels,
    lane,
  );
}

function renderSection(
  section: AbilityTimelineSection,
  prefs: AbilityTimelinePrefs,
  showBossLabel: boolean,
): any {
  return e(
    "div",
    {
      key: section.targetId,
      className: "ecu-abil-section",
      "data-target": section.targetId,
    },
    showBossLabel
      ? e("div", { className: "ecu-abil-section-name" }, section.targetName)
      : null,
    renderScroll(section, prefs),
  );
}

export function renderAbilityTimelineShell(
  model: AbilityTimelinePanelModel,
  prefs: AbilityTimelinePrefs,
  layoutEdit: boolean,
  chrome: "inward" | "outward" = "outward",
  opts?: { casterLabels?: boolean },
): any {
  ensureAbilityTimelineCss();
  const showBossLabels =
    opts?.casterLabels !== false && model.sections.length > 1;
  const secs = String(Math.round(prefs.windowMs / 1000));
  const panelStyle = Object.assign({}, ABILITY_TIMELINE_PANEL_STYLE, {
    padding: 0,
    ...PIXEL_TEXT,
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    "--abil-icon": prefs.iconSize + "px",
    "--abil-static-ratio": String(prefs.staticRatio),
    "--abil-icon-margin": prefs.iconMargin + "px",
    "--abil-rail-tint": prefs.railTint,
  });
  const panelClass = [
    "comm-ability-timeline",
    "ecu-abil-panel",
    layoutEdit ? "ecu-abil-panel--layout-edit" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return e(
    "div",
    {
      className: panelClass,
      style: panelStyle,
      "data-orient": prefs.orient,
      "data-reverse": prefs.reverse ? "true" : "false",
      "data-chrome": chrome,
      "data-text-anchor": prefs.textAnchor,
      onMouseLeave: hideAbilityTimelineTip,
    },
    e(
      "div",
      { className: "ecu-abil-sections" },
      ...model.sections.map((section) =>
        renderSection(section, prefs, showBossLabels),
      ),
    ),
    prefs.showLegend
      ? e(
          "div",
          { className: "ecu-abil-legend" },
          `Static zone pins icons while CD >${secs}s. At ${secs}s they slide toward NOW.`,
        )
      : null,
  );
}
