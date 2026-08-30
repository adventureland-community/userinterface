/**
 * Shared AL icon resolution — skills / conditions / items via G.* skins;
 * monsters via G.monsters + stock `sprite()` (not G.positions);
 * characters via entity/roster skin+cx (else class looks[0]).
 * Prefer G.positions + G.imagesets (same crop math as stock item_container).
 * Items follow market-tracker / data-explorer ItemImage: G.items[name].skin ?? name,
 * then G.positions[skin] ?? G.positions[name] ?? G.positions.placeholder.
 */

import { classColors } from "./colors";
import { findEntityById, getG } from "../host/al";
import {
  wrapHtmlWithTitleBorder,
} from "./itemTitleBorder";
import {
  characterSprite,
  classSprite,
  itemContainer,
  monsterSprite,
  resolveCharacterLook,
} from "../host/icons";
import { abilityIconFallbackSkin } from "./abilityIconFallbacks";
import { canonicalAbilityId } from "./abilityIds";

export type GameIconKind =
  | "auto"
  | "skill"
  | "condition"
  | "item"
  | "class"
  | "character"
  | "actor"
  | "death"
  | "monster"
  | "target";

export type ResolvedGameIcon = {
  id: string;
  kind: Exclude<GameIconKind, "auto" | "actor">;
  /** Sprite skin name for G.positions / item_container. */
  skin?: string;
  /** Monster type key for `sprite()` / G.monsters. */
  mtype?: string;
  /** Display name from G when available. */
  name?: string;
  /** Class icon letter/color path. */
  ctype?: string;
  /** True when G.conditions[id].debuff (or promoted hard-CC). */
  debuff?: boolean;
  /** Character look source when kind is character. */
  lookSource?: "entity" | "roster" | "class" | "none";
};

/**
 * Letter fallback when `G.classes[ctype].looks` / `sprite()` is unavailable.
 * First letter when unique; two letters when first letters collide
 * (mage/merchant, priest/paladin, ranger/rogue). Not WoW abbreviations —
 * rogue used to be "G" (roGue) which read as the wrong class.
 */
const CLASS_LETTERS: Record<string, string> = {
  warrior: "W",
  mage: "M",
  priest: "P",
  rogue: "R",
  ranger: "Rg",
  paladin: "Pa",
  merchant: "Me",
};

/** Hard-CC / status keys treated as debuffs even if G omits the flag. */
const PROMOTED_DEBUFF_KEYS = new Set([
  "stunned",
  "deepfreezed",
  "fingered",
  "frozen",
  "scared",
]);

type Imageset = {
  file: string;
  size: number;
  columns: number;
  rows: number;
};

/** Additive crop options — skills omit placeholder; items use the tracker chain. */
export type SkinSheetOpts = {
  /** Extra G.positions keys after `skin` (typically the item name). */
  fallbackSkins?: string[];
  /**
   * Use G.positions.placeholder when no key hits.
   * Items: MUST be true (market tracker / data explorer / AL missing-skin tile).
   * Skills/conditions: leave false — placeholder is a dark empty square that
   * looks like a broken “burn” icon in ability rows; those fall back to a letter.
   */
  placeholder?: boolean;
  /**
   * When false, omit the native browser `title` attribute (timeline / cooltip
   * hosts use a custom flyout — native title double-fires and steals hover).
   * Default true for paperdoll / standalone chrome.
   */
  nativeTitle?: boolean;
};

function imagesetFileSrc(file: string): string {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  if (file.charAt(0) === "/") {
    const origin =
      typeof window !== "undefined"
        ? (window as { __ecuAssetOrigin?: unknown }).__ecuAssetOrigin
        : undefined;
    if (typeof origin === "string") return origin + file;
    return `https://adventure.land${file}`;
  }
  return file;
}

