/**
 * Fear / hard-CC badge cooltip — tier, overflow, courage pools, explanation.
 */
import { getG } from "../../host/al";
import type { EntityLike } from "../../host/globals";
import type { ControlState, FearState } from "../../lib/controlState";
import { estimateCouragePoolsCached } from "../../lib/courage";
import { aggroByDamageFromMobs } from "../../lib/fear";
import {
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
} from "./cooltip";
import { couragePoolLine } from "./couragePoolLine";

/** Server combat fear tiers (node/server.js) — attack multipliers. */
const FEAR_EXPLAIN: Record<string, string> = {
  scared: "Attack damage ×0.6 while courage is overrun by 1.",
  terrified: "Attack damage ×0.4 while courage is overrun by 2.",
  petrified: "Attack damage ×0.2 while courage is overrun by 3+.",
};

export function controlCooltipKey(
  ownerId: string,
  state: ControlState,
): string {
  if (state.kind === "fear") return `ctrl:${ownerId}:fear-${state.level}`;
  return `ctrl:${ownerId}:cc-${state.id}`;
}

function fearCooltipHtml(
  state: FearState,
  entity: EntityLike | null | undefined,
  aggroMobs: EntityLike[],
): string {
  const lines: string[] = [
    `<h4>${escapeCooltipHtml(state.label)} (Fear)</h4>`,
  ];
  const explain = FEAR_EXPLAIN[state.level];
  if (explain) {
    lines.push(`<div class="ecu-cooltip-foot">${escapeCooltipHtml(explain)}</div>`);
  }
  lines.push(
    `<div class="line"><span>Overflow</span><b>${state.fear}</b></div>`,
    `<div class="line"><span>Tier</span><b>${escapeCooltipHtml(state.level)}</b></div>`,
  );
  const pools = entity ? estimateCouragePoolsCached(entity) : null;
  const by = aggroByDamageFromMobs(aggroMobs);
  if (pools) {
    // aggro / capacity per damage pool (server fear uses the worst overrun).
    lines.push(
      couragePoolLine("Physical", by.physical, pools.courage),
      couragePoolLine("Magical", by.magical, pools.mcourage),
      couragePoolLine("Pure", by.pure, pools.pcourage),
    );
  } else if (aggroMobs.length) {
    lines.push(
      `<div class="line"><span>Aggro P/M/U</span><b>${by.physical}/${by.magical}/${by.pure}</b></div>`,
    );
  }
  return lines.join("");
}

function hardCcCooltipHtml(
  state: Extract<ControlState, { kind: "hardcc" }>,
  entity?: EntityLike | null,
): string {
  const G = getG();
  const def = G?.conditions?.[state.id];
  const lines: string[] = [
    `<h4>${escapeCooltipHtml(state.label)} (CC)</h4>`,
  ];
  const explanation =
    def && typeof (def as { explanation?: string }).explanation === "string"
      ? (def as { explanation: string }).explanation
      : undefined;
  if (explanation) {
    lines.push(
      `<div class="ecu-cooltip-foot">${escapeCooltipHtml(explanation)}</div>`,
    );
  }
  const live = entity && entity.s && entity.s[state.id];
  const ms = live && typeof live.ms === "number" ? live.ms : 0;
  if (ms > 0) {
    const sec = Math.max(1, Math.ceil(ms / 1000));
    lines.push(
      `<div class="line"><span>Remaining</span><b>${sec}s</b></div>`,
    );
  }
  return lines.join("");
}

export function controlCooltipHtml(opts: {
  state: ControlState;
  entity?: EntityLike | null;
  aggroMobs?: EntityLike[];
}): string {
  if (opts.state.kind === "fear") {
    return fearCooltipHtml(
      opts.state,
      opts.entity,
      opts.aggroMobs || [],
    );
  }
  return hardCcCooltipHtml(opts.state, opts.entity);
}

export function controlCooltipHandlers(
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

export function dismissControlCooltip(key?: string): void {
  dismissCooltip(key);
}
