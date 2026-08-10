import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { VitalsColumn } from "./VitalsColumn";
import type { EntityLike } from "../../host/globals";

export type ObservedUnitProps = {
  entity: EntityLike;
  hpColor?: string;
  fontSize?: string | number;
  trailing?: any;
  onSelect?: (id: string) => void;
  showEffects?: boolean;
  showMp?: boolean;
};

export function ObservedUnit(props: ObservedUnitProps): any {
  const {
    entity,
    hpColor,
    fontSize,
    trailing,
    onSelect,
    showEffects = true,
    showMp = true,
  } = props;

  const name =
    `${entity.level ?? 1} ${entity.name || entity.id}` +
    (entity.type === "monster" ? ` #${entity.id}` : "");

  const label = trailing
    ? e(
        "span",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            width: "100%",
          },
        },
        e("span", {}, name),
        e(
          "span",
          { style: { fontSize: "14px", opacity: 0.95, flexShrink: 0 } },
          trailing,
        ),
      )
    : name;

  return e(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
      },
    },
    e(
      VitalsColumn,
      {
        hp: entity.hp || 0,
        maxHp: entity.max_hp || 1,
        mp: entity.mp,
        maxMp: entity.max_mp,
        hpColor,
        showMp,
        nameStyle: fontSize != null ? { fontSize } : undefined,
        onClick: onSelect ? () => onSelect(entity.id) : undefined,
      },
      label,
    ),
    showEffects ? e(EffectsRow, { entity }) : null,
  );
}
