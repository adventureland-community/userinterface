/**
 * Unit / party-chip vitals cooltip — name, class, HP/MP, observe/control/aggro.
 * Bind only to the HP/MP strip so buff icons stay free of native `title` noise.
 */
import type { EntityLike } from "../../host/globals";
import type { ControlState } from "../../lib/controlState";
import {
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
} from "./cooltip";

export type UnitCooltipArgs = {
  entity: EntityLike;
  observed?: boolean;
  dead?: boolean;
  controlStates?: ControlState[];
  aggroCount?: number;
};

export function unitCooltipKey(entityId: string): string {
  return `unit:${entityId}`;
}

export function unitCooltipHtml(args: UnitCooltipArgs): string {
  const ent = args.entity;
  const name = String(ent.name || ent.id || "?");
  const lines: string[] = [
    `<h4>${escapeCooltipHtml(name)}</h4>`,
  ];
  if (ent.level != null) {
    lines.push(
      `<div class="line"><span>Level</span><b>${escapeCooltipHtml(String(ent.level))}</b></div>`,
    );
  }
  if (ent.ctype) {
    lines.push(
      `<div class="line"><span>Class</span><b>${escapeCooltipHtml(String(ent.ctype))}</b></div>`,
    );
  }
  const maxHp = ent.max_hp || 0;
  const hp = ent.hp || 0;
  if (maxHp > 0) {
    lines.push(
      `<div class="line"><span>HP</span><b>${hp} / ${maxHp}</b></div>`,
    );
  }
  const maxMp = ent.max_mp || 0;
  const mp = ent.mp || 0;
  if (maxMp > 0) {
    lines.push(
      `<div class="line"><span>MP</span><b>${mp} / ${maxMp}</b></div>`,
    );
  }
  if (args.observed) {
    lines.push(`<div class="line"><span>Status</span><b>Observing</b></div>`);
  }
  if (args.dead) {
    lines.push(`<div class="line"><span>Status</span><b>Dead</b></div>`);
  }
  const states = args.controlStates || [];
  if (states.length) {
    const labels: string[] = [];
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      labels.push(
        s.kind === "fear" ? `${s.label} (fear ${s.fear})` : s.label,
      );
    }
    lines.push(
      `<div class="line"><span>Control</span><b>${escapeCooltipHtml(labels.join(" · "))}</b></div>`,
    );
  }
  const aggro = args.aggroCount || 0;
  if (aggro > 0) {
    lines.push(
      `<div class="line"><span>Aggro</span><b>${aggro} mob${aggro === 1 ? "" : "s"}</b></div>`,
    );
  }
  return lines.join("");
}

export function unitCooltipHandlers(
  key: string,
  rebuild: () => string,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  return cooltipHandlers(key, rebuild);
}

export function dismissUnitCooltip(key?: string): void {
  dismissCooltip(key);
}
