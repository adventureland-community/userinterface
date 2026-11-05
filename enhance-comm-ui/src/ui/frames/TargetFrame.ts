import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { formatTime, getPercent } from "../../lib/format";
import { difficultyBadge, distance, outOfRange } from "../../geometry/combat";
import { estimateTtk, getDps } from "../../meters/combatMeter";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";

export type TargetFrameProps = {
  observing?: EntityLike | null;
  target?: EntityLike;
  /** Monsters targeting the framed entity when it is a player; else []. */
  aggroMobs?: EntityLike[];
  setSelectedEntity: (id: string) => void;
  /** When true and there is no target, render a layout placeholder. */
  layoutEdit?: boolean;
  /** Phone Players page — denser type / icons. */
  compact?: boolean;
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

/**
 * Combat-target unit frame. Only binds data for `target` — never the
 * player-frame entity's aggro list. Caller resolves `aggroMobs`.
 */
export function TargetFrame(props: TargetFrameProps): any {
  const { observing, target, layoutEdit, aggroMobs = [], compact } = props;
  const phone = compact === true;

  if (target) {
    const tid = String(target.id);
    return e(ObservedUnit, {
      key: `tgt-${tid}`,
      entity: target,
      hpColor: classColors[target.ctype || ""] || "red",
      fontSize: phone ? "16px" : "21px",
      trailing: targetTrailing(observing, target),
      // Match party/boss density — default EffectsRow 36px dominates the frame.
      effectsIconSize: phone ? 18 : 22,
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
