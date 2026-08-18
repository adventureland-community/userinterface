/**
 * Shared rail marker helpers. Keep render files from duplicating icon DOM.
 */

import { e } from "../../host/react";
import { GameIcon } from "../chrome/GameIcon";
import type {
  AbilityTimelineRow,
  AbilityTimelineSection,
} from "../../instance/abilityTimelineModel";
import type { AbilityTimelinePrefs } from "../../instance/abilityTimelinePrefs";

export function stackStep(iconSize: number, iconMargin: number): number {
  return Math.max(20, Math.round(iconSize * 0.86) + iconMargin);
}

export function abilityIcon(
  id: string,
  imminent: boolean,
  size: number,
  mtype?: string,
): any {
  return e(
    "div",
    {
      className: ["ecu-abil-icon", imminent ? "ecu-abil-icon--imminent" : ""]
        .filter(Boolean)
        .join(" "),
    },
    e(GameIcon, {
      id,
      kind: "skill",
      size,
      mtype,
      title: "",
    }),
  );
}

export function motionDataset(
  row: AbilityTimelineRow,
  prefs: AbilityTimelinePrefs,
  kind: "marker" | "trail",
): Record<string, string> {
  if (row.ready || !(row.ms > 0) || !(row.endsAt > 0)) return {};
  return {
    "data-abil-kind": kind,
    "data-abil-ends": String(row.endsAt),
    "data-abil-cd": String(row.cooldown),
    "data-abil-win": String(prefs.windowMs),
  };
}

export function rowKey(
  section: AbilityTimelineSection,
  row: AbilityTimelineRow,
): string {
  return `${section.targetId}:${row.id}`;
}

/** Include castGen so a recast remounts instead of rewinding the same node. */
export function cycleKey(
  section: AbilityTimelineSection,
  row: AbilityTimelineRow,
): string {
  return `${rowKey(section, row)}:g${row.castGen}`;
}

export function axisStart(
  pos: number,
  reverse: boolean,
): { key: "top" | "bottom" | "left" | "right"; value: string } {
  return { key: reverse ? "top" : "bottom", value: `${pos * 100}%` };
}

export function tickStyle(
  pos: number,
  prefs: AbilityTimelinePrefs,
): Record<string, string> {
  if (prefs.orient === "vertical") {
    const start = axisStart(pos, prefs.reverse);
    return { [start.key]: start.value };
  }
  const edge = prefs.reverse ? "left" : "right";
  return { [edge]: `${pos * 100}%` };
}

export function markerStyle(
  row: AbilityTimelineRow,
  stack: number,
  prefs: AbilityTimelinePrefs,
): Record<string, string> {
  const step = stackStep(prefs.iconSize, prefs.iconMargin);
  const stackShift = row.pinned && stack > 0 ? stack * step : 0;
  const half = Math.round(prefs.iconSize / 2);
  const live = row.endsAt > 0 && !row.ready && row.ms > 0;
  if (prefs.orient === "vertical") {
    const y =
      (prefs.reverse ? -half : half) +
      (prefs.reverse ? stackShift : -stackShift);
    const style: Record<string, string> = {
      left: "50%",
      transform: `translate3d(-50%, ${y}px, 0)`,
    };
    if (!live) {
      const start = axisStart(row.scrollPos, prefs.reverse);
      style[start.key] = start.value;
    }
    return style;
  }
  const x = prefs.reverse ? -half : half;
  const style: Record<string, string> = {
    top: "50%",
    transform: `translate3d(${x}px, ${-half + stackShift}px, 0)`,
  };
  if (!live) {
    const edge = prefs.reverse ? "left" : "right";
    style[edge] = `${row.scrollPos * 100}%`;
  }
  return style;
}

export function trailStyle(
  row: AbilityTimelineRow,
  prefs: AbilityTimelinePrefs,
): Record<string, string> {
  const live = row.endsAt > 0;
  if (prefs.orient === "vertical") {
    const style: Record<string, string> = {
      left: "50%",
      width: "2px",
      transform: "translateX(-50%)",
    };
    if (!live) {
      if (prefs.reverse) {
        style.top = "0";
        style.height = `${row.scrollPos * 100}%`;
      } else {
        style.bottom = "0";
        style.height = `${row.scrollPos * 100}%`;
      }
    }
    return style;
  }
  const style: Record<string, string> = {
    top: "50%",
    height: "2px",
    transform: "translateY(-50%)",
  };
  if (!live) {
    if (prefs.reverse) {
      style.left = "0";
      style.width = `${row.scrollPos * 100}%`;
    } else {
      style.right = "0";
      style.width = `${row.scrollPos * 100}%`;
    }
  }
  return style;
}
