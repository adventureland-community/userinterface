/**
 * Sheet skins for monster abilities that have no G.skills.skin.
 * Values must exist on the skills imageset (G.positions).
 * Unlisted ids fall through to the caster sprite.
 */

const ABILITY_ICON_FALLBACK_SKINS: Record<string, string> = {
  anger: "skill_agitate",
  warpstomp: "skill_stomp",
  healing: "skill_pheal",
  self_healing: "skill_selfheal",
  deepfreeze: "essenceoffrost",
  multi_burn: "essenceoffire",
  zap: "skill_burst",
  mtangle: "skill_entangle",
  fireball: "essenceoffire",
  frostball: "essenceoffrost",
  degen: "skill_curse",
};

export function abilityIconFallbackSkin(abilityId: string): string | undefined {
  if (!abilityId) return undefined;
  return ABILITY_ICON_FALLBACK_SKINS[abilityId];
}