function positionsForSkin(
  G: any,
  skin: string,
): { pos: any; pack: Imageset } | null {
  const pos = G.positions[skin];
  if (!pos) return null;
  const setName = pos[0] || "pack_20";
  const pack = G.imagesets[setName] as Imageset | undefined;
  if (!pack || !pack.file) return null;
  return { pos, pack };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function letterFallbackHtml(
  letter: string,
  size: number,
  title: string,
  bg?: string,
  nativeTitle = true,
): string {
  const style = [
    `width:${size}px`,
    `height:${size}px`,
    `line-height:${size}px`,
    bg ? `background:${bg}` : "",
  ]
    .filter(Boolean)
    .join(";");
  const tipAttr = nativeTitle ? ` title="${escapeAttr(title)}"` : "";
  return `<span class="ecu-meter-icon ecu-meter-icon-ab"${tipAttr} style="${style}">${escapeAttr(letter)}</span>`;
}

/** Crop a skin via G.positions / G.imagesets (item_container core). */
export function skinSheetHtml(
  skin: string,
  displaySize = 18,
  title?: string,
  opts?: SkinSheetOpts,
): string | null {
  try {
    const G = getG() as any;
    if (!G || !G.positions || !G.imagesets) return null;
    const keys: string[] = [];
    if (skin) keys.push(skin);
    const extras = opts && opts.fallbackSkins;
    if (extras) {
      for (let i = 0; i < extras.length; i++) {
        const k = extras[i];
        if (k && keys.indexOf(k) === -1) keys.push(k);
      }
    }
    let found: { pos: any; pack: Imageset } | null = null;
    for (let i = 0; i < keys.length; i++) {
      found = positionsForSkin(G, keys[i]);
      if (found) break;
    }
    // Skills/conditions must not crop placeholder (dark empty "burn" square).
    // Items opt in via opts.placeholder — same as market tracker / explorer.
    if (!found && opts && opts.placeholder) {
      found = positionsForSkin(G, "placeholder");
    }
    if (!found) return null;
    const { pos, pack } = found;
    const x = pos[1] as number;
    const y = pos[2] as number;
    const scale = displaySize / pack.size;
    const sheetW = pack.columns * pack.size * scale;
    const sheetH = pack.rows * pack.size * scale;
    const tip = title || skin;
    const src = imagesetFileSrc(pack.file);
    const nativeTitle = !(opts && opts.nativeTitle === false);
    const tipAttr = nativeTitle ? ` title="${escapeAttr(tip)}"` : "";
    return `<span class="ecu-meter-icon ecu-meter-icon-skin"${tipAttr} style="width:${displaySize}px;height:${displaySize}px"><span class="ecu-meter-icon-clip" style="width:${displaySize}px;height:${displaySize}px"><img alt="" draggable="false" style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px" src="${escapeAttr(src)}"/></span></span>`;
  } catch {
    return null;
  }
}

export function isConditionDebuff(key: string): boolean {
  const gid = canonicalAbilityId(key);
  if (PROMOTED_DEBUFF_KEYS.has(key) || PROMOTED_DEBUFF_KEYS.has(gid)) {
    return true;
  }
  const G = getG();
  const def = G?.conditions?.[gid] || G?.conditions?.[key];
  return !!(def && def.debuff);
}

export function conditionKind(key: string): "buff" | "debuff" {
  return isConditionDebuff(key) ? "debuff" : "buff";
}

export function conditionDisplayName(key: string): string {
  const G = getG();
  const gid = canonicalAbilityId(key);
  const def = G?.conditions?.[gid] || G?.conditions?.[key];
  if (def && typeof def.name === "string" && def.name) return def.name;
  return key;
}

export function conditionSkin(key: string): string | undefined {
  const G = getG();
  const gid = canonicalAbilityId(key);
  const def = G?.conditions?.[gid] || G?.conditions?.[key];
  if (def && typeof def.skin === "string" && def.skin) return def.skin;
  return undefined;
}

/**
 * Label for a meter ability / hit source. Packet sources that are not
 * G.skills keys (e.g. burn → burned) resolve through G.conditions.
 */
export function skillDisplayName(key: string): string {
  const G = getG();
  const gid = canonicalAbilityId(key);
  const skill = G?.skills?.[gid] || G?.skills?.[key];
  if (skill && typeof skill.name === "string" && skill.name) return skill.name;
  const cond = G?.conditions?.[gid] || G?.conditions?.[key];
  if (cond && typeof cond.name === "string" && cond.name) return cond.name;
  const item = G?.items?.[gid] || G?.items?.[key];
  if (item && typeof item.name === "string" && item.name) return item.name;
  return key;
}

export function skillSkin(key: string): string | undefined {
  const G = getG();
  const gid = canonicalAbilityId(key);
  const skill = G?.skills?.[gid] || G?.skills?.[key];
  if (skill && typeof skill.skin === "string" && skill.skin) return skill.skin;
  if (skill && typeof skill.condition === "string" && skill.condition) {
    const viaCond = conditionSkin(skill.condition);
    if (viaCond) return viaCond;
  }
  const cond = G?.conditions?.[gid] || G?.conditions?.[key];
  if (cond && typeof cond.skin === "string" && cond.skin) return cond.skin;
  const item = G?.items?.[gid] || G?.items?.[key];
  if (item && typeof item.skin === "string" && item.skin) return item.skin;
  return undefined;
}

/**
 * Boss / monster ability art — G.skills skin, then G.monsters[mtype].abilities.
 * Shared by ability timeline and any skill icon with `mtype` on GameIcon.
 */
export function monsterAbilitySkin(
  abilityId: string,
  mtype?: string,
): string | undefined {
  const fromSkill = skillSkin(abilityId);
  if (fromSkill) return fromSkill;
  if (!mtype) return undefined;
  const G = getG();
  const gid = canonicalAbilityId(abilityId);
  const ab = (G?.monsters?.[mtype]?.abilities?.[gid] ||
    G?.monsters?.[mtype]?.abilities?.[abilityId]) as
    Record<string, unknown> | undefined;
  if (!ab) return undefined;
  if (typeof ab.skin === "string" && ab.skin) return ab.skin;
  if (typeof ab.condition === "string" && ab.condition) {
    const condSkin = conditionSkin(ab.condition);
    if (condSkin) return condSkin;
  }
  if (typeof ab.skill === "string" && ab.skill) {
    const linked = skillSkin(ab.skill);
    if (linked) return linked;
    return ab.skill;
  }
  if (typeof ab.use_skill === "string" && ab.use_skill) {
    const linked = skillSkin(ab.use_skill);
    if (linked) return linked;
    return ab.use_skill;
  }
  return abilityIconFallbackSkin(gid) || abilityIconFallbackSkin(abilityId);
}

/**
 * Skin key for an item — same as market tracker / data explorer:
 * `G.items[name].skin ?? name`.
 */
export function itemSkin(key: string): string | undefined {
  if (!key) return undefined;
  const G = getG();
  const def = G?.items?.[key];
  if (def && typeof def.skin === "string" && def.skin) return def.skin;
  return key;
}

export function itemDisplayName(key: string): string {
  const G = getG();
  const def = G?.items?.[key];
  if (def && typeof def.name === "string" && def.name) return def.name;
  return key;
}

export type ItemInstanceLabelActual = {
  p?: string;
  level?: number;
};

/**
 * Full hover / tip label — matches stock render_item naming (G.titles prefix,
 * compound/upgrade level suffixes).
 */
export function itemInstanceLabel(
  itemName: string,
  actual?: ItemInstanceLabelActual | null,
): string {
  const G = getG() as
    | {
        items?: Record<
          string,
          { name?: string; upgrade?: boolean; compound?: boolean }
        >;
        titles?: Record<string, { title?: string }>;
      }
    | undefined;
  const def = G?.items?.[itemName];
  let label = (def && def.name) || itemDisplayName(itemName) || itemName;
  const p = actual && actual.p ? String(actual.p) : "";
  if (p && G?.titles?.[p]?.title) {
    label = G.titles[p].title + " " + label;
  } else if (p) {
    label = p.charAt(0).toUpperCase() + p.slice(1) + " " + label;
  }
  const level = actual && actual.level != null ? Number(actual.level) : NaN;
  if (def && Number.isFinite(level)) {
    if (def.upgrade && level === 12) label += " +Z";
    else if (def.upgrade && level === 11) label += " +Y";
    else if (def.upgrade && level === 10) label += " +X";
    else if (def.compound && level === 7) label += " +R";
    else if (def.compound && level === 6) label += " +S";
    else if (def.compound && level === 5) label += " +V";
    else if (level > 0) label += " +" + Math.floor(level);
  }
  return label;
}

/** Stamp native hover label on item_container roots (outer + skin div). */
export function stampNativeItemTitle(root: HTMLElement, title: string): void {
  if (!title) return;
  root.setAttribute("title", title);
  const instance = root.querySelector(
    ".ecu-item-instance",
  ) as HTMLElement | null;
  if (instance) instance.setAttribute("title", title);
  const icRoot = root.querySelector(
    ".ecu-item-instance > div, .rclick",
  ) as HTMLElement | null;
  if (icRoot) icRoot.setAttribute("title", title);
}

/**
 * Item sheet crop — market tracker / data explorer ItemImage contract:
 * skin = G.items[name].skin ?? name (or instance/event skin override)
 * positions = G.positions[skin] ?? G.positions[name] ?? G.positions.placeholder
 * pack = G.imagesets[pos[0] || "pack_20"]
 * crop = item_container math (scale = size/pack.size, margin = cell * size)
 *
 * Compact (no level/qty/title chrome). Prefer `itemInstanceHtml` in gear
 * cooltips when stock `item_container` is available.
 */
export function itemIconHtml(
  itemName: string,
  opts?: {
    skin?: string;
    size?: number;
    title?: string;
    level?: number;
    p?: string;
    /** false → no native browser title (timeline / cooltip). Default true. */
    nativeTitle?: boolean;
  },
): string {
  const size = (opts && opts.size) || 18;
  const title =
    (opts && opts.title) ||
    itemInstanceLabel(itemName, {
      p: opts && opts.p,
      level: opts && opts.level,
    }) ||
    itemName;
  const nativeTitle = !(opts && opts.nativeTitle === false);
  const skinKey = (opts && opts.skin) || itemSkin(itemName) || itemName;
  const fallbacks: string[] = [];
  if (itemName && itemName !== skinKey) fallbacks.push(itemName);
  const sheet = skinSheetHtml(skinKey, size, title, {
    fallbackSkins: fallbacks.length ? fallbacks : undefined,
    placeholder: true,
    nativeTitle,
  });
  if (sheet) {
    return wrapHtmlWithTitleBorder(sheet, opts && opts.p);
  }
  return wrapHtmlWithTitleBorder(
    letterFallbackHtml("?", size, title, undefined, nativeTitle),
    opts && opts.p,
  );
}

function stripItemContainerHandlers(html: string): string {
  return html
    .replace(/\s+onmousedown="[^"]*"/gi, "")
    .replace(/\s+ontouchstart="[^"]*"/gi, "")
    .replace(/\s+onclick="[^"]*"/gi, "");
}

function stripNativeTitleAttrs(html: string): string {
  return html
    .replace(/\s+title="[^"]*"/gi, "")
    .replace(/\s+title='[^']*'/gi, "");
}

/** Native hover on stock item_container roots (outer div). */
function injectItemContainerTitle(html: string, title: string): string {
  const tip = ` title="${escapeAttr(title)}"`;
  return html.replace(/^(<div\b)/i, `$1${tip}`);
}

/**
 * Adventure.land item chrome via stock `item_container` (userscript equivalent
 * of market-tracker / data-explorer React `ItemInstance`): level pip, qty,
 * title border when `actual` carries them. Falls back to sheet+placeholder
 * when `item_container` is missing or fails.
 */
export function itemInstanceHtml(
  itemName: string,
  opts?: {
    skin?: string;
    level?: number;
    size?: number;
    title?: string;
    q?: number;
    p?: string;
    /** false → no native browser title (timeline / cooltip). Default true. */
    nativeTitle?: boolean;
  },
): string {
  const size = (opts && opts.size) || 40;
  const title =
    (opts && opts.title) ||
    itemInstanceLabel(itemName, {
      p: opts && opts.p,
      level: opts && opts.level,
    }) ||
    itemName;
  const nativeTitle = !(opts && opts.nativeTitle === false);
  const skinKey = (opts && opts.skin) || itemSkin(itemName) || itemName;
  const actual: Record<string, unknown> = { name: itemName };
  if (opts && opts.level != null && opts.level > 0) actual.level = opts.level;
  if (skinKey) actual.skin = skinKey;
  if (opts && opts.q != null && opts.q > 1) actual.q = opts.q;
  if (opts && opts.p) actual.p = opts.p;

  try {
    const raw = itemContainer(
      { skin: skinKey, size, draggable: false },
      actual,
    );
    if (raw) {
      let cleaned = stripItemContainerHandlers(raw).replace(
        /style="([^"]*)"/i,
        (_m, style: string) => {
          const next = /margin\s*:/i.test(style)
            ? style.replace(/margin\s*:[^;]+;?/i, "margin:0;")
            : `margin:0;${style}`;
          return `style="${next}"`;
        },
      );
      if (!nativeTitle) cleaned = stripNativeTitleAttrs(cleaned);
      else cleaned = injectItemContainerTitle(cleaned, title);
      cleaned = wrapHtmlWithTitleBorder(cleaned, opts && opts.p);
      const tipAttr = nativeTitle ? ` title="${escapeAttr(title)}"` : "";
      return `<span class="ecu-item-instance"${tipAttr}>${cleaned}</span>`;
    }
  } catch {
    /* fall through */
  }
  return itemIconHtml(itemName, {
    skin: skinKey,
    size,
    title,
    nativeTitle,
    p: opts && opts.p,
  });
}

