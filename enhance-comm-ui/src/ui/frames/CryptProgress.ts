import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { formatTime } from "../../lib/format";
import { CRYPT_PANEL_STYLE } from "../../lib/frameSizes";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  resolveFocusMtype,
  updateFromEntities,
  type CryptBossState,
} from "../../crypt/tracker";
import type { EntityLike } from "../../host/globals";
import { PanelShellDummy } from "../chrome/PanelShellDummy";
import { getMapData } from "./MapInfo";

export type CryptProgressProps = {
  entities: EntityLike[];
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string) => void;
};

function findVisibleMob(
  entities: EntityLike[],
  mtype: string,
): EntityLike | undefined {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (entity.mtype === mtype) return entity;
  }
  return undefined;
}

const CARD_STYLE_BASE: Record<string, any> = {
  background: "black",
  padding: "4px 6px",
  minWidth: "72px",
  boxSizing: "border-box",
  fontSize: TYPE.chrome,
  lineHeight: 1.25,
  color: "#eee",
  ...PIXEL_TEXT,
};

const META_STYLE: Record<string, any> = {
  fontSize: TYPE.secondary,
  color: "#ccc",
  ...PIXEL_TEXT,
};

function CryptCard(props: {
  mtype: string;
  borderColor: string;
  levelComponent: string;
  status: string;
  lastSeenComponent: any;
  focusComponent: any;
  luckmComponent: any;
  onClick?: () => void;
}): any {
  const clickable = !!props.onClick;
  return e(
    "div",
    {
      key: props.mtype,
      style: Object.assign({}, CARD_STYLE_BASE, {
        border: `2px double ${props.borderColor}`,
        cursor: clickable ? "pointer" : undefined,
      }),
      title: clickable ? "Click to target" : undefined,
      onClick: props.onClick,
    },
    e("div", { key: "mtype" }, `${props.mtype}${props.levelComponent}`),
    e("div", { key: "state", style: META_STYLE }, props.status),
    props.lastSeenComponent
      ? e("div", { key: "lastSeen", style: META_STYLE }, props.lastSeenComponent)
      : undefined,
    props.focusComponent
      ? e("div", { key: "focus", style: META_STYLE }, props.focusComponent)
      : undefined,
    props.luckmComponent
      ? e("div", { key: "luckm", style: META_STYLE }, props.luckmComponent)
      : undefined,
  );
}

export function CryptProgress(props: CryptProgressProps): any {
  const mapName = getMapData(props.entities);
  const onCrypt = !!(mapName && mapName.map === "crypt");

  if (!onCrypt) {
    if (!props.layoutEdit) return null;
    return e(PanelShellDummy, {
      label: "Crypt progress",
      hint: "Boss / bat status on crypt map",
      accent: "#6a4a8a",
      rows: 2,
      style: CRYPT_PANEL_STYLE,
    });
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

    let onClick: (() => void) | undefined;
    if (props.setSelectedEntity && currentlySeeMtypes.has(mtype)) {
      const visibleMob = findVisibleMob(props.entities, mtype);
      if (visibleMob) {
        onClick = () => {
          setXTarget(visibleMob);
          props.setSelectedEntity!(String(visibleMob.id));
        };
      }
    }

    elems.push(
      e(CryptCard, {
        key: mtype,
        mtype,
        borderColor,
        levelComponent,
        status,
        lastSeenComponent,
        focusComponent,
        luckmComponent,
        onClick,
      }),
    );
  }

  return e(
    "div",
    {
      className: "comm-crypt-progress",
      style: {
        display: "flex",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "4px",
        fontSize: TYPE.chrome,
        ...PIXEL_TEXT,
      },
    },
    e(
      "div",
      {
        style: {
          padding: "5px 8px 0",
          whiteSpace: "nowrap",
          fontSize: TYPE.title,
          color: "#ccc",
          ...PIXEL_TEXT,
        },
      },
      "Crypt",
    ),
    e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          padding: "0 4px 4px",
        },
      },
      ...elems,
    ),
  );
}
