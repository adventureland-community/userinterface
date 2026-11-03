/**
 * Parse G.monsters[mtype] HP milestones for boss bars:
 * - spawns: timed [[ms, mtype, n?]] and HP [["hp:0.75", mtype, n], …]
 * - abilities.*.threshold (e.g. rimedjinn rimeshell at 0.5)
 */

import { getG } from "../host/al";
import { monsterDisplayName, skillDisplayName } from "../lib/gameIcon";
import { vizCommFlag } from "../viz/vizSettings";

export type TimedSpawnPack = {
  kind: "timed";
  intervalMs: number;
  mtype: string;
  count: number;
};

export type HpThresholdSpawnPack = {
  kind: "hp";
  /** HP ratio at which the wave fires (e.g. 0.75). */
  ratio: number;
  mtype: string;
  count: number;
};

export type SpawnPack = TimedSpawnPack | HpThresholdSpawnPack;

export type AbilityHpThreshold = {
  abilityId: string;
  ratio: number;
  title: string;
  detail: string;
};

const HP_RE = /^hp:([0-9]*\.?[0-9]+)$/i;

export function parseSpawnCondition(
  condition: unknown,
):
  | { kind: "timed"; intervalMs: number }
  | { kind: "hp"; ratio: number }
  | null {
  if (
    typeof condition === "number" &&
    Number.isFinite(condition) &&
    condition > 0
  ) {
    return { kind: "timed", intervalMs: condition };
  }
  if (typeof condition === "string") {
    const m = HP_RE.exec(condition.trim());
    if (!m) return null;
    const ratio = parseFloat(m[1]);
    if (!(ratio > 0 && ratio <= 1)) return null;
    return { kind: "hp", ratio };
  }
  return null;
}

/** All spawn packs from G.monsters[mtype].spawns (skips malformed rows). */
export function listMonsterSpawns(mtype: string): SpawnPack[] {
  const def = getG()?.monsters?.[mtype];
  const raw = def && Array.isArray(def.spawns) ? def.spawns : null;
  if (!raw) return [];
  const out: SpawnPack[] = [];
  for (let i = 0; i < raw.length; i++) {
    const pack = raw[i];
    if (!Array.isArray(pack) || pack.length < 2) continue;
    const parsed = parseSpawnCondition(pack[0]);
    const child = pack[1];
    if (!parsed || typeof child !== "string" || !child) continue;
    const count =
      typeof pack[2] === "number" && pack[2] > 0 ? Math.floor(pack[2]) : 1;
    if (parsed.kind === "timed") {
      out.push({
        kind: "timed",
        intervalMs: parsed.intervalMs,
        mtype: child,
        count,
      });
    } else {
      out.push({
        kind: "hp",
        ratio: parsed.ratio,
        mtype: child,
        count,
      });
    }
  }
  return out;
}

export function listHpThresholdSpawns(mtype: string): HpThresholdSpawnPack[] {
  const all = listMonsterSpawns(mtype);
  const out: HpThresholdSpawnPack[] = [];
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (p.kind === "hp") out.push(p);
  }
  return out;
}

export function listTimedSpawns(mtype: string): TimedSpawnPack[] {
  const all = listMonsterSpawns(mtype);
  const out: TimedSpawnPack[] = [];
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (p.kind === "timed") out.push(p);
  }
  return out;
}

function monsterExplanation(mtype: string): string {
  const def = getG()?.monsters?.[mtype];
  if (def && typeof def.explanation === "string" && def.explanation) {
    return def.explanation;
  }
  return "";
}

/**
 * Ability HP thresholds from G.monsters[mtype].abilities.*.threshold
 * (rimedjinn → rimeshell at 0.5). Detail prefers G.skills[id].explanation.
 */
