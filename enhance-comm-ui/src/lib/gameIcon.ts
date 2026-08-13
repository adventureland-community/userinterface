/**
 * Shared AL icon resolution — skills / conditions / items via G.* skins;
 * monsters via G.monsters + stock `sprite()` (not G.positions);
 * characters via entity/roster skin+cx (else class looks[0]).
 * Prefer G.positions + G.imagesets (same crop math as stock item_container).
 */

import { classColors } from "./colors";
import { findEntityById, getG } from "../host/al";
import {
  characterSprite,
  classSprite,
  itemContainer,
  monsterSprite,
  resolveCharacterLook,
} from "../host/icons";
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
): string {
  const style = [
    `width:${size}px`,
    `height:${size}px`,
    `line-height:${size}px`,
    bg ? `background:${bg}` : "",
  ]
    .filter(Boolean)
    .join(";");
  return `<span class="ecu-meter-icon ecu-meter-icon-ab" title="${escapeAttr(title)}" style="${style}">${escapeAttr(letter)}</span>`;
}

/** Crop a skin via G.positions / G.imagesets (item_container core). */
export function skinSheetHtml(
  skin: string,
  displaySize = 18,
  title?: string,
): string | null {
  try {
    const G = (window as any).G;
    if (!G || !G.positions || !G.imagesets) return null;
    // Missing skins must not crop G.positions.placeholder — that paints a
    // dark empty square (Inspector "burn" with no icon). Letter fallback
    // in gameIconHtml is the honest unknown-id path.
    const pos = G.positions[skin];
    if (!pos) return null;
    const setName = pos[0] || "pack_20";
    const pack = G.imagesets[setName] as Imageset | undefined;
    if (!pack || !pack.file) return null;
    const x = pos[1] as number;
    const y = pos[2] as number;
    const scale = displaySize / pack.size;
    const sheetW = pack.columns * pack.size * scale;
    const sheetH = pack.rows * pack.size * scale;
    const tip = title || skin;
    return `<span class="ecu-meter-icon ecu-meter-icon-skin" title="${escapeAttr(tip)}" style="width:${displaySize}px;height:${displaySize}px"><span class="ecu-meter-icon-clip" style="width:${displaySize}px;height:${displaySize}px"><img alt="" draggable="false" style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px" src="${pack.file}"/></span></span>`;
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
  const cond = G?.conditions?.[gid] || G?.conditions?.[key];
  if (cond && typeof cond.skin === "string" && cond.skin) return cond.skin;
  const item = G?.items?.[gid] || G?.items?.[key];
  if (item && typeof item.skin === "string" && item.skin) return item.skin;
  return undefined;
}

export function itemSkin(key: string): string | undefined {
  const G = getG();
  const def = G?.items?.[key];
  if (def && typeof def.skin === "string" && def.skin) return def.skin;
  return undefined;
}

export function itemDisplayName(key: string): string {
  const G = getG();
  const def = G?.items?.[key];
  if (def && typeof def.name === "string" && def.name) return def.name;
  return key;
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
  opts?: { ctype?: string; mtype?: string; name?: string },
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

  const asSkill = (): ResolvedGameIcon => ({
    id: gid,
    kind: "skill",
    skin: skillSkin(gid),
    name: skillDisplayName(gid),
  });

  const asItem = (): ResolvedGameIcon => {
    const def = G?.items?.[gid] || G?.items?.[key];
    return {
      id: gid,
      kind: "item",
      skin: itemSkin(gid) || itemSkin(key),
      name: typeof def?.name === "string" ? def.name : key,
    };
  };

  if (kind === "condition") return asCondition();
  if (kind === "auto" && G?.conditions?.[gid]) return asCondition();

  // Ability rows pass kind "skill", but burn ticks are G.conditions.burned.
  if (kind === "skill") {
    if (G?.skills?.[gid] || G?.skills?.[key]) return asSkill();
    if (G?.conditions?.[gid] || G?.conditions?.[key]) return asCondition();
    if (G?.items?.[gid] || G?.items?.[key]) return asItem();
    return {
      id: gid || key,
      kind: "skill",
      name: skillDisplayName(gid || key),
    };
  }

  if (kind === "auto" && (G?.skills?.[gid] || G?.skills?.[key])) {
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
  });
  const title = opts?.title || resolved.name || id;

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

  if (resolved.skin) {
    const sheet = skinSheetHtml(resolved.skin, size, title);
    if (sheet) return sheet;
  }

  // Skill / condition id often equals its skin name in G.positions.
  if (kind === "skill" || kind === "auto" || kind === "condition") {
    const asSkin = skinSheetHtml(resolved.id || id, size, title);
    if (asSkin) return asSkin;
  }

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
  // Total footer — never a class / character / "?" chip.
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
    const resolved = resolveGameIcon(id, kind, { ctype: opts?.ctype });
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
  });
}
