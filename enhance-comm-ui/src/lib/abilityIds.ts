/**
 * Hit `source` is not always a G.skills / G.conditions key.
 *
 * Server burned DoT ticks (`node/server.js`) emit `{ source: "burn" }`.
 * There is no G.skills.burn — the condition id is `burned` (skin fireblade).
 * Fire-weapon procs apply that condition; the weapon strike itself stays
 * `source: attack` (or the skill atype). Do not invent a second fire hit.
 */
const HIT_SOURCE_TO_G: Record<string, string> = {
  burn: "burned",
};

/** Map a hub/packet ability source to the G.skills or G.conditions id. */
export function canonicalAbilityId(source: string): string {
  if (!source) return source;
  const mapped = HIT_SOURCE_TO_G[source.toLowerCase()];
  return mapped || source;
}