export function monsterDisplayName(mtype: string): string {
  const G = getG();
  const def = G?.monsters?.[mtype];
  if (def && typeof def.name === "string" && def.name) return def.name;
  return mtype;
}

/**
 * Resolve a combat-target / entity id to a G.monsters key for `sprite()`.
 * Prefers stored mtype, then live entity.mtype, then id/name as mtype keys.
 */
export function resolveMonsterMtype(
  id: string,
  opts?: { mtype?: string; name?: string },
): string | undefined {
  const G = getG();
  const monsters = G?.monsters;
  if (opts?.mtype) {
    if (!monsters || monsters[opts.mtype]) return opts.mtype;
  }
  if (monsters?.[id]) return id;
  const ent = findEntityById(id);
  if (ent?.mtype) return ent.mtype;
  if (opts?.name && monsters?.[opts.name]) return opts.name;
  return opts?.mtype || undefined;
}

/**
 * Resolve an id to skin / kind / display name from G.*.
 * `auto` prefers condition → skill → item (never monsters — use kind target/monster).
 */
export function resolveGameIcon(
  id: string,
  kind: GameIconKind = "auto",
  opts?: { ctype?: string; mtype?: string; name?: string; skin?: string },
): ResolvedGameIcon {
  const key = id || "";
  if (kind === "death") {
    return { id: key || "death", kind: "death", name: "Death" };
  }
  if (kind === "class") {
    return {
      id: key,
      kind: "class",
      ctype: opts?.ctype || key,
      name: opts?.ctype || key,
    };
  }

  if (kind === "character" || kind === "actor") {
    const look = resolveCharacterLook(key, {
      ctype: opts?.ctype,
      name: opts?.name,
    });
    return {
      id: key,
      kind: "character",
      skin: look?.skin,
      ctype: look?.ctype || opts?.ctype,
      name: look?.name || opts?.name || key,
      lookSource: look?.source || "none",
    };
  }

  if (kind === "monster") {
    const mtype = resolveMonsterMtype(key, opts) || key;
    return {
      id: key,
      kind: "monster",
      mtype,
      name: opts?.name || monsterDisplayName(mtype),
    };
  }

  if (kind === "target") {
    // Player targets → class letter; monsters/NPCs → sprite(mtype).
    if (opts?.ctype) {
      return {
        id: key,
        kind: "class",
        ctype: opts.ctype,
        name: opts.name || key,
      };
    }
    const mtype = resolveMonsterMtype(key, opts);
    if (mtype) {
      return {
        id: key,
        kind: "monster",
        mtype,
        name: opts?.name || monsterDisplayName(mtype),
      };
    }
    return {
      id: key,
      kind: "monster",
      name: opts?.name || key,
    };
  }

  const G = getG();
  const gid = canonicalAbilityId(key);

  const asCondition = (): ResolvedGameIcon => ({
    id: gid,
    kind: "condition",
    skin: conditionSkin(gid),
    name: conditionDisplayName(gid),
    debuff: isConditionDebuff(gid),
  });

  const asSkill = (): ResolvedGameIcon => {
    let skin = skillSkin(gid);
    if (!skin && opts?.mtype) {
      skin = monsterAbilitySkin(key, opts.mtype);
    }
    if (!skin) {
      skin = abilityIconFallbackSkin(gid) || abilityIconFallbackSkin(key);
    }
    return {
      id: gid,
      kind: "skill",
      skin,
      name: skillDisplayName(gid),
    };
  };

  const asItem = (): ResolvedGameIcon => {
    const def = G?.items?.[gid] || G?.items?.[key];
    return {
      id: gid,
      kind: "item",
      skin: opts?.skin || itemSkin(gid) || itemSkin(key),
      name: typeof def?.name === "string" ? def.name : key,
    };
  };

  if (kind === "condition") return asCondition();
  if (kind === "auto" && G?.conditions?.[gid]) return asCondition();

  // Ability rows pass kind "skill", but burn ticks are G.conditions.burned.
  if (kind === "skill") {
    if (G?.conditions?.[gid] || G?.conditions?.[key]) return asCondition();
    if (G?.items?.[gid] || G?.items?.[key]) return asItem();
    return asSkill();
  }

  if (kind === "auto" && (G?.skills?.[gid] || G?.skills?.[key])) {
    return asSkill();
  }

  if (kind === "auto" && opts?.mtype && monsterAbilitySkin(key, opts.mtype)) {
    return asSkill();
  }

  if (
    kind === "item" ||
    (kind === "auto" && (G?.items?.[gid] || G?.items?.[key]))
  ) {
    return asItem();
  }

  // Unknown id — still try skill skin maps / letter later.
  return {
    id: gid || key,
    kind: kind === "auto" ? "skill" : kind,
    name: skillDisplayName(gid || key),
  };
}

