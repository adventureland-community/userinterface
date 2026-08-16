import { setXTarget } from "../host/icons";
import { getCharacter, getEntitiesList } from "../host/al";
import { formatTime } from "../lib/format";
import { getCryptMobLabel } from "./labels";
import { pickVisibleCryptMob } from "./pickVisibleMob";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  resolveFocusMtype,
  type CryptBossState,
} from "./tracker";
import type { EntityLike } from "../host/globals";

export type CryptProgressProps = {
  entities: EntityLike[];
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string) => void;
};

export type CryptCardProps = {
  mtype: string;
  borderColor: string;
  levelComponent: string;
  status: string;
  lastSeenComponent: any;
  focusComponent: any;
  luckmComponent: any;
  onClick?: () => void;
  dummy?: boolean;
};

export const CRYPT_BAT_MTYPES = CRYPT_IMPORTANT_MOBS_MTYPES.filter(
  (mtype) => CRYPT_BOSSES_MTYPES.indexOf(mtype) < 0,
);

function findVisibleMob(
  entities: EntityLike[],
  mtype: string,
): EntityLike | undefined {
  const self = getCharacter();
  const selfId = self && self.id != null ? String(self.id) : undefined;
  return pickVisibleCryptMob(entities, mtype, selfId);
}

export function formatBossDeathStatus(boss: CryptBossState): string {
  const ago =
    boss.deathEventTimestamp != null
      ? formatTime((Date.now() - boss.deathEventTimestamp) / 1000)
      : "?";
  if (boss.deadCount > 1) {
    return `Died · #${boss.deadCount} · ${ago} ago`;
  }
  return `Died ${ago} ago`;
}

/** Card field bag for CryptCard (orchestrator calls e(CryptCard, props)). */
export function buildCryptCardProps(
  mtype: string,
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
): CryptCardProps & { key: string } {
  const mobRichData = instanceData[mtype];
  let borderColor = "gray";
  if (aggroedMtypes.has(mtype)) borderColor = "red";
  else if (currentlySeeMtypes.has(mtype)) borderColor = "yellow";
  let status = "??";
  let lastSeenComponent: any = null;
  let levelComponent = "";
  let focusComponent: any = null;
  let luckmComponent: any = null;
  if (mobRichData) {
    if (CRYPT_BOSSES_MTYPES.indexOf(mtype) >= 0) {
      const boss = mobRichData as CryptBossState;
      if (boss.deadCount > 0) {
        status = formatBossDeathStatus(boss);
        if (boss.luckm != null) {
          luckmComponent = `luckm: ${boss.luckm.toFixed(3)}`;
        }
      } else {
        status = "Alive";
        if (aggroedMtypes.has(mtype)) lastSeenComponent = "Aggroed!";
        else if (currentlySeeMtypes.has(mtype)) lastSeenComponent = "We see!";
        else if (boss.lastSeen != null) {
          lastSeenComponent = `Seen ${formatTime((Date.now() - boss.lastSeen) / 1000)} ago`;
        }
        if (boss.lastSeenFocus) {
          const focusMtype = resolveFocusMtype(boss.lastSeenFocus);
          if (focusMtype) {
            focusComponent = `Focus: ${getCryptMobLabel(focusMtype)}`;
          }
        }
      }
      if (boss.lastSeenLevel != null) {
        levelComponent = ` (${boss.lastSeenLevel} lvl)`;
      }
    } else {
      status = `Died: ${mobRichData.deadCount}`;
    }
  }
  let onClick: (() => void) | undefined;
  if (props.setSelectedEntity && currentlySeeMtypes.has(mtype)) {
    onClick = () => {
      const visibleMob = findVisibleMob(getEntitiesList(), mtype);
      if (!visibleMob) return;
      setXTarget(visibleMob);
      props.setSelectedEntity!(String(visibleMob.id));
    };
  }
  return {
    key: mtype,
    mtype,
    borderColor,
    levelComponent,
    status,
    lastSeenComponent,
    focusComponent,
    luckmComponent,
    onClick,
  };
}
