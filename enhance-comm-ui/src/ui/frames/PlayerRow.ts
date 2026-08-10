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
import { ObservedUnit } from "../chrome/ObservedUnit";
import type { EntityLike } from "../../host/globals";

export type PlayerRowProps = {
  observing?: EntityLike | null;
  target?: EntityLike;
  setSelectedEntity: (id: string) => void;
};

export function PlayerRow(props: PlayerRowProps): any {
  const { observing, target } = props;
  const dps = getDps();

  let targetTrailing: any = null;
  if (target) {
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
    targetTrailing = parts.join(" · ");
  }

  return e(
    "div",
    {
      style: {
        display: "flex",
        gap: "16px",
      },
    },
    e(
      "div",
      { style: { width: "55%" } },
      observing
        ? e(ObservedUnit, {
            entity: observing,
            hpColor: classColors[observing.ctype || ""] || "#666",
            fontSize: "24px",
            onSelect: (id: string) => {
              setXTarget(observing);
              props.setSelectedEntity(id);
            },
          })
        : undefined,
    ),
    e(
      "div",
      { style: { width: "45%" } },
      target
        ? e(ObservedUnit, {
            entity: target,
            hpColor: classColors[target.ctype || ""] || "red",
            fontSize: "24px",
            trailing: targetTrailing,
            onSelect: (id: string) => {
              setXTarget(target);
              props.setSelectedEntity(id);
            },
          })
        : undefined,
    ),
  );
}