export function classIconHtml(
  ctype: string | undefined,
  displaySize = 18,
): string {
  const key = (ctype || "").toLowerCase();
  if (!key) return "";
  const title = key;
  const color = classColors[key] || "#607d8b";
  const raw = classSprite(key || undefined, { size: displaySize });
  if (raw) {
    return `<span class="ecu-meter-icon ecu-meter-icon-class ecu-meter-icon-class-sprite" title="${escapeAttr(title)}" style="width:${displaySize}px;height:${displaySize}px;border-color:${color};background:${color}">${raw}</span>`;
  }
  const letter = CLASS_LETTERS[key] || key.slice(0, 1).toUpperCase() || "?";
  const style = [
    `width:${displaySize}px`,
    `height:${displaySize}px`,
    `line-height:${displaySize}px`,
    `background:${color}`,
  ].join(";");
  return `<span class="ecu-meter-icon ecu-meter-icon-class" title="${escapeAttr(title)}" style="${style}">${escapeAttr(letter)}</span>`;
}

/**
 * Real character portrait (skin/cx) via `sprite()`, falling back to class
 * default look, then letter / "?".
 */
export function characterIconHtml(
  id: string,
  opts?: {
    size?: number;
    ctype?: string;
    name?: string;
    title?: string;
  },
): string {
  const size = (opts && opts.size) || 40;
  const ctype = (opts?.ctype || "").toLowerCase();
  const tip =
    opts?.title ||
    (ctype ? `${opts?.name || id} · ${ctype}` : opts?.name || id || "unknown");
  const color = classColors[ctype] || "#607d8b";
  const raw = characterSprite(id, {
    size,
    ctype: opts?.ctype,
    name: opts?.name,
  });
  if (raw) {
    return `<span class="ecu-meter-icon ecu-meter-icon-character" title="${escapeAttr(tip)}" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;line-height:0">${raw}</span>`;
  }
  const classRaw = classSprite(ctype || undefined, { size });
  if (classRaw) {
    return `<span class="ecu-meter-icon ecu-meter-icon-class ecu-meter-icon-class-sprite" title="${escapeAttr(tip)}" style="width:${size}px;height:${size}px;border-color:${color};background:${color}">${classRaw}</span>`;
  }
  const letter =
    CLASS_LETTERS[ctype] ||
    (opts?.name || id || "?").slice(0, 1).toUpperCase() ||
    "?";
  return letterFallbackHtml(letter, size, tip, color);
}

