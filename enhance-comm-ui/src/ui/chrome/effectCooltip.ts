/**
 * Buff/debuff hover cooltip — shared Comm cooltip shell with live Remaining.
 */
import type { EntityLike } from "../../host/globals";
import {
  gameIconHtml,
  monsterIconHtml,
  skillIconHtml,
} from "../../lib/gameIcon";
import { formatTime } from "../../lib/format";
import {
  COOLTIP_ICON,
  COOLTIP_MONSTER_ICON,
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
  refreshCooltip,
} from "./cooltip";
import { buildEffectTipModel } from "./effectTooltip";
import type { BuiltEffect } from "./effectsModel";

export type EffectCooltipArgs = {
  effect: BuiltEffect;
  entity: EntityLike;
  remainingMs?: number;
};

export function effectCooltipKey(entityId: string, effectId: string): string {
  return `fx:${entityId}::${effectId}`;
}

export function effectCooltipHtml(args: EffectCooltipArgs): string {
  const m = buildEffectTipModel(args.effect, args.entity, args.remainingMs);
  const icon =
    args.effect.type === "skill"
      ? skillIconHtml(m.id, COOLTIP_ICON)
      : // Citizen auras have no G.conditions entry — use live/BuiltEffect skin.
        gameIconHtml(m.id, {
          kind: "condition",
          size: COOLTIP_ICON,
          skin: args.effect.skin,
          title: m.name,
        });
  const huntIcon = m.target
    ? monsterIconHtml(m.target.mtype, COOLTIP_MONSTER_ICON, m.target.name)
    : "";
  const lines: string[] = [
    `<h4>${icon}${huntIcon ? ` ${huntIcon}` : ""} ${escapeCooltipHtml(m.name)} <span style="color:#9aa8bc;font-size:0.9em">(${escapeCooltipHtml(m.kind)})</span></h4>`,
  ];
  // From → Strong/lock first (mluck: same-owner strong cannot be stolen).
  if (m.from) {
    lines.push(
      `<div class="line"><span>From</span><b>${escapeCooltipHtml(m.from)}</b></div>`,
    );
  }
  if (m.strong) {
    const strongVal = m.locked
      ? `<span class="ecu-cooltip-lock" title="Other merchants cannot override this luck">\u{1F512} Yes · locked</span>`
      : `Yes`;
    lines.push(
      `<div class="line"><span>Strong</span><b>${strongVal}</b></div>`,
    );
  }
  if (m.explanation) {
    lines.push(
      `<div class="ecu-cooltip-foot">${escapeCooltipHtml(m.explanation)}</div>`,
    );
  }
  for (let i = 0; i < m.stats.length; i++) {
    const s = m.stats[i];
    lines.push(
      `<div class="line"><span>${escapeCooltipHtml(s.label)}</span><b>${escapeCooltipHtml(s.value)}</b></div>`,
    );
  }
  if (m.target) {
    const tipIcon = monsterIconHtml(
      m.target.mtype,
      COOLTIP_MONSTER_ICON,
      m.target.name,
    );
    lines.push(
      `<div class="line ecu-cooltip-target"><span>Target</span><b>${tipIcon} ${escapeCooltipHtml(m.target.name)}</b></div>`,
    );
  }
  if (m.stacks != null && m.stacks > 0) {
    lines.push(
      `<div class="line"><span>Stacks</span><b>${m.stacks}</b></div>`,
    );
  }
  if (m.intensity != null && m.intensity > 0) {
    lines.push(
      `<div class="line"><span>Intensity</span><b>${Math.round(m.intensity)}</b></div>`,
    );
  }
  if (m.charges != null && m.charges > 0) {
    lines.push(
      `<div class="line"><span>Kills left</span><b>${m.charges}</b></div>`,
    );
  }
  if (m.remainingMs != null && m.remainingMs > 0) {
    lines.push(
      `<div class="line"><span>Remaining</span><b>${escapeCooltipHtml(formatTime(m.remainingMs / 1000))}</b></div>`,
    );
  }
  return lines.join("");
}

export function effectCooltipHandlers(
  key: string,
  rebuild: () => string,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  return cooltipHandlers(key, rebuild);
}

export function refreshEffectCooltip(key: string): void {
  refreshCooltip(key);
}

export function dismissEffectCooltip(key?: string): void {
  dismissCooltip(key);
}
