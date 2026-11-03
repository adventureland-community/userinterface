/**
 * Boss HP-track phase mark cooltip — spawn waves + ability thresholds.
 * Full Comm cooltip (icon, phase %, explanation) — never native title=.
 */
import { getG } from "../../host/al";
import {
  monsterIconHtml,
  skillIconHtml,
} from "../../lib/gameIcon";
import type { HpThresholdMark } from "../../instance/monsterSpawns";
import {
  COOLTIP_ICON,
  COOLTIP_MONSTER_ICON,
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
} from "./cooltip";

export function hpThresholdCooltipKey(markKey: string): string {
  return `hp-phase:${markKey}`;
}

function liveSkillExplanation(abilityId: string): string {
  const skill = getG()?.skills?.[abilityId];
  if (skill && typeof skill.explanation === "string" && skill.explanation) {
    return skill.explanation;
  }
  const cond = getG()?.conditions?.[abilityId];
  if (cond && typeof cond.explanation === "string" && cond.explanation) {
    return cond.explanation;
  }
  return "";
}

function liveMonsterExplanation(mtype: string): string {
  const def = getG()?.monsters?.[mtype];
  if (def && typeof def.explanation === "string" && def.explanation) {
    return def.explanation;
  }
  return "";
}

export function hpThresholdCooltipHtml(mark: HpThresholdMark): string {
  const pct = Math.round(mark.ratio * 100);
  const lines: string[] = [];

  if (mark.abilityId) {
    const icon = skillIconHtml(mark.abilityId, COOLTIP_ICON);
    lines.push(
      `<h4>${icon} ${escapeCooltipHtml(mark.title)}</h4>`,
    );
    lines.push(
      `<div class="line"><span>Phase</span><b>${pct}% HP</b></div>`,
    );
    if (mark.fired) {
      lines.push(
        `<div class="line"><span>Status</span><b>Passed</b></div>`,
      );
    }
    const detail =
      mark.detail || liveSkillExplanation(mark.abilityId);
    if (detail) {
      lines.push(
        `<div class="ecu-cooltip-foot">${escapeCooltipHtml(detail)}</div>`,
      );
    }
    return lines.join("");
  }

  const child = mark.mtype || "";
  const icon = child
    ? monsterIconHtml(child, COOLTIP_MONSTER_ICON, mark.childName || child)
    : "";
  lines.push(
    `<h4>${icon}${icon ? " " : ""}${escapeCooltipHtml(mark.title)}</h4>`,
  );
  lines.push(
    `<div class="line"><span>Phase</span><b>${pct}% HP</b></div>`,
  );
  if (mark.count != null && mark.count > 0 && child) {
    lines.push(
      `<div class="line"><span>Spawns</span><b>${mark.count}× ${escapeCooltipHtml(mark.childName || child)}</b></div>`,
    );
  }
  if (mark.fired) {
    lines.push(
      `<div class="line"><span>Status</span><b>Passed</b></div>`,
    );
  }
  const detail =
    mark.detail ||
    (child ? liveMonsterExplanation(child) : "") ||
    "";
  if (detail) {
    lines.push(
      `<div class="ecu-cooltip-foot">${escapeCooltipHtml(detail)}</div>`,
    );
  }
  return lines.join("");
}

export function hpThresholdCooltipHandlers(
  mark: HpThresholdMark,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  const key = hpThresholdCooltipKey(mark.key);
  return cooltipHandlers(key, () => hpThresholdCooltipHtml(mark));
}

export function dismissHpThresholdCooltip(markKey?: string): void {
  dismissCooltip(
    markKey != null ? hpThresholdCooltipKey(markKey) : undefined,
  );
}
