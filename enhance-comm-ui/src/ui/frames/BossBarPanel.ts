import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { getPercent } from "../../lib/format";
import {
  activeBosses,
  findEntity,
} from "../../queries/entities";
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

function hpRatio(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return (entity.hp || 0) / max;
}

/** Prefer bosses on the observer, then lowest HP%. */
function sortBosses(
  bosses: EntityLike[],
  observingId?: string,
): EntityLike[] {
  const copy = bosses.slice();
  copy.sort((a, b) => {
    const aOnMe = bossThreat(a, observingId);
    const bOnMe = bossThreat(b, observingId);
    if (aOnMe !== bOnMe) return bOnMe - aOnMe;
    const hpCmp = hpRatio(a) - hpRatio(b);
    if (Math.abs(hpCmp) > 0.0001) return hpCmp;
    return String(a.id).localeCompare(String(b.id));
  });
  return copy;
}

function aggroName(
  boss: EntityLike,
  entities: EntityLike[],
): string | null {
  if (boss.target == null || boss.target === "") return null;
  const target = findEntity(entities, boss.target);
  if (target) return target.name || String(target.id);
  return String(boss.target);
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
 * Sorted: targeting observer first, then lowest HP%. Shows aggro chip.
 */
export function BossBarPanel(props: BossBarPanelProps): any {
  const bosses = sortBosses(
    activeBosses(props.entities),
    props.observing && props.observing.id != null
      ? String(props.observing.id)
      : undefined,
  );
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
    ...bosses.map((boss) => {
      const onMe = bossThreat(boss, obsId) > 0;
      const aggro = aggroName(boss, props.entities);
      const pct = getPercent(hpRatio(boss), 1);
      return e(
        "div",
        {
          key: `boss-${String(boss.id)}`,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            cursor: "pointer",
            outline: onMe ? "1px solid rgba(224,85,85,0.55)" : undefined,
            outlineOffset: "1px",
          },
          title: "Click to target",
          onClick: () => {
            setXTarget(boss);
            props.setSelectedEntity(String(boss.id));
          },
        },
        e(ObservedUnit, {
          entity: boss,
          hpColor: onMe ? "#d43838" : "#c42a2a",
          fontSize: "22px",
          showMp: false,
          showEffects: false,
          trailing: pct,
          threatCount: onMe ? 1 : 0,
          onSelect: (id: string) => {
            setXTarget(boss);
            props.setSelectedEntity(id);
          },
        }),
        aggro
          ? e(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: "6px",
                  padding: "2px 8px",
                  marginLeft: "2px",
                  background: onMe
                    ? "rgba(138,30,30,0.85)"
                    : "rgba(30,30,30,0.9)",
                  border: onMe ? "1px solid #e05555" : "1px solid #555",
                  color: onMe ? "#ffd0d0" : "#bbb",
                  fontSize: "13px",
                  lineHeight: "1.2",
                  fontWeight: "normal",
                  textShadow: "none",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
                title: onMe ? "Aggro on you" : `Aggro: ${aggro}`,
              },
              onMe ? "Aggro · you" : `Aggro · ${aggro}`,
            )
          : e(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  padding: "2px 8px",
                  marginLeft: "2px",
                  background: "rgba(20,20,20,0.8)",
                  border: "1px solid #444",
                  color: "#888",
                  fontSize: "13px",
                  fontWeight: "normal",
                  textShadow: "none",
                },
              },
              "Aggro · —",
            ),
      );
    }),
  );
}
