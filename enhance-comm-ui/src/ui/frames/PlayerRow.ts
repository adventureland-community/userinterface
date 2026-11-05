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

/** Phone Players page — full-bleed stacked frames above the dock. */
export const UNIT_FRAME_STYLE_PHONE: Record<string, any> = {
  width: "min(360px, calc(100vw - 16px))",
  minWidth: 0,
  maxWidth: "calc(100vw - 16px)",
  overflow: "visible",
  boxSizing: "border-box",
};

export type PlayerFrameProps = {
  /** Observed character, or spectator focus unit when not observing. */
  observing?: EntityLike | null;
  /** Monsters targeting the framed player (`observing.id`). */
  aggroMobs?: EntityLike[];
  setSelectedEntity: (id: string) => void;
  /** When true and nothing to show, render a layout placeholder. */
  layoutEdit?: boolean;
  /** Phone Players page — denser type / icons. */
  compact?: boolean;
};

export function PlayerFrame(props: PlayerFrameProps): any {
  const { observing, aggroMobs = [], layoutEdit } = props;
  const phone = props.compact === true;

  if (observing) {
    return e(ObservedUnit, {
      key: `obs-${String(observing.id)}`,
      entity: observing,
      hpColor: classColors[observing.ctype || ""] || "#666",
      fontSize: phone ? "16px" : "21px",
      // Match party/boss density — default EffectsRow 36px dominates the frame.
      effectsIconSize: phone ? 18 : 22,
      effectsOverlay: true,
      aggroMobs,
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

  return null;
}
