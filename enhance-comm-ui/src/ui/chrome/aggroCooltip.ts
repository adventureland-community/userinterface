/**
 * Aggro spark cooltip — count + mob list (icon / name / damage type).
 */
import { getG } from "../../host/al";
import type { EntityLike } from "../../host/globals";
import { estimateCouragePoolsCached } from "../../lib/courage";
import { aggroByDamageFromMobs } from "../../lib/fear";
import { monsterIconHtml } from "../../lib/gameIcon";
import {
  COOLTIP_MONSTER_ICON,
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
} from "./cooltip";
import { couragePoolLine } from "./couragePoolLine";

export function aggroCooltipKey(ownerId: string): string {
  return `aggro:${ownerId}`;
}

function mobMtype(mob: EntityLike): string {
  return mob.mtype ? String(mob.mtype) : "";
}

function mobLabel(mob: EntityLike): string {
  const G = getG();
  const mtype = mobMtype(mob);
  const defName =
    mtype && G?.monsters?.[mtype] && typeof G.monsters[mtype].name === "string"
      ? G.monsters[mtype].name
      : "";
  const name = String(mob.name || defName || mtype || mob.id || "?");
  const id = mob.id != null ? String(mob.id) : "";
  if (id && id !== name) return `${name} #${id}`;
  return name;
}

function mobDamageType(mob: EntityLike): string {
  const live = mob.damage_type;
  if (live === "magical" || live === "pure" || live === "physical") return live;
  const G = getG();
  const key = mobMtype(mob);
  const def = G && G.monsters && key ? G.monsters[key] : undefined;
  const dt = def && def.damage_type;
  if (dt === "magical" || dt === "pure" || dt === "physical") return dt;
  return "physical";
}

function mobRowHtml(mob: EntityLike): string {
  const label = mobLabel(mob);
  const dt = mobDamageType(mob);
  const mtype = mobMtype(mob);
  const icon = mtype
    ? monsterIconHtml(mtype, COOLTIP_MONSTER_ICON, label)
    : "";
  return `<div class="line ecu-cooltip-mob"><span class="ecu-cooltip-mob-label">${icon}${icon ? " " : ""}${escapeCooltipHtml(label)}</span><b>${escapeCooltipHtml(dt)}</b></div>`;
}

export function aggroCooltipHtml(opts: {
  ownerName?: string;
  /** Framed player — courage pools for aggro/capacity X/Y. */
  owner?: EntityLike | null;
  mobs: EntityLike[];
}): string {
  const mobs = opts.mobs || [];
  const n = mobs.length;
  const lines: string[] = [
    `<h4>Aggro · ${n} mob${n === 1 ? "" : "s"}</h4>`,
  ];
  if (opts.ownerName) {
    lines.push(
      `<div class="line"><span>On</span><b>${escapeCooltipHtml(opts.ownerName)}</b></div>`,
    );
  }
  const by = aggroByDamageFromMobs(mobs);
  const pools = opts.owner ? estimateCouragePoolsCached(opts.owner) : null;
  if (n > 0) {
    if (pools) {
      lines.push(
        couragePoolLine("Physical", by.physical, pools.courage),
        couragePoolLine("Magical", by.magical, pools.mcourage),
        couragePoolLine("Pure", by.pure, pools.pcourage),
      );
    } else {
      lines.push(
        `<div class="line"><span>Physical</span><b>${by.physical}</b></div>`,
        `<div class="line"><span>Magical</span><b>${by.magical}</b></div>`,
        `<div class="line"><span>Pure</span><b>${by.pure}</b></div>`,
      );
    }
  }
  const maxList = 8;
  for (let i = 0; i < Math.min(n, maxList); i++) {
    lines.push(mobRowHtml(mobs[i]));
  }
  if (n > maxList) {
    lines.push(
      `<div class="ecu-cooltip-foot">+${n - maxList} more</div>`,
    );
  }
  return lines.join("");
}

export function aggroCooltipHandlers(
  key: string,
  rebuild: () => string,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  const base = cooltipHandlers(key, rebuild);
  return {
    onMouseEnter: (ev: MouseEvent) => {
      if (typeof ev.stopPropagation === "function") ev.stopPropagation();
      base.onMouseEnter(ev);
    },
    onMouseMove: (ev: MouseEvent) => {
      if (typeof ev.stopPropagation === "function") ev.stopPropagation();
      base.onMouseMove(ev);
    },
    onMouseLeave: () => {
      base.onMouseLeave();
    },
  };
}

export function dismissAggroCooltip(key?: string): void {
  dismissCooltip(key);
}
