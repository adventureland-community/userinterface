/**
 * Hit `source` is not always a G.skills / G.conditions key.
 *
 * Server burned DoT ticks (`node/server.js`) emit `{ source: "burn" }`.
 * There is no G.skills.burn — the condition id is `burned` (skin fireblade).
 * Fire-weapon procs apply that condition; the weapon strike itself stays
 * `source: attack` (or the skill atype). Do not invent a second fire hit.
 *
 * Attack cooldown is not in the G.skills table. The server sets
 * `G.skills.attack.cooldown = player.attack_ms` on every skill use, with
 * `attack_ms = round(1000 / frequency)`. Skills with `share: "attack"`
 * (heal, 3shot, 5shot, piercingshot) use that same ms × cooldown_multiplier.
 * Never read `G.skills.attack.cooldown` from client G — the playing client
 * mutates it to whoever last used a skill.
 */

import { getG } from "../host/al";

const HIT_SOURCE_TO_G: Record<string, string> = {
  burn: "burned",
};

/** Map a hub/packet ability source to the G.skills or G.conditions id. */
export function canonicalAbilityId(source: string): string {
  if (!source) return source;
  const mapped = HIT_SOURCE_TO_G[source.toLowerCase()];
  return mapped || source;
}

/** Server `player.attack_ms = round(1000.0 / player.frequency)`. */
export function attackMsFromFrequency(
  frequency: number | null | undefined,
): number | undefined {
  if (typeof frequency !== "number" || !(frequency > 0)) return undefined;
  return Math.round(1000.0 / frequency);
}

/**
 * Cooldown in seconds, matching `consume_skill` + the attack_ms override.
 * Pass `attackMs` for attack / `share: "attack"`. Unlisted skills → 0.
 */
export function skillCooldownSec(
  source: string,
  attackMs?: number | null,
): number {
  const G = getG();
  if (!G?.skills || !source) return 0;
  let id = canonicalAbilityId(source);
  let def = G.skills[id];
  if (!def) return 0;
  let multiplier = 1;
  if (def.share) {
    multiplier =
      typeof def.cooldown_multiplier === "number"
        ? def.cooldown_multiplier
        : 1;
    id = String(def.share);
    def = G.skills[id];
    if (!def) return 0;
  }
  if (id === "attack") {
    if (typeof attackMs !== "number" || !(attackMs > 0)) return 0;
    return (attackMs * multiplier) / 1000;
  }
  const ms = def.cooldown || def.reuse_cooldown;
  if (typeof ms !== "number" || !(ms > 0)) return 0;
  return (ms * multiplier) / 1000;
}
