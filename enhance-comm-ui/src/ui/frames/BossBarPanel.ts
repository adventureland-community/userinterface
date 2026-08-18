import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { getPercent } from "../../lib/format";
import { activeBosses, findEntity } from "../../queries/entities";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";
import { buildHpThresholdMarks } from "../../instance/monsterSpawns";

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
function sortBosses(bosses: EntityLike[], observingId?: string): EntityLike[] {
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

function aggroName(boss: EntityLike, entities: EntityLike[]): string | null {
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
 * Multi-boss HP stack: name, aggro, HP%, live effects, HP-threshold marks.
 * Mechanic chips live on instance cards; ability CDs on the timeline.
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
        showMp: false,
        showEffectsPlaceholder: true,
        showAggroInBar: true,
      }),
    );
  }

  const rows: any[] = [];
  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    const onMe = bossThreat(boss, obsId) > 0;
    const aggro = aggroName(boss, props.entities);
    const ratio = hpRatio(boss);
    const pct = getPercent(ratio, 1);
    const aggroLabel = onMe
      ? "Aggro · you"
      : aggro
        ? `Aggro · ${aggro}`
        : "Aggro · —";
    const mtype = typeof boss.mtype === "string" ? boss.mtype : "";
    const marks = mtype ? buildHpThresholdMarks(mtype, ratio) : [];
    rows.push(
      e(
        "div",
        {
          key: `boss-${String(boss.id)}`,
          style: {
            display: "flex",
            flexDirection: "column",
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
          showEffects: true,
          effectsCompact: true,
          effectsIconSize: 22,
          effectsMaxVisible: 0,
          trailing: pct,
          aggroLabel,
          aggroHot: onMe,
          hpThresholdMarks: marks.length ? marks : undefined,
          onSelect: (id: string) => {
            setXTarget(boss);
            props.setSelectedEntity(id);
          },
        }),
      ),
    );
  }

  return e("div", { style: STACK_STYLE }, ...rows);
}
