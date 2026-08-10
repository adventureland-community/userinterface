import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { getPercent } from "../../lib/format";
import { findEntity } from "../../queries/entities";
import { GearGrid } from "../chrome/GearGrid";
import type { EntityLike } from "../../host/globals";

export type EntityInfoProps = {
  entities: EntityLike[];
  selectedEntity?: string;
};

export function EntityInfo(props: EntityInfoProps): any {
  const entity = findEntity(props.entities, props.selectedEntity);
  if (!entity) return null;

  return e(
    "span",
    {
      style: {
        display: "inline-flex",
        overflow: "auto",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "2px",
        padding: "4px",
        maxHeight: "280px",
      },
      onClick: () => setXTarget(entity),
    },
    e(
      "div",
      {},
      `${entity.name}${entity?.mtype ? ` (${entity.mtype})` : ""}, lvl ${entity.level ?? 1}${entity.type === "monster" ? ` #${entity.id}` : ""}`,
    ),
    entity.ctype ? e("div", {}, `Class: ${entity.ctype}`) : undefined,
    entity.age ? e("div", {}, `Age: ${entity.age}`) : undefined,
    entity.party ? e("div", {}, `Party: ${entity.party}`) : undefined,
    e("br"),
    e("div", {}, `HP: ${entity.hp} / ${entity.max_hp}`),
    e("div", {}, `MP: ${entity.mp} / ${entity.max_mp}`),
    entity.heal ? e("div", {}, `Heal: ${entity.heal}`) : undefined,
    entity.attack
      ? e(
          "div",
          {},
          `Attack: ${entity.attack} ${entity?.damage_type ?? ""}`,
        )
      : undefined,
    e("div", {}, `Armor: ${entity.armor ?? 0}`),
    e("div", {}, `Resistance: ${entity.resistance ?? 0}`),
    entity.evasion
      ? e("div", {}, `Evasion: ${getPercent(entity.evasion / 100, 2)}`)
      : undefined,
    entity.reflection
      ? e(
          "div",
          {},
          `Reflection: ${getPercent(entity.reflection / 100, 2)}`,
        )
      : undefined,
    e("br"),
    entity.speed != null
      ? e("div", {}, `Speed: ${entity.speed.toFixed(2)}`)
      : undefined,
    entity.frequency != null
      ? e("div", {}, `Frequency: ${entity.frequency.toFixed(2)}`)
      : undefined,
    entity.slots ? e(GearGrid, { entity }) : null,
  );
}
