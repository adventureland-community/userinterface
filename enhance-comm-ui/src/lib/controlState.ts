import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";
import { isFocusablePlayer } from "../queries/entities";
import { estimatePlayerFear } from "./fear";

/**
 * Courage overflow — not a G.condition.
 * Packet `fear` is connect-time only (not on entities); simulate for self,
 * party, and soft sync from gear/courage + typed aggro.
 * Labels align with server combat fear tiers in node/server.js
 * (attack ×0.6 / ×0.4 / ×0.2), not the stock client log off-by-one:
 *   fear > 2 → petrified, fear > 1 → terrified, else scared.
 */
export type FearLevel = "scared" | "terrified" | "petrified";

export type FearState = {
  kind: "fear";
  level: FearLevel;
  /** Raw courage overflow (1+). */
  fear: number;
  label: string;
  /** Severity rank for styling (1 scared … 3 petrified). */
  severity: 1 | 2 | 3;
  color: string;
  border: string;
  background: string;
  /** item_container skin — scare skill art. */
  skin: string;
};

/** Hard-CC conditions from `is_disabled` (entity.s.*). */
export type HardCcState = {
  kind: "hardcc";
  id: string;
  label: string;
  severity: number;
  color: string;
  border: string;
  background: string;
  skin: string;
};

export type ControlState = FearState | HardCcState;

/** Soft / hard control ids we amplify on frames (in severity order). */
const HARD_CC: Array<{
  id: string;
  severity: number;
  fallbackSkin: string;
  fallbackLabel: string;
  color: string;
  border: string;
  background: string;
}> = [
  {
    id: "stoned",
    severity: 5,
    fallbackSkin: "condition_neutral",
    fallbackLabel: "Stoned",
    color: "#d8d0c0",
    border: "#a09070",
    background: "rgba(60,50,30,0.9)",
  },
  {
    id: "deepfreezed",
    severity: 5,
    fallbackSkin: "condition_bad",
    fallbackLabel: "Deepfreezed",
    color: "#b8e0ff",
    border: "#5a9ec8",
    background: "rgba(20,40,70,0.9)",
  },
  {
    id: "stunned",
    severity: 4,
    fallbackSkin: "condition_bad",
    fallbackLabel: "Stunned",
    color: "#ffd0a0",
    border: "#c87830",
    background: "rgba(70,40,10,0.9)",
  },
  {
    id: "fingered",
    severity: 4,
    fallbackSkin: "condition_neutral",
    fallbackLabel: "Deep Meditation",
    color: "#e0d0ff",
    border: "#8860b0",
    background: "rgba(40,20,60,0.9)",
  },
  {
    id: "sleeping",
    severity: 3,
    fallbackSkin: "condition_bad",
    fallbackLabel: "Sleeping",
    color: "#d0d8e8",
    border: "#7080a0",
    background: "rgba(30,35,50,0.9)",
  },
];

const FEAR_SKIN = "skill_scare";

const FEAR_STYLE: Record<
  FearLevel,
  {
    severity: 1 | 2 | 3;
    label: string;
    color: string;
    border: string;
    background: string;
  }
> = {
  // Colors from stock fear logs (#B03736 / #B04157 / gray) — borders must
  // stay high-contrast; they are the main severity cue on the name pill.
  scared: {
    severity: 1,
    label: "Scared",
    color: "#e0e0e0",
    border: "#a0a0a0",
    background: "rgba(48,48,48,0.95)",
  },
  terrified: {
    severity: 2,
    label: "Terrified",
    color: "#ffd0d8",
    border: "#e05570",
    background: "rgba(90,22,40,0.95)",
  },
  petrified: {
    severity: 3,
    label: "Petrified",
    color: "#ffc8c0",
    border: "#ff4a3a",
    background: "rgba(100,18,18,0.95)",
  },
};

/** Map courage overflow to server combat fear tiers (not stock client logs). */
export function fearLevelFromValue(fear: number): FearLevel | null {
  if (!(fear > 0)) return null;
  if (fear > 2) return "petrified";
  if (fear > 1) return "terrified";
  return "scared";
}

/**
 * Map simulated fear → badge style.
 * Callers must pass monsters already targeting this player (`aggroOn(byTarget, id)`).
 */
export function getFearState(
  entity: EntityLike | null | undefined,
  aggroMobs: EntityLike[],
): FearState | null {
  if (!entity || !isFocusablePlayer(entity)) return null;
  const estimated = estimatePlayerFear(entity, aggroMobs);
  if (typeof estimated !== "number") return null;
  const level = fearLevelFromValue(estimated);
  if (!level) return null;
  const style = FEAR_STYLE[level];
  return {
    kind: "fear",
    level,
    fear: estimated,
    label: style.label,
    severity: style.severity,
    color: style.color,
    border: style.border,
    background: style.background,
    skin: FEAR_SKIN,
  };
}

/** Worst active hard-CC on entity.s (stoned / stunned / …). */
export function getHardCcState(
  entity: EntityLike | null | undefined,
): HardCcState | null {
  if (!entity || !entity.s) return null;
  const G = getG();
  let best: HardCcState | null = null;
  for (let i = 0; i < HARD_CC.length; i++) {
    const def = HARD_CC[i];
    const actual = entity.s[def.id];
    if (!actual) continue;
    const prop = G?.conditions?.[def.id];
    const skin =
      (typeof actual.skin === "string" && actual.skin) ||
      (typeof prop?.skin === "string" && prop.skin) ||
      def.fallbackSkin;
    const label =
      (typeof prop?.name === "string" && prop.name) || def.fallbackLabel;
    const next: HardCcState = {
      kind: "hardcc",
      id: def.id,
      label,
      severity: def.severity,
      color: def.color,
      border: def.border,
      background: def.background,
      skin,
    };
    if (!best || next.severity > best.severity) best = next;
  }
  return best;
}

/**
 * Frame-level control cues: hard-CC (if any) + fear (if any).
 * Fear is never a G.condition / EffectsRow entry — always badge-worthy.
 */
export function getControlStates(
  entity: EntityLike | null | undefined,
  aggroMobs: EntityLike[],
): ControlState[] {
  const out: ControlState[] = [];
  const hard = getHardCcState(entity);
  const fear = getFearState(entity, aggroMobs);
  if (hard) out.push(hard);
  if (fear) out.push(fear);
  return out;
}

/** Strongest border tint for the unit chrome (fear or hard-CC). */
export function controlBorderTint(states: ControlState[]): string | undefined {
  if (!states.length) return undefined;
  let best = states[0];
  for (let i = 1; i < states.length; i++) {
    const s = states[i];
    const bestRank = best.kind === "fear" ? best.severity + 10 : best.severity;
    const rank = s.kind === "fear" ? s.severity + 10 : s.severity;
    // Prefer higher hard-CC severity; fear ranks above soft labels via +10.
    if (rank > bestRank) best = s;
  }
  return best.border;
}

/** Hard-CC ids that EffectsRow should always surface (even without ui/skin). */
export const PROMOTED_HARD_CC_IDS = HARD_CC.map((d) => d.id);

export function hardCcFallbackSkin(id: string): string | undefined {
  for (let i = 0; i < HARD_CC.length; i++) {
    if (HARD_CC[i].id === id) return HARD_CC[i].fallbackSkin;
  }
  return undefined;
}
