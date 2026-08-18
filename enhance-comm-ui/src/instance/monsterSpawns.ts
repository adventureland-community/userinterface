/**
 * Parse G.monsters[mtype].spawns — timed [[ms, mtype, n?]] and HP
 * [["hp:0.75", mtype, n], …]. Same shape server uses in render/combat.
 */

import { getG } from "../host/al";
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

const HP_RE = /^hp:([0-9]*\.?[0-9]+)$/i;

export function parseSpawnCondition(
  condition: unknown,
):
  { kind: "timed"; intervalMs: number } | { kind: "hp"; ratio: number } | null {
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

export type HpThresholdMark = {
  /** Fraction of bar from the left = damage taken (1 - hpRatio). */
  leftPct: number;
  /** Design HP ratio that fires the wave. */
  ratio: number;
  /** True when current HP is at or below the threshold. */
  fired: boolean;
  mtype: string;
  count: number;
  key: string;
};

/**
 * Marks for the boss HP track. Position mirrors mockup: 75% HP → left 25%.
 * `fired` is inferred from live hp/max_hp (observer may miss pre-arrival waves).
 */
export function buildHpThresholdMarks(
  mtype: string,
  hpRatio: number,
): HpThresholdMark[] {
  if (!vizCommFlag("comm.hpThresholds")) return [];
  const packs = listHpThresholdSpawns(mtype);
  if (!packs.length) return [];
  const ratio = Number.isFinite(hpRatio)
    ? Math.max(0, Math.min(1, hpRatio))
    : 1;
  const out: HpThresholdMark[] = [];
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    out.push({
      leftPct: (1 - p.ratio) * 100,
      ratio: p.ratio,
      fired: ratio <= p.ratio,
      mtype: p.mtype,
      count: p.count,
      key: `hp:${p.ratio}:${p.mtype}`,
    });
  }
  return out;
}
