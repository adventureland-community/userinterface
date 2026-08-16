import { e } from "../../host/react";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { PANEL_SHELL, SECTION_LABEL_STYLE } from "../../crypt/cryptCardStyles";
import {
  buildCryptCardProps,
  CRYPT_BAT_MTYPES,
  type CryptProgressProps,
} from "../../crypt/cryptCardModel";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  updateFromEntities,
} from "../../crypt/tracker";
import { getMapData } from "./MapInfo";
import { CryptCard } from "./crypt/CryptCard";
import { CryptProgressLayoutDummy } from "./crypt/CryptProgressDummy";

export type { CryptProgressProps };

function renderMobSection(
  label: string,
  mtypes: string[],
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
): any[] {
  const cards: any[] = [];
  for (let i = 0; i < mtypes.length; i++) {
    cards.push(
      e(
        CryptCard,
        buildCryptCardProps(
          mtypes[i],
          props,
          currentlySeeMtypes,
          aggroedMtypes,
          instanceData,
        ),
      ),
    );
  }
  return [
    e("div", { key: `${label}-label`, style: SECTION_LABEL_STYLE }, label),
    e(
      "div",
      {
        key: label,
        style: { display: "flex", flexWrap: "wrap", gap: "4px" },
      },
      ...cards,
    ),
  ];
}

export function CryptProgress(props: CryptProgressProps): any {
  const mapName = getMapData(props.entities);
  const onCrypt = !!(mapName && mapName.map === "crypt");
  if (!onCrypt) {
    if (!props.layoutEdit) return null;
    return e(CryptProgressLayoutDummy);
  }
  updateFromEntities(mapName.in, props.entities);
  const currentlySeeMtypes = new Set<string>();
  const aggroedMtypes = new Set<string>();
  for (let i = 0; i < props.entities.length; i++) {
    const entity = props.entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (
      !entity.mtype ||
      CRYPT_IMPORTANT_MOBS_MTYPES.indexOf(entity.mtype) < 0
    ) {
      continue;
    }
    currentlySeeMtypes.add(entity.mtype);
    if (entity.target) aggroedMtypes.add(entity.mtype);
  }
  const instanceData = getInstanceData(mapName.in);
  return e(
    "div",
    {
      className: "comm-crypt-progress",
      style: PANEL_SHELL,
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
          flexDirection: "column",
          gap: "4px",
          padding: "0 4px 4px",
        },
      },
      ...renderMobSection(
        "Bosses",
        CRYPT_BOSSES_MTYPES,
        props,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
      ),
      ...renderMobSection(
        "Bats",
        CRYPT_BAT_MTYPES,
        props,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
      ),
    ),
  );
}
