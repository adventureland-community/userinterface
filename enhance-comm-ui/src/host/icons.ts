import "./globals";
import type { EntityLike, SlotLike } from "./globals";
import { findEntityById } from "./al";

export type SetXTargetOpts = {
  /**
   * Set xtarget for stock dialogs (`condition_click` / `render_condition`)
   * without syncing CommUI paperdoll selection via `useSelectionFromXTarget`.
   */
  dialogOnly?: boolean;
};

export function itemContainer(item: any, actual?: any): string {
  if (typeof window.item_container !== "function") {
    return "";
  }
  return window.item_container(item, actual);
}

export function addTint(selector: string, args?: any): void {
  if (typeof window.add_tint === "function") {
    window.add_tint(selector, args);
  }
}

export function getTint(
  selector: string,
): { added?: boolean; [key: string]: any } | null {
  if (typeof window.get_tint === "function") {
    return window.get_tint(selector) || null;
  }
  return null;
}

/** Force skill/progress tints to re-bind after DOM remount (stale tint.added leaves height:0). */
export function rebindTint(selector: string): void {
  const tint = getTint(selector);
  if (tint) tint.added = false;
}

export function setXTarget(
  entity: EntityLike | null | undefined,
  opts?: SetXTargetOpts,
): void {
  window.xtarget = entity || null;
  (window as any).__ecuDialogOnlyXTarget = !!(
    opts &&
    opts.dialogOnly &&
    entity
  );
}

/** Open the host condition dialog (same as game UI `condition_click`). */
export function conditionClick(name: string): void {
  if (typeof window.condition_click === "function") {
    window.condition_click(name);
  }
}

/** Open the host gear-slot dialog (same as game UI `slot_click`). */
export function slotClick(name: string): void {
  if (typeof window.slot_click === "function") {
    window.slot_click(name);
  }
}

export function slotSkin(
  slot: SlotLike | null | undefined,
): string | undefined {
  if (!slot || !slot.name) return undefined;
  const def = window.G?.items?.[slot.name];
  return slot.skin || def?.skin;
}

/**
 * Monster portrait HTML via stock `sprite()` (entity/IID packs).
 * Do not use `item_container` — monster skins are not in `G.positions`.
 */
export function monsterSprite(
  mtype: string | undefined,
  opts?: { size?: number },
): string {
  if (!mtype || typeof window.sprite !== "function") return "";
  const size = opts?.size ?? 22;
  // `sprite` resolves `G.monsters[mtype].skin` (defaults to mtype at G build).
  return (
    window.sprite(mtype, {
      scale: size / 40,
      width: size,
      height: size,
      overflow: true,
    }) || ""
  );
}

/**
 * Class portrait via stock `sprite()` + `G.classes[ctype].looks[0]`.
 * Same source as character-select (`load_class_info` in html.js).
 */
export function classSprite(
  ctype: string | undefined,
  opts?: { size?: number },
): string {
  if (!ctype || typeof window.sprite !== "function") return "";
  const key = ctype.toLowerCase();
  const look = window.G?.classes?.[key]?.looks?.[0];
  if (!look || !look[0]) return "";
  const size = opts?.size ?? 18;
  return (
    window.sprite(look[0], {
      cx: look[1] || {},
      scale: size / 40,
      width: size,
      height: size,
      overflow: true,
    }) || ""
  );
}

export type CharacterLookSource = "entity" | "roster" | "class" | "none";

export type CharacterLook = {
  skin: string;
  cx?: Record<string, string> | any;
  rip?: boolean;
  ctype?: string;
  name?: string;
  source: CharacterLookSource;
};

function lookFromSkinCx(
  skin: string | undefined,
  cx: any,
  extra: {
    rip?: boolean;
    ctype?: string;
    name?: string;
    source: CharacterLookSource;
  },
): CharacterLook | null {
  if (!skin) return null;
  return {
    skin,
    cx: cx || {},
    rip: !!extra.rip,
    ctype: extra.ctype,
    name: extra.name,
    source: extra.source,
  };
}

/**
 * Resolve a player's real `sprite(skin, { cx })` look when possible.
 * Order: live entity → observing/character self → X.characters roster →
 * `G.classes[ctype].looks[0]` default. Does not invent skins.
 */
export function resolveCharacterLook(
  id: string | undefined,
  opts?: { ctype?: string; name?: string },
): CharacterLook | null {
  const tid = id != null ? String(id) : "";
  const hintName = opts?.name;
  const hintCtype = opts?.ctype ? String(opts.ctype).toLowerCase() : undefined;

  const fromEnt = (
    ent: EntityLike | null | undefined,
    source: CharacterLookSource,
  ) =>
    lookFromSkinCx(ent?.skin, ent?.cx, {
      rip: ent?.rip,
      ctype: ent?.ctype || hintCtype,
      name: ent?.name || hintName,
      source,
    });

  if (tid) {
    const fromLive = fromEnt(findEntityById(tid), "entity");
    if (fromLive) return fromLive;

    const observing = window.observing;
    if (
      observing &&
      (String(observing.id) === tid ||
        (observing.name != null && String(observing.name) === tid) ||
        (hintName && observing.name === hintName))
    ) {
      const fromObs = fromEnt(observing, "entity");
      if (fromObs) return fromObs;
    }

    const character = window.character;
    if (
      character &&
      (String(character.id) === tid ||
        (character.name != null && String(character.name) === tid) ||
        (hintName && character.name === hintName))
    ) {
      const fromChar = fromEnt(character, "entity");
      if (fromChar) return fromChar;
    }
  }

  const chars = window.X?.characters || [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!c) continue;
    const matchId = tid && c.id != null && String(c.id) === tid;
    const matchName =
      (hintName && c.name === hintName) ||
      (tid && c.name != null && String(c.name) === tid);
    if (!matchId && !matchName) continue;
    const fromRoster = lookFromSkinCx(c.skin, c.cx, {
      rip: c.rip,
      ctype: c.type || hintCtype,
      name: c.name || hintName,
      source: "roster",
    });
    if (fromRoster) return fromRoster;
  }

  const ctypeKey = hintCtype || undefined;
  if (ctypeKey) {
    const look = window.G?.classes?.[ctypeKey]?.looks?.[0];
    if (look && look[0]) {
      return {
        skin: look[0],
        cx: look[1] || {},
        ctype: ctypeKey,
        name: hintName,
        source: "class",
      };
    }
  }

  return null;
}

/**
 * Player portrait via stock `sprite()` using real skin/cx when resolved,
 * else class default look. Empty string when neither is available.
 */
export function characterSprite(
  id: string | undefined,
  opts?: { size?: number; ctype?: string; name?: string },
): string {
  if (typeof window.sprite !== "function") return "";
  const resolved = resolveCharacterLook(id, {
    ctype: opts?.ctype,
    name: opts?.name,
  });
  if (!resolved || !resolved.skin) return "";
  const size = opts?.size ?? 40;
  return (
    window.sprite(resolved.skin, {
      cx: resolved.cx || {},
      rip: resolved.rip,
      scale: size / 40,
      width: size,
      height: size,
      overflow: true,
    }) || ""
  );
}
