/**
 * AL skill icons — same sprite crop approach as the meter mockup / item_container.
 */

import { classColors } from "../lib/colors";

const CDN = "https://adventure.land";

const SETS: Record<
  string,
  { file: string; size: number; cols: number; rows: number }
> = {
  skills: {
    file: CDN + "/images/tiles/items/skills_20v6.png",
    size: 20,
    cols: 16,
    rows: 13,
  },
  pack_1a: {
    file: CDN + "/images/tiles/items/pack_1a.png?v=11",
    size: 16,
    cols: 16,
    rows: 128,
  },
};

/** abilityKey → [imageset, x, y] */
const BY_KEY: Record<string, [string, number, number]> = {
  attack: ["skills", 1, 6],
  heal: ["skills", 1, 11],
  lifesteal: ["skills", 1, 11],
  cleave: ["skills", 2, 1],
  agitate: ["skills", 7, 1],
  taunt: ["pack_1a", 8, 85],
  partyheal: ["skills", 1, 4],
  curse: ["pack_1a", 11, 83],
  "3shot": ["skills", 1, 2],
  "5shot": ["skills", 2, 2],
  cburst: ["skills", 2, 0],
  burn: ["pack_1a", 10, 78],
  supershot: ["pack_1a", 8, 88],
  quickstab: ["skills", 3, 3],
  quickpunch: ["skills", 4, 3],
  piercingshot: ["skills", 7, 2],
  huntersmark: ["skills", 6, 2],
  dash: ["skills", 9, 1],
  stomp: ["skills", 3, 1],
  warcry: ["skills", 6, 1],
  tomb_slam: ["skills", 3, 11],
  spike_bite: ["skills", 3, 3],
  swarm: ["skills", 2, 2],
  cryptling_swarm: ["skills", 2, 2],
};

function resolveFromG(key: string): [string, number, number] | null {
  try {
    const G = (window as any).G;
    const skill = G && G.skills && G.skills[key];
    if (!skill) return null;
    // Prefer known map; G.skills often has skin name only
    if (BY_KEY[key]) return BY_KEY[key];
    if (skill.skin && BY_KEY[skill.skin]) return BY_KEY[skill.skin];
  } catch {
    /* ignore */
  }
  return BY_KEY[key] || null;
}

export function skillIconHtml(key: string, displaySize = 18): string {
  const pos = resolveFromG(key) || BY_KEY[key];
  if (!pos) {
    const letter = (key || "?").slice(0, 1).toUpperCase();
    return `<span class="ecu-meter-icon ecu-meter-icon-ab" style="width:${displaySize}px;height:${displaySize}px;line-height:${displaySize}px">${letter}</span>`;
  }
  const [setName, x, y] = pos;
  const set = SETS[setName];
  if (!set) return "";
  const scale = displaySize / set.size;
  const sheetW = set.cols * set.size * scale;
  const sheetH = set.rows * set.size * scale;
  return `<span class="ecu-meter-icon ecu-meter-icon-skill" title="${key}" style="width:${displaySize}px;height:${displaySize}px"><span class="ecu-meter-icon-clip" style="width:${displaySize}px;height:${displaySize}px"><img alt="" draggable="false" style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px" src="${set.file}"/></span></span>`;
}

const CLASS_LETTERS: Record<string, string> = {
  warrior: "W",
  mage: "M",
  priest: "P",
  ranger: "R",
  paladin: "L",
  rogue: "G",
  merchant: "$",
};

export function classIconHtml(
  ctype: string | undefined,
  displaySize = 18,
): string {
  const key = (ctype || "").toLowerCase();
  const letter = CLASS_LETTERS[key] || key.slice(0, 1).toUpperCase() || "?";
  const color = classColors[key] || "#607d8b";
  return `<span class="ecu-meter-icon ecu-meter-icon-class" title="${key || "unknown"}" style="width:${displaySize}px;height:${displaySize}px;line-height:${displaySize}px;background:${color}">${letter}</span>`;
}

export function rowIconHtml(
  row: { id: string; ctype?: string; kind?: string },
  opts?: { icons?: boolean; iconSize?: number; classIcons?: boolean },
): string {
  if (opts && opts.icons === false) return "";
  const size = (opts && opts.iconSize) || 18;
  if (row.kind === "ability" || BY_KEY[row.id] || resolveFromG(row.id)) {
    return skillIconHtml(row.id, size);
  }
  if (
    (opts?.classIcons !== false && row.kind === "player") ||
    (!row.kind && row.ctype)
  ) {
    return classIconHtml(row.ctype, size);
  }
  if (row.ctype && opts?.classIcons !== false) {
    return classIconHtml(row.ctype, size);
  }
  return "";
}
