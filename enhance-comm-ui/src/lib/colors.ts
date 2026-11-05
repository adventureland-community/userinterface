/** Shared class palette — HP bars, meters, nameplates, tips. */
export const classColors: Record<string, string> = {
  merchant: "#7f7f7f",
  mage: "#3e6eed",
  warrior: "#f07f2f",
  priest: "#eb4d82",
  ranger: "#8a512b",
  paladin: "#a3b4b9",
  rogue: "#44b75c",
};

/** True when `ctype` is a known player class key in {@link classColors}. */
export function isPlayerClass(ctype?: string | null): boolean {
  const key = String(ctype || "")
    .trim()
    .toLowerCase();
  return !!(key && Object.prototype.hasOwnProperty.call(classColors, key));
}

/**
 * Resolve a class tint from {@link classColors}.
 * Unknown / NPC / missing → `fallback` (nameplates use white).
 */
export function resolveClassColor(
  ctype?: string | null,
  fallback = "#ffffff",
): string {
  const key = String(ctype || "")
    .trim()
    .toLowerCase();
  if (!key) return fallback;
  return classColors[key] || fallback;
}
