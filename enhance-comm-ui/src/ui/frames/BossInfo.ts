import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { coopBosses } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";

export type BossInfoProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string) => void;
};

export function BossInfo(props: BossInfoProps): any {
  const bosses = coopBosses(props.entities);

  return e(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "4px", width: "100%" } },
    ...bosses.map((boss) =>
      e(ObservedUnit, {
        key: boss.id,
        entity: boss,
        hpColor: "red",
        fontSize: "24px",
        onSelect: (id: string) => {
          setXTarget(boss);
          props.setSelectedEntity(id);
        },
      }),
    ),
  );
}