function deathIconHtml(displaySize: number): string {
  return letterFallbackHtml("✝", displaySize, "Death", "#c62828");
}

/** Monster portrait via stock `sprite()` (G.monsters skin — not G.positions). */
export function monsterIconHtml(
  mtype: string,
  displaySize = 18,
  title?: string,
): string {
  const tip = title || monsterDisplayName(mtype) || mtype;
  const raw = monsterSprite(mtype, { size: displaySize });
  if (raw) {
    return `<span class="ecu-meter-icon ecu-meter-icon-monster" title="${escapeAttr(tip)}" style="width:${displaySize}px;height:${displaySize}px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;line-height:0">${raw}</span>`;
  }
  return letterFallbackHtml(
    (tip || "?").slice(0, 1).toUpperCase(),
    displaySize,
    tip,
  );
}

/**
 * Compact meter/timeline/tooltip icon HTML.
 * Uses G.positions skin crop when available; monster sprite; class letter; else first letter.
 */
export function gameIconHtml(
  id: string,
  opts?: {
    kind?: GameIconKind;
    size?: number;
    ctype?: string;
    mtype?: string;
    name?: string;
    title?: string;
    /** Instance / event skin override (gear swaps, slot.skin). */
    skin?: string;
  },
): string {
  const size = (opts && opts.size) || 18;
  const kind = (opts && opts.kind) || "auto";
  if (kind === "death") return deathIconHtml(size);
  if (kind === "class") return classIconHtml(opts?.ctype || id, size);
  if (kind === "character" || kind === "actor") {
    return characterIconHtml(id, {
      size,
      ctype: opts?.ctype,
      name: opts?.name,
      title: opts?.title,
    });
  }

  const resolved = resolveGameIcon(id, kind, {
    ctype: opts?.ctype,
    mtype: opts?.mtype,
    name: opts?.name,
    skin: opts?.skin,
  });
  const title = opts?.title || resolved.name || id;

  if (opts?.skin) {
    const explicit = skinSheetHtml(opts.skin, size, title);
    if (explicit) return explicit;
  }

  if (resolved.kind === "monster") {
    if (resolved.mtype) return monsterIconHtml(resolved.mtype, size, title);
    return letterFallbackHtml(
      (title || id || "?").slice(0, 1).toUpperCase(),
      size,
      title,
    );
  }

  if (resolved.kind === "character") {
    return characterIconHtml(id, {
      size,
      ctype: resolved.ctype || opts?.ctype,
      name: resolved.name || opts?.name,
      title,
    });
  }

  if (resolved.kind === "class") {
    return classIconHtml(resolved.ctype || id, size);
  }

  if (resolved.kind === "item") {
    return itemIconHtml(resolved.id || id, {
      skin: opts?.skin || resolved.skin,
      size,
      title,
    });
  }

  if (resolved.skin) {
    const sheet = skinSheetHtml(resolved.skin, size, title);
    if (sheet) return sheet;
  }

  // Skill / condition id often equals its skin name in G.positions.
  if (kind === "skill" || kind === "auto" || kind === "condition") {
    const asSkin = skinSheetHtml(resolved.id || id, size, title);
    if (asSkin) return asSkin;
  }

  if (opts?.mtype) return monsterIconHtml(opts.mtype, size, title);

  const letter = (title || id || "?").slice(0, 1).toUpperCase();
  return letterFallbackHtml(letter, size, title);
}

