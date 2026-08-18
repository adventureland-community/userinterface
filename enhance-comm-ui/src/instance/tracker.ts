import type { EntityLike } from "../host/globals";
import { onKill, type KillEvent } from "../sockets/hub";
import { INSTANCE_CONFIGS, allInstanceBossMtypes } from "./configs";

/** @deprecated Prefer INSTANCE_CONFIGS.crypt — kept for meter segment splits. */
export const CRYPT_BOSSES_MTYPES = INSTANCE_CONFIGS.crypt.bossMtypes.slice();

/** @deprecated Prefer INSTANCE_CONFIGS.crypt.trackedMtypes */
export const CRYPT_IMPORTANT_MOBS_MTYPES =
  INSTANCE_CONFIGS.crypt.trackedMtypes.slice();

export type CryptBossState = {
  deadCount: number;
  firstSeen?: number;
  lastSeen?: number;
  lastSeenLevel?: number;
  lastSeenFocus?: string;
  luckm?: number;
  deathEventTimestamp?: number;
};

export type CryptMobState = {
  deadCount: number;
  lastSeenLevel?: number;
};

type InstanceData = Record<string, CryptBossState | CryptMobState>;

const CRYPT_MOBS_STATES_AND_STATS: Record<string, InstanceData> = {};
const idToMobData = new Map<string, { mtype: string; in: string }>();

let unsubKill: (() => void) | null = null;
let bossMtypeSet = allInstanceBossMtypes();

function isBossMtype(mtype: string): boolean {
  return bossMtypeSet.has(mtype);
}

function handleKill(ev: KillEvent): void {
  const mobData = idToMobData.get(ev.id);
  if (!mobData) return;
  const instanceData = CRYPT_MOBS_STATES_AND_STATS[mobData.in];
  if (!instanceData) return;
  const mobRichData = instanceData[mobData.mtype];
  if (!mobRichData) return;
  mobRichData.deadCount += 1;
  if (isBossMtype(mobData.mtype)) {
    const boss = mobRichData as CryptBossState;
    boss.luckm = ev.luckm;
    boss.deathEventTimestamp = ev.at;
  }
}

/** Call once at boot — listens to hub kills only (no render subscribe). */
export function startInstanceTracker(): () => void {
  bossMtypeSet = allInstanceBossMtypes();
  if (!unsubKill) {
    unsubKill = onKill(handleKill);
  }
  return () => {
    if (unsubKill) {
      unsubKill();
      unsubKill = null;
    }
  };
}

export type UpdateFromEntitiesOpts = {
  trackedMtypes: string[];
  bossMtypes: string[];
};

export function updateFromEntities(
  instanceId: string | undefined,
  entities: EntityLike[] | Record<string, EntityLike>,
  opts?: UpdateFromEntitiesOpts,
): void {
  if (!instanceId) return;
  if (!(instanceId in CRYPT_MOBS_STATES_AND_STATS)) {
    CRYPT_MOBS_STATES_AND_STATS[instanceId] = {};
  }
  const tracked = opts?.trackedMtypes || INSTANCE_CONFIGS.crypt.trackedMtypes;
  const bosses = opts?.bossMtypes || INSTANCE_CONFIGS.crypt.bossMtypes;
  const trackedSet = new Set(tracked);
  const bossSet = new Set(bosses);
  const now = Date.now();
  const list = Array.isArray(entities) ? entities : Object.values(entities);
  for (let i = 0; i < list.length; i++) {
    const entity = list[i];
    if (!entity) continue;
    if (!entity.visible || entity.dead) continue;
    if (!entity.mtype || !trackedSet.has(entity.mtype)) {
      continue;
    }
    const instanceData = CRYPT_MOBS_STATES_AND_STATS[instanceId];
    if (bossSet.has(entity.mtype)) {
      if (!(entity.mtype in instanceData)) {
        instanceData[entity.mtype] = {
          deadCount: 0,
          firstSeen: now,
          lastSeen: now,
          lastSeenLevel: entity.level,
          lastSeenFocus: entity.focus,
        };
      } else {
        const boss = instanceData[entity.mtype] as CryptBossState;
        boss.lastSeen = now;
        boss.lastSeenLevel = entity.level;
        // Living sighting after a kill = battle / spawn reset — clear death UI.
        // Keep deadCount as historical kills for the instance.
        if (boss.deathEventTimestamp != null || boss.luckm != null) {
          boss.deathEventTimestamp = undefined;
          boss.luckm = undefined;
        }
      }
    } else if (!(entity.mtype in instanceData)) {
      instanceData[entity.mtype] = {
        deadCount: 0,
        lastSeenLevel: entity.level,
      };
    } else {
      instanceData[entity.mtype].lastSeenLevel = entity.level;
    }
    idToMobData.set(entity.id, {
      mtype: entity.mtype,
      in: entity.in || instanceId,
    });
  }
}

export function getInstanceData(instanceId: string | undefined): InstanceData {
  if (!instanceId) return {};
  return CRYPT_MOBS_STATES_AND_STATS[instanceId] ?? {};
}

export function getMobData(
  id: string,
): { mtype: string; in: string } | undefined {
  return idToMobData.get(id);
}

export function resolveFocusMtype(
  focusId: string | undefined,
): string | undefined {
  if (!focusId) return undefined;
  return idToMobData.get(focusId)?.mtype;
}
