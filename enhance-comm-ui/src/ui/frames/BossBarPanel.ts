import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { getPercent } from "../../lib/format";
import { activeBosses } from "../../queries/entities";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";

export type BossBarPanelProps = {
  entities: EntityLike[];
  observing?: EntityLike | null;
  setSelectedEntity: (id: string) => void;
  /** When true and no bosses are active, render sample rows for layout edit. */
  layoutEdit?: boolean;
};

function bossThreat(entity: EntityLike, observingId?: string): number {
  if (!observingId || entity.type !== "monster") return 0;
  if (entity.target != null && String(entity.target) === observingId) return 1;
  return 0;
}

const STACK_STYLE: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  width: "100%",
};

/**
 * Dedicated multi-boss HP bar stack. Auto-hides when empty in play mode;
 * shows sample rows in layout edit so the panel can be positioned.
 */
export function BossBarPanel(props: BossBarPanelProps): any {
  const bosses = activeBosses(props.entities);
  const obsId =
    props.observing && props.observing.id != null
      ? String(props.observing.id)
      : undefined;

  if (!bosses.length) {
    if (!props.layoutEdit) return null;
    return e(
      "div",
      { style: STACK_STYLE },
      e(FrameDummy, {
        label: "Boss",
        sampleName: "Cooperative Boss",
        hpColor: "#8a2a2a",
      }),
      e(FrameDummy, {
        label: "Boss",
        sampleName: "Crypt Boss",
        hpColor: "#6a2a6a",
      }),
    );
  }

  return e(
    "div",
    { style: STACK_STYLE },
    ...bosses.map((boss) =>
      e(ObservedUnit, {
        key: `boss-${String(boss.id)}`,
        entity: boss,
        hpColor: "#c42a2a",
        fontSize: "22px",
        showMp: false,
        showEffects: false,
        trailing: getPercent((boss.hp || 0) / (boss.max_hp || 1), 1),
        threatCount: bossThreat(boss, obsId),
        onSelect: (id: string) => {
          setXTarget(boss);
          props.setSelectedEntity(id);
        },
      }),
    ),
  );
}
