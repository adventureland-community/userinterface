/**
 * Hover cooltip for ability-timeline icons (rail / BigIcon / highlight).
 * Reuses the meter tooltip shell so it is not clipped by the rail frame.
 */

import { getG } from "../../host/al";
import { skillIconHtml } from "../../lib/gameIcon";
import {
  escapeHtml,
  hideMeterTooltip,
  METER_TT_ICON,
  showMeterTooltip,
} from "../../meters/meterTooltip";

export type AbilityTimelineTipArgs = {
  caster: string;
  abilityId: string;
  abilityName: string;
  remainingLabel: string;
  cooldown: number;
};

function cooldownLabel(ms: number): string {
  if (!(ms > 0)) return "";
  if (ms >= 1000) {
    const sec = Math.round(ms / 100) / 10;
    return Number.isInteger(sec) ? sec + "s" : sec.toFixed(1) + "s";
  }
  return ms + "ms";
}

function skillExplanation(id: string): string {
  if (typeof window === "undefined") return "";
  const raw = getG()?.skills?.[id]?.explanation;
  return typeof raw === "string" ? raw : "";
}

export function abilityTimelineTipHtml(args: AbilityTimelineTipArgs): string {
  const explain = skillExplanation(args.abilityId);
  const cd = cooldownLabel(args.cooldown);
  const lines = [
    `<h4>${skillIconHtml(args.abilityId, METER_TT_ICON)} ${escapeHtml(args.abilityName)}</h4>`,
    `<div class="line"><span>Caster</span><b>${escapeHtml(args.caster)}</b></div>`,
    `<div class="line"><span>Ready</span><b>${escapeHtml(args.remainingLabel)}</b></div>`,
  ];
  if (cd) {
    lines.push(
      `<div class="line"><span>Cooldown</span><b>${escapeHtml(cd)}</b></div>`,
    );
  }
  if (explain) {
    lines.push(
      `<div class="ecu-meter-tt-foot">${escapeHtml(explain)}</div>`,
    );
  }
  return lines.join("");
}

/** True while the pointer is over an ability-timeline hover host. */
let abilityTimelineTipHover = false;

export function abilityTimelineTipHandlers(html: string): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  return {
    onMouseEnter: (ev: MouseEvent) => {
      abilityTimelineTipHover = true;
      showMeterTooltip(ev, html);
    },
    onMouseMove: (ev: MouseEvent) => showMeterTooltip(ev, html),
    onMouseLeave: () => {
      abilityTimelineTipHover = false;
      hideMeterTooltip();
    },
  };
}

/** Hide when the rail / BigIcon / highlight panel unmounts or loses casters. */
export function dismissAbilityTimelineTip(): void {
  if (!abilityTimelineTipHover) return;
  abilityTimelineTipHover = false;
  hideMeterTooltip();
}

/** Inline hit styles so stale inject-once CSS cannot swallow hover. */
export const ABILITY_TIP_HIT_STYLE: Record<string, string> = {
  pointerEvents: "auto",
  cursor: "help",
};

export function abilityTimelineHover(
  args: AbilityTimelineTipArgs,
  style?: Record<string, string>,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
  style: Record<string, string>;
} {
  return {
    ...abilityTimelineTipHandlers(abilityTimelineTipHtml(args)),
    style: Object.assign({}, ABILITY_TIP_HIT_STYLE, style),
  };
}

export function hideAbilityTimelineTip(): void {
  abilityTimelineTipHover = false;
  hideMeterTooltip();
}
