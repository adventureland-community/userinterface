import { e } from "../../host/react";
import { formatTime } from "../../lib/format";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  resolveFocusMtype,
  updateFromEntities,
  type CryptBossState,
} from "../../crypt/tracker";
import type { EntityLike } from "../../host/globals";
import { getMapData } from "./MapInfo";

export type CryptProgressProps = {
  entities: EntityLike[];
};

export function CryptProgress(props: CryptProgressProps): any {
  const mapName = getMapData(props.entities);
  if (!mapName || mapName.map !== "crypt") {
    return null;
  }

  updateFromEntities(mapName.in, props.entities);

  const currentlySeeMtypes = new Set<string>();
  const aggroedMtypes = new Set<string>();

  for (let i = 0; i < props.entities.length; i++) {
    const entity = props.entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (!entity.mtype || CRYPT_IMPORTANT_MOBS_MTYPES.indexOf(entity.mtype) < 0) {
      continue;
    }
    currentlySeeMtypes.add(entity.mtype);
    if (entity.target) aggroedMtypes.add(entity.mtype);
  }

  const instanceData = getInstanceData(mapName.in);
  const elems: any[] = [];

  for (let i = 0; i < CRYPT_IMPORTANT_MOBS_MTYPES.length; i++) {
    const mtype = CRYPT_IMPORTANT_MOBS_MTYPES[i];
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
          status = `Died ${formatTime((Date.now() - (boss.deathEventTimestamp || 0)) / 1000)} ago`;
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
            if (focusMtype) focusComponent = `Focus: ${focusMtype}`;
          }
        }
        if (boss.lastSeenLevel != null) {
          levelComponent = ` (${boss.lastSeenLevel} lvl)`;
        }
      } else {
        status = `Died: ${mobRichData.deadCount}`;
      }
    }

    elems.push(
      e(
        "div",
        {
          key: mtype,
          style: {
            background: "black",
            border: `2px double ${borderColor}`,
            padding: "4px",
          },
        },
        e("div", { key: "mtype" }, `${mtype}${levelComponent}`),
        e("div", { key: "state" }, status),
        lastSeenComponent
          ? e("div", { key: "lastSeen" }, lastSeenComponent)
          : undefined,
        focusComponent ? e("div", { key: "focus" }, focusComponent) : undefined,
        luckmComponent ? e("div", { key: "luckm" }, luckmComponent) : undefined,
      ),
    );
  }

  return e(
    "div",
    {
      key: "content",
      style: {
        display: "flex",
        gap: "4px",
      },
    },
    ...elems,
  );
}
