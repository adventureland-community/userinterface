/**
 * instanceRun panel model — progress / phase / luckm from tracker.
 */

import type { EntityLike } from "../host/globals";
import type { CryptBossState } from "./tracker";
import { getInstanceData } from "./tracker";
import type { InstanceConfig } from "./configs";
import { getInstanceMobLabel } from "./labels";

export type InstanceRunModel = {
  title: string;
  progressLabel: string;
  progressCurrent: number;
  progressTotal: number;
  phaseLabel: string | null;
  luckmLabel: string | null;
  hint: string | null;
};

function countClearedBosses(
  cfg: InstanceConfig,
  data: ReturnType<typeof getInstanceData>,
): number {
  let n = 0;
  for (let i = 0; i < cfg.bossMtypes.length; i++) {
    const row = data[cfg.bossMtypes[i]];
    if (row && row.deadCount > 0) n += 1;
  }
  return n;
}

function latestLuckm(
  cfg: InstanceConfig,
  data: ReturnType<typeof getInstanceData>,
): number | null {
  let bestAt = -1;
  let luckm: number | null = null;
  for (let i = 0; i < cfg.bossMtypes.length; i++) {
    const row = data[cfg.bossMtypes[i]] as CryptBossState | undefined;
    if (!row || row.luckm == null) continue;
    const at = row.deathEventTimestamp ?? 0;
    if (at >= bestAt) {
      bestAt = at;
      luckm = row.luckm;
    }
  }
  return luckm;
}

function phaseIndex(
  cfg: InstanceConfig,
  data: ReturnType<typeof getInstanceData>,
  entities: EntityLike[],
): { current: number; total: number; activeLabel: string | null } {
  const order = cfg.phaseOrder || cfg.bossMtypes;
  const total = order.length;
  let visibleIdx = -1;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.type !== "monster" || !ent.visible || ent.dead) continue;
    if (!ent.mtype) continue;
    const idx = order.indexOf(ent.mtype);
    if (idx >= 0 && idx > visibleIdx) visibleIdx = idx;
  }
  if (visibleIdx >= 0) {
    return {
      current: visibleIdx + 1,
      total,
      activeLabel: getInstanceMobLabel(order[visibleIdx]),
    };
  }
  // No live entity — infer from kills (prior phases dead).
  let cleared = 0;
  for (let i = 0; i < order.length; i++) {
    const row = data[order[i]];
    if (row && row.deadCount > 0) cleared = i + 1;
  }
  return {
    current: cleared,
    total,
    activeLabel: cleared > 0 ? getInstanceMobLabel(order[cleared - 1]) : null,
  };
}

function countVisibleAdds(entities: EntityLike[], mtype: string): number {
  let n = 0;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.type !== "monster" || !ent.visible || ent.dead) continue;
    if (ent.mtype === mtype) n += 1;
  }
  return n;
}

function spiderGateHint(
  cfg: InstanceConfig,
  data: ReturnType<typeof getInstanceData>,
  currentlySee: Set<string>,
): string | null {
  const side = cfg.gateSideMtypes;
  const gate = cfg.gateBossMtype;
  if (!side || !gate) return null;
  let sideAlive = false;
  for (let i = 0; i < side.length; i++) {
    const mt = side[i];
    const row = data[mt];
    const dead = !!(row && row.deadCount > 0) && !currentlySee.has(mt);
    if (!dead) sideAlive = true;
  }
  if (sideAlive && (currentlySee.has(gate) || !data[gate]?.deadCount)) {
    return "Passage blocked while side queens live";
  }
  if (!sideAlive) return "Exit opens when queen dies";
  return null;
}

export function buildInstanceRunModel(
  cfg: InstanceConfig,
  instanceId: string | undefined,
  entities: EntityLike[],
  currentlySeeMtypes: Set<string>,
): InstanceRunModel {
  const data = getInstanceData(instanceId);
  let phaseLabel: string | null = null;

  const luckm = latestLuckm(cfg, data);
  const luckmLabel = luckm != null ? `luckm ${luckm.toFixed(3)}` : null;

  let progressLabel = "Bosses cleared";
  let progressCurrent = 0;
  let progressTotal = cfg.bossMtypes.length;
  let hint: string | null = null;

  switch (cfg.progressMode) {
    case "count": {
      progressCurrent = countClearedBosses(cfg, data);
      progressLabel =
        cfg.map === "tomb" ? "Guardians cleared" : "Bosses cleared";
      break;
    }
    case "phase": {
      const ph = phaseIndex(cfg, data, entities);
      progressCurrent = ph.current;
      progressTotal = ph.total;
      progressLabel = "Phase";
      if (ph.current > 0) {
        const order = cfg.phaseOrder || cfg.bossMtypes;
        const mt = order[ph.current - 1];
        const short = (cfg.phaseNames && cfg.phaseNames[mt]) || ph.activeLabel;
        phaseLabel = short
          ? `Phase ${ph.current} · ${short}`
          : `Phase ${ph.current} / ${ph.total}`;
      } else if (ph.activeLabel) {
        phaseLabel = ph.activeLabel;
      }
      break;
    }
    case "adds": {
      const mtype = cfg.addMtype || "spider";
      const pack = cfg.addPackSize || 6;
      progressCurrent = countVisibleAdds(entities, mtype);
      progressTotal = pack;
      progressLabel = "Spiders visible";
      hint = spiderGateHint(cfg, data, currentlySeeMtypes);
      break;
    }
    default: {
      const _exhaustive: never = cfg.progressMode;
      void _exhaustive;
      break;
    }
  }

  return {
    title: cfg.title,
    progressLabel,
    progressCurrent,
    progressTotal,
    phaseLabel,
    luckmLabel,
    hint,
  };
}
