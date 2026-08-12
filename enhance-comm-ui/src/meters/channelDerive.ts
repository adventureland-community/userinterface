/**
 * Derived AL damage composition from hit flags — not ability keys.
 * Maps to WoW-meter concepts: Direct / Splash / DoT / AoE.
 */

import type { DamageEvent } from "../sockets/hub";
import type { CombatChannel } from "./combatChannels";

export type DerivedChannel =
  | "base"
  | "blast"
  | "burn"
  | "cleave"
  | "heal"
  | "mana"
  | "dr"
  | "reflect"
  | null;

/**
 * Classify a damage/heal hit into a composition bucket.
 * Priority matches Details-style split: DoT ticks, then splash secondaries,
 * then AoE multi-target, else direct.
 */
export function deriveChannel(ev: DamageEvent): DerivedChannel {
  if (ev.dreturn && ev.dreturn > 0) return "dr";
  if (ev.reflect && ev.reflect > 0) return "reflect";
  if (ev.manasteal && ev.manasteal > 0) return "mana";
  if ((ev.heal && ev.heal > 0) || (ev.lifesteal && ev.lifesteal > 0)) {
    return "heal";
  }
  if (!(ev.damage && ev.damage > 0)) return null;
  // DoT (burn condition ticks) — like WoW Ignite
  if (ev.source === "burn") return "burn";
  // Splash secondaries of explosion/blast — not the primary target
  if (ev.splash) return "blast";
  // AoE multi-target (cleave / shadowstrike / aoe flag)
  if (ev.source === "cleave" || ev.aoe) return "cleave";
  return "base";
}

export function channelToCombatChannel(
  ch: DerivedChannel,
): CombatChannel | null {
  switch (ch) {
    case "base":
      return "base";
    case "blast":
      return "blast";
    case "burn":
      return "burn";
    case "cleave":
      return "cleave";
    case "heal":
      return "hps";
    case "mana":
      return "mps";
    case "dr":
      return "dr";
    case "reflect":
      return "reflect";
    case null:
      return null;
    default: {
      const _exhaustive: never = ch;
      return _exhaustive;
    }
  }
}
