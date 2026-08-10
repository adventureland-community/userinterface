import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";

/**
 * Courage overflow (`entity.fear`) — not a G.condition.
 * Labels match stock client logs in js/game.js:
 *   fear > 3 → petrified, fear > 1 → terrified, else scared.
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
  // Colors from stock fear logs (#B03736 / #B04157 / gray).
  scared: {
    severity: 1,
    label: "Scared",
    color: "#c8c8c8",
    border: "#888",
    background: "rgba(40,40,40,0.92)",
  },
  terrified: {
    severity: 2,
    label: "Terrified",
    color: "#ffc0c8",
    border: "#B04157",
    background: "rgba(80,20,35,0.92)",
  },
  petrified: {
    severity: 3,
    label: "Petrified",
    color: "#ffb0a8",
    border: "#B03736",
    background: "rgba(90,20,20,0.92)",
  },
};

/** Map courage overflow to the stock client fear tier. */
export function fearLevelFromValue(fear: number): FearLevel | null {
  if (!(fear > 0)) return null;
  if (fear > 3) return "petrified";
  if (fear > 1) return "terrified";
  return "scared";
}

export function getFearState(
  entity: EntityLike | null | undefined,
): FearState | null {
  if (!entity) return null;
  const raw = (entity as EntityLike & { fear?: number }).fear;
  const fear = typeof raw === "number" ? raw : 0;
  const level = fearLevelFromValue(fear);
  if (!level) return null;
  const style = FEAR_STYLE[level];
  return {
    kind: "fear",
    level,
    fear,
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
): ControlState[] {
  const out: ControlState[] = [];
  const hard = getHardCcState(entity);
  const fear = getFearState(entity);
  if (hard) out.push(hard);
  if (fear) out.push(fear);
  return out;
}

/** Strongest border tint for the unit chrome (fear or hard-CC). */
export function controlBorderTint(
  states: ControlState[],
): string | undefined {
  if (!states.length) return undefined;
  let best = states[0];
  for (let i = 1; i < states.length; i++) {
    const s = states[i];
    const bestRank =
      best.kind === "fear" ? best.severity + 10 : best.severity;
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
