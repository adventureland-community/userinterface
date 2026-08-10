import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { formatTime, getPercent } from "../../lib/format";
import {
  difficultyBadge,
  distance,
  outOfRange,
} from "../../geometry/combat";
import { estimateTtk, getDps } from "../../meters/combatMeter";
import { aggroByTarget } from "../../queries/entities";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";

export type TargetFrameProps = {
  observing?: EntityLike | null;
  target?: EntityLike;
  entities?: EntityLike[];
  setSelectedEntity: (id: string) => void;
  /** When true and there is no target, render a layout placeholder. */
  layoutEdit?: boolean;
};

function targetTrailing(
  observing: EntityLike | null | undefined,
  target: EntityLike,
): string {
  const dps = getDps();
  const hpPct = getPercent((target.hp || 0) / (target.max_hp || 1), 1);
  const ttk = estimateTtk(target.hp, dps);
  const dist = distance(observing, target);
  const oor = outOfRange(observing, target);
  const diff = difficultyBadge(target);
  const parts: string[] = [hpPct];
  if (ttk != null) parts.push(`TTK ${formatTime(ttk)}`);
  if (dist != null) parts.push(`${Math.round(dist)}`);
  if (oor) parts.push("OOR");
  if (diff) parts.push(diff.label);
  return parts.join(" · ");
}

function threatOnTarget(
  entities: EntityLike[] | undefined,
  target: EntityLike,
  observingId: string | undefined,
): { count: number; youHaveAggro: boolean } {
  if (!entities) return { count: 0, youHaveAggro: false };
  const byTarget = aggroByTarget(entities);
  // Mobs targeting the watched character (overall threat).
  const onYou =
    observingId != null
      ? byTarget[observingId] || []
      : [];
  const youHaveAggro =
    !!observingId &&
    target.type === "monster" &&
    target.target != null &&
    String(target.target) === String(observingId);
  return { count: onYou.length, youHaveAggro };
}

/**
 * Combat-target unit frame. Hidden in play when there is no target;
 * in layout edit mode shows a dummy so the panel can be positioned.
 * Source unit is observing (characterui) or spectator focus.
 */
export function TargetFrame(props: TargetFrameProps): any {
  const { observing, target, layoutEdit, entities } = props;
  const obsId =
    observing && observing.id != null ? String(observing.id) : undefined;

  if (target) {
    const threat = threatOnTarget(entities, target, obsId);
    const spark =
      threat.youHaveAggro || threat.count > 0 ? threat.count || 1 : 0;
    return e(ObservedUnit, {
      key: `tgt-${String(target.id)}`,
      entity: target,
      hpColor: classColors[target.ctype || ""] || "red",
      fontSize: "21px",
      trailing: targetTrailing(observing, target),
      threatCount: spark,
      onSelect: (id: string) => {
        setXTarget(target);
        props.setSelectedEntity(id);
      },
    });
  }

  if (layoutEdit) {
    return e(FrameDummy, {
      label: "Target",
      sampleName: "Sample Target",
      hpColor: "#6a3a3a",
    });
  }

  return null;
}
