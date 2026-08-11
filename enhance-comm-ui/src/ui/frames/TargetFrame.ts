import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { formatTime, getPercent } from "../../lib/format";
import { difficultyBadge, distance, outOfRange } from "../../geometry/combat";
import { estimateTtk, getDps } from "../../meters/combatMeter";
import { aggroOn, isFocusablePlayer } from "../../queries/entities";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";

export type TargetFrameProps = {
  observing?: EntityLike | null;
  target?: EntityLike;
  /** Shared aggro index from CommUI (string target ids). */
  byTarget?: Record<string, EntityLike[]>;
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
  byTarget: Record<string, EntityLike[]>,
  target: EntityLike,
  observingId: string | undefined,
): { count: number; youHaveAggro: boolean } {
  const onYou = aggroOn(byTarget, observingId);
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
  const { observing, target, layoutEdit, byTarget = {} } = props;
  const obsId =
    observing && observing.id != null ? String(observing.id) : undefined;

  if (target) {
    const threat = threatOnTarget(byTarget, target, obsId);
    const spark =
      threat.youHaveAggro || threat.count > 0 ? threat.count || 1 : 0;
    const tid = String(target.id);
    const aggroMobs = isFocusablePlayer(target) ? aggroOn(byTarget, tid) : [];
    return e(ObservedUnit, {
      key: `tgt-${tid}`,
      entity: target,
      hpColor: classColors[target.ctype || ""] || "red",
      fontSize: "21px",
      trailing: targetTrailing(observing, target),
      threatCount: spark,
      effectsOverlay: true,
      aggroMobs,
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
