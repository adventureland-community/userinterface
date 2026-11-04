/**
 * Free-form `ItemInfo.data` — CX Jar sealed cosmetics (and any future payload).
 * Mirrors al-data-explorer `itemInstanceData` + server `can_stack`.
 */

import { getG } from "../host/al";

/** Read trimmed string `data` from an inventory / bank / trade instance. */
export function getItemData(
  item: { data?: unknown } | null | undefined,
): string | undefined {
  if (!item || !("data" in item)) return undefined;
  const raw = item.data;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

export function isCxJarName(name: string | undefined | null): boolean {
  return name === "cxjar";
}

/** Cosmetic id sealed in a CX Jar (`ItemInfo.data`). */
export function cxJarData(
  item: { name?: string; data?: unknown } | null | undefined,
): string | undefined {
  if (!item || !isCxJarName(item.name)) return undefined;
  return getItemData(item);
}

/**
 * Bank / market / bag stack identity: name + level + title, plus `data` when set.
 * Omitting the data segment when empty keeps prior keys (favorites) stable.
 * Mirrors `can_stack`: jars with different cosmetics must not merge.
 */
export function itemStackIdentityKey(item: {
  name: string;
  level?: number | string | null;
  p?: string | null;
  data?: unknown;
}): string {
  const base =
    String(item.name) +
    "\0" +
    (item.level != null && item.level !== "" ? String(item.level) : "") +
    "\0" +
    (item.p != null && String(item.p) !== "" ? String(item.p) : "");
  const data = getItemData(item);
  return data ? base + "\0" + data : base;
}

/**
 * Skin key for a sealed CX Jar look — same resolution as stock `cx_sprite`
 * (emote skill skin, else G.positions[data]).
 */
export function cxJarContentSkin(data: string): string | undefined {
  if (!data) return undefined;
  const G = getG() as
    | {
        skills?: Record<string, { emote?: boolean; skin?: string }>;
        positions?: Record<string, unknown>;
      }
    | undefined;
  if (!G) return undefined;
  const skill = G.skills && G.skills[data];
  if (skill && skill.emote && typeof skill.skin === "string" && skill.skin) {
    return skill.skin;
  }
  if (G.positions && G.positions[data] != null) return data;
  return undefined;
}
