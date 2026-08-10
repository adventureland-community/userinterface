import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { ObservedUnit } from "../chrome/ObservedUnit";
import { FrameDummy } from "../chrome/FrameDummy";
import type { EntityLike } from "../../host/globals";

/** Shared chrome size for playerFrame + targetFrame PositionedPanels. */
export const UNIT_FRAME_STYLE: Record<string, any> = {
  width: "min(360px, 45vw)",
  minWidth: "280px",
  // Effects overlay hangs below vitals — do not clip, and do not pad a
  // permanent empty strip (that would shift bc-anchored HP bars upward).
  overflow: "visible",
  boxSizing: "border-box",
};

export type PlayerFrameProps = {
  /** Observed character, or spectator focus unit when not observing. */
  observing?: EntityLike | null;
  setSelectedEntity: (id: string) => void;
  /** When true and nothing to show, render a layout placeholder. */
  layoutEdit?: boolean;
};

export function PlayerFrame(props: PlayerFrameProps): any {
  const { observing, layoutEdit } = props;

  if (observing) {
    return e(ObservedUnit, {
      key: `obs-${String(observing.id)}`,
      entity: observing,
      hpColor: classColors[observing.ctype || ""] || "#666",
      fontSize: "21px",
      effectsOverlay: true,
      onSelect: (id: string) => {
        setXTarget(observing);
        props.setSelectedEntity(id);
      },
    });
  }

  if (layoutEdit) {
    return e(FrameDummy, {
      label: "Player",
      hpColor: "#5a4a6a",
    });
  }

  // No observe / no spectator focus — party chips or world click set focus.
  return null;
}
