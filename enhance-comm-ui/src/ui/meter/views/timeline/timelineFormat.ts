/**
 * Time Line clocks, key/gear labels, and block icons.
 */

import {
  conditionDisplayName,
  gameIconHtml,
  itemDisplayName,
  itemIconHtml,
  itemInstanceHtml,
  skillDisplayName,
} from "../../../../lib/gameIcon";
import type { TimelineBlock } from "./timelineModel";

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function fmtAt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

/** Local wall-clock HH:MM:SS from epoch ms. */
export function fmtWall(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Fight-relative atSec → wall clock using segment/timeline origin.
 * Origin is absolute ms (seg.startedAt / first event), same as axis 00:00.
 */
export function wallAtElapsed(originMs: number, atSec: number): string {
  if (!(originMs > 0)) return "";
  return fmtWall(originMs + Math.max(0, atSec) * 1000);
}

/** Fight elapsed · wall clock, e.g. `1m 12s · 12:07:32`. */
export function tipAtLabel(originMs: number, atSec: number): string {
  const wall = wallAtElapsed(originMs, atSec);
  return wall ? `${fmtAt(atSec)} · ${wall}` : fmtAt(atSec);
}

export function prettySlot(slot: string): string {
  const spaced = slot.replace(/([0-9]+)$/, " $1");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type GearSwapKind = "swap" | "equip" | "unequip" | "unknown";

export function gearSwapKind(
  oldName: string | undefined,
  newName: string | undefined,
): GearSwapKind {
  if (oldName && newName) return "swap";
  if (newName) return "equip";
  if (oldName) return "unequip";
  return "unknown";
}

export function gearItemLabel(
  name: string | undefined,
  level?: number,
): string {
  if (!name) return "(empty)";
  const pretty = itemDisplayName(name);
  if (level != null && level > 0) return `${pretty} +${level}`;
  return pretty;
}

/** Display name only — level lives on item_container / instance chrome. */
export function gearItemNameOnly(name: string | undefined): string {
  if (!name) return "(empty)";
  return itemDisplayName(name);
}

/** Compact `old → new` (levels if present). Equip/unequip omit the empty side. */
export function gearSwapLine(
  oldName: string | undefined,
  oldLevel: number | undefined,
  newName: string | undefined,
  newLevel: number | undefined,
): string {
  const kind = gearSwapKind(oldName, newName);
  switch (kind) {
    case "swap":
      return `${gearItemLabel(oldName, oldLevel)} → ${gearItemLabel(newName, newLevel)}`;
    case "equip":
      return gearItemLabel(newName, newLevel);
    case "unequip":
      return gearItemLabel(oldName, oldLevel);
    case "unknown":
      return "Gear change";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type GearItemIconOpts = {
  level?: number;
  /**
   * true → stock `item_container` instance chrome (level pip / qty / title).
   * false/omit → compact sheet crop (timeline pin glyphs).
   */
  instance?: boolean;
};

/**
 * Item sprite for tip / pin.
 * Tips pass `instance: true` for AL item_container chrome; pins stay compact.
 * Never sets a native browser `title` — Time Line uses a custom cooltip.
 */
export function gearItemIconHtml(
  name: string | undefined,
  skin: string | undefined,
  size: number,
  title: string,
  opts?: GearItemIconOpts,
): string {
  if (!name && !skin) {
    return `<span class="ecu-meter-tt-gear-empty" style="width:${size}px;height:${size}px"></span>`;
  }
  if (opts && opts.instance && name) {
    return itemInstanceHtml(name, {
      skin,
      level: opts.level,
      size,
      title,
      nativeTitle: false,
    });
  }
  if (name) {
    return itemIconHtml(name, {
      skin,
      size,
      title,
      nativeTitle: false,
    });
  }
  return itemIconHtml(skin!, {
    skin,
    size,
    title,
    nativeTitle: false,
  });
}

export function prettyKey(key: string): string {
  if (!key) return "?";
  const cond = conditionDisplayName(key);
  if (cond !== key) return cond;
  const skill = skillDisplayName(key);
  if (skill !== key) return skill;
  return key.replace(/_/g, " ");
}

export function blockIconHtml(b: TimelineBlock, size: number): string {
  if (b.kind === "death") {
    return gameIconHtml("death", { kind: "death", size });
  }
  if (b.kind === "condition") {
    return gameIconHtml(b.key, {
      kind: "condition",
      size,
      title: b.label,
    });
  }
  if (b.kind === "gear") {
    // Pin glyph = newly equipped item when present, else unequipped (old).
    // Skin prefers event `skin` (new, else old from recorder). Same-`at`
    // multi-slot pins stack at one X — TimelineEvent boosts mainhand z.
    return gearItemIconHtml(
      b.newName || b.oldName || b.key,
      b.skin,
      size,
      b.label,
    );
  }
  return gameIconHtml(b.key, { kind: "auto", size, title: b.label });
}

export function blockCategoryLabel(b: TimelineBlock): string {
  if (b.kind === "death") return "Death";
  if (b.kind === "cast") return "Cooldown";
  if (b.kind === "gear") return "Gear";
  if (b.condKind === "debuff") return "Debuff";
  return "Buff";
}