/** Ability / skill convenience (bars, tooltips, death log). */
export function skillIconHtml(key: string, displaySize = 18): string {
  return gameIconHtml(key, { kind: "skill", size: displaySize });
}

/** Condition / aura convenience. */
export function conditionIconHtml(key: string, displaySize = 18): string {
  return gameIconHtml(key, { kind: "condition", size: displaySize });
}

/** Monster / combat-target convenience. */
export function targetIconHtml(
  row: { id: string; name?: string; ctype?: string; mtype?: string },
  displaySize = 18,
): string {
  return gameIconHtml(row.id, {
    kind: "target",
    size: displaySize,
    ctype: row.ctype,
    mtype: row.mtype,
    name: row.name,
    title: row.name,
  });
}

export function rowIconHtml(
  row: {
    id: string;
    name?: string;
    ctype?: string;
    mtype?: string;
    kind?: string;
  },
  opts?: { icons?: boolean; iconSize?: number; classIcons?: boolean },
): string {
  if (opts && opts.icons === false) return "";
  const size = (opts && opts.iconSize) || 18;
  // Total row — never a class / character / "?" chip.
  if (row.id === "__total__") return "";
  if (row.kind === "ability" || row.kind === "channel") {
    return gameIconHtml(row.id, { kind: "auto", size });
  }
  // Combat targets: monster sprite or player class — never condition/skill auto.
  if (row.kind === "target") {
    return targetIconHtml(row, size);
  }
  // Player ranking (DPS/HPS/Damage Done): no character portraits. Class chips
  // are opt-in and require a known ctype — never a grey "?".
  if (row.kind === "player") {
    if (opts?.classIcons && row.ctype) return classIconHtml(row.ctype, size);
    return "";
  }
  // Heuristic: known skill/condition ids get game art (abilities without kind).
  const G = getG();
  if (G?.skills?.[row.id] || G?.conditions?.[row.id]) {
    return gameIconHtml(row.id, { kind: "auto", size });
  }
  if (row.ctype) {
    if (opts?.classIcons) return classIconHtml(row.ctype, size);
    return "";
  }
  return gameIconHtml(row.id, { kind: "auto", size });
}