export function listAbilityHpThresholds(mtype: string): AbilityHpThreshold[] {
  const G = getG();
  const def = G?.monsters?.[mtype];
  const abilities =
    def && def.abilities && typeof def.abilities === "object"
      ? (def.abilities as Record<string, unknown>)
      : null;
  if (!abilities) return [];
  const skills =
    G?.skills && typeof G.skills === "object"
      ? (G.skills as Record<string, { name?: string; explanation?: string }>)
      : null;
  const out: AbilityHpThreshold[] = [];
  const ids = Object.keys(abilities);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const raw = abilities[id];
    if (!raw || typeof raw !== "object") continue;
    const threshold = (raw as { threshold?: unknown }).threshold;
    const ratio =
      typeof threshold === "number" && Number.isFinite(threshold)
        ? threshold
        : NaN;
    if (!(ratio > 0 && ratio <= 1)) continue;
    const skill = skills && skills[id];
    const title =
      (skill && typeof skill.name === "string" && skill.name) ||
      skillDisplayName(id) ||
      id;
    const detail =
      skill && typeof skill.explanation === "string" ? skill.explanation : "";
    out.push({ abilityId: id, ratio, title, detail });
  }
  return out;
}

export type HpThresholdMark = {
  /** Fraction of bar from the left = damage taken (1 - hpRatio). */
  leftPct: number;
  /** Design HP ratio that fires the wave / ability. */
  ratio: number;
  /** True when current HP is at or below the threshold. */
  fired: boolean;
  key: string;
  /** Short heading for cooltip (skill or spawn phase name). */
  title: string;
  /** Longer explanation body for cooltip. */
  detail: string;
  /** Spawn wave child mtype, when from spawns. */
  mtype?: string;
  /** Display name for spawn child. */
  childName?: string;
  count?: number;
  /** Ability id when from abilities.*.threshold. */
  abilityId?: string;
};

/**
 * Marks for the boss HP track. Position: 75% HP → left 25%.
 * `fired` is inferred from live hp/max_hp (observer may miss pre-arrival waves).
 * Includes spawn packs and ability thresholds (rimeshell, etc.).
 */
export function buildHpThresholdMarks(
  mtype: string,
  hpRatio: number,
): HpThresholdMark[] {
  if (!vizCommFlag("comm.hpThresholds")) return [];
  const ratio = Number.isFinite(hpRatio)
    ? Math.max(0, Math.min(1, hpRatio))
    : 1;
  const out: HpThresholdMark[] = [];

  const packs = listHpThresholdSpawns(mtype);
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    const childName = monsterDisplayName(p.mtype) || p.mtype;
    const childExpl = monsterExplanation(p.mtype);
    const parentExpl = monsterExplanation(mtype);
    const detailParts: string[] = [];
    detailParts.push(
      `At ${Math.round(p.ratio * 100)}% HP, spawns ${p.count}× ${childName}.`,
    );
    if (childExpl) detailParts.push(childExpl);
    else if (parentExpl) detailParts.push(parentExpl);
    out.push({
      leftPct: (1 - p.ratio) * 100,
      ratio: p.ratio,
      fired: ratio <= p.ratio,
      mtype: p.mtype,
      childName,
      count: p.count,
      title: `Spawn · ${childName}`,
      detail: detailParts.join(" "),
      key: `hp:${p.ratio}:${p.mtype}`,
    });
  }

  const abilities = listAbilityHpThresholds(mtype);
  for (let i = 0; i < abilities.length; i++) {
    const a = abilities[i];
    // Prefer spawn mark if the same ratio already exists (rare overlap).
    let dup = false;
    for (let j = 0; j < out.length; j++) {
      if (Math.abs(out[j].ratio - a.ratio) < 0.0001) {
        // Ability explanation wins on shared thresholds.
        out[j].title = a.title;
        out[j].detail = a.detail || out[j].detail;
        out[j].abilityId = a.abilityId;
        dup = true;
        break;
      }
    }
    if (dup) continue;
    out.push({
      leftPct: (1 - a.ratio) * 100,
      ratio: a.ratio,
      fired: ratio <= a.ratio,
      abilityId: a.abilityId,
      title: a.title,
      detail: a.detail,
      key: `ability:${a.abilityId}:${a.ratio}`,
    });
  }

  return out;
}