/**
 * Paint stock item_container into a host element (party buffs / badges).
 * Strips drag/click handlers. Returns true if painted.
 */
export function paintItemContainerIcon(
  el: HTMLElement,
  skin: string,
  size: number,
): boolean {
  const html = itemContainer({ skin, size, draggable: false }, null);
  if (!html) {
    el.textContent = skin.slice(0, 1);
    return false;
  }
  el.innerHTML = html;
  const root = el.firstElementChild as HTMLElement | null;
  if (root) {
    root.style.margin = "0";
    root.removeAttribute("onmousedown");
    root.removeAttribute("ontouchstart");
    root.removeAttribute("onclick");
  }
  return true;
}

/** Paint compact sheet HTML (or letter) into a host element. */
export function paintGameIcon(
  el: HTMLElement,
  id: string,
  opts?: {
    kind?: GameIconKind;
    size?: number;
    ctype?: string;
    mtype?: string;
    name?: string;
    title?: string;
    skin?: string;
    /** Prefer full item_container chrome (EffectsRow / badges). */
    container?: boolean;
  },
): void {
  const size = (opts && opts.size) || 18;
  const kind = (opts && opts.kind) || "auto";
  if (
    opts?.container &&
    kind !== "monster" &&
    kind !== "target" &&
    kind !== "character" &&
    kind !== "actor" &&
    kind !== "class"
  ) {
    const resolved = resolveGameIcon(id, kind, {
      ctype: opts?.ctype,
      skin: opts?.skin,
    });
    const skin = resolved.skin || (kind === "skill" ? id : undefined);
    if (skin && paintItemContainerIcon(el, skin, size)) return;
  }
  el.innerHTML = gameIconHtml(id, {
    kind,
    size,
    ctype: opts?.ctype,
    mtype: opts?.mtype,
    name: opts?.name,
    title: opts?.title,
    skin: opts?.skin,
  });
}
