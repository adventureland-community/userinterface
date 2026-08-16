import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { EffectIcon } from "./EffectIcon";
import {
  buildEntityEffects,
  stabilizeEffectOrder,
  type BuiltEffect,
} from "./effectsModel";

export type { BuiltEffect } from "./effectsModel";
export { buildEntityEffects, effectsKey, stabilizeEffectOrder } from "./effectsModel";
export { EffectIcon } from "./EffectIcon";

/** Match observe-hud default; item_container outer box is size + 2*3 padding. */
const ICON_SIZE = 36;

type EffectsRowProps = {
  entity: EntityLike;
  /** item_container icon size; default matches observe-hud player frame. */
  iconSize?: number;
  /** Compact party-chip spacing (tighter margin/gap under MP). */
  compact?: boolean;
  /**
   * When set (or defaulted in compact), hide overflow behind a +N chip
   * with a tooltip listing the rest — keeps party frames short.
   */
  maxVisible?: number;
};

export function EffectsRow(props: EffectsRowProps): any {
  const React = getReact();
  const lastEffectsRef = React.useRef([] as BuiltEffect[]);
  const emptySinceRef = React.useRef(0);
  const orderIdsRef = React.useRef([] as string[]);

  let effects = buildEntityEffects(props.entity);

  if (effects.length) {
    // First-seen order: existing icons keep their slot; new buffs append at the end.
    // (Sorting by id would insert mid-row when a new id sorts between neighbors.)
    const stabilized = stabilizeEffectOrder(effects, orderIdsRef.current);
    effects = stabilized.effects;
    orderIdsRef.current = stabilized.orderIds;
    lastEffectsRef.current = effects;
    emptySinceRef.current = 0;
  } else if (lastEffectsRef.current.length) {
    // Brief empty `s` during entity replace — keep last row instead of unmount flash.
    if (!emptySinceRef.current) emptySinceRef.current = Date.now();
    if (Date.now() - emptySinceRef.current < 500) {
      effects = lastEffectsRef.current;
    } else {
      lastEffectsRef.current = [];
      orderIdsRef.current = [];
    }
  }

  if (!effects.length) return null;

  const entityId = String(props.entity.id);
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : ICON_SIZE;
  const compact = !!props.compact;
  const gap = compact ? "3px" : "6px";
  const marginTop = compact ? "3px" : "6px";
  const padBottom = compact ? "2px" : "4px";
  const minHeight = iconSize + (compact ? 8 : 14) + 16;
  const maxVisible =
    typeof props.maxVisible === "number" ? props.maxVisible : compact ? 4 : 0;
  const overflow =
    maxVisible > 0 && effects.length > maxVisible
      ? effects.length - maxVisible
      : 0;
  const shown = overflow > 0 ? effects.slice(0, maxVisible) : effects;
  const hidden = overflow > 0 ? effects.slice(maxVisible) : [];
  const overflowTitle = hidden
    .map((ef) => {
      const label = ef.name || ef.id;
      const kind =
        ef.type === "skill" ? "skill" : ef.debuff ? "debuff" : "buff";
      return `${label} (${kind})`;
    })
    .join("\n");

  return e(
    "div",
    {
      // Do NOT key by effects list — that remounts every icon when one buff
      // is added/removed. EffectIcon keys already identity each buff.
      className: "comm-fx-row" + (compact ? " is-compact" : ""),
      "data-ecu-tour": "buff-icons",
      style: {
        display: "flex",
        flexDirection: "row",
        marginTop,
        gap,
        flexWrap: compact && maxVisible > 0 ? "nowrap" : "wrap",
        alignItems: "flex-start",
        width: "100%",
        minHeight,
        paddingBottom: padBottom,
        boxSizing: "border-box",
        pointerEvents: "auto",
        overflow: compact && maxVisible > 0 ? "hidden" : "visible",
      },
    },
    ...shown.map((ef) => {
      const hostClass = `comm-fx-${entityId}-${ef.id}`.replace(
        /[^a-zA-Z0-9_\-]/g,
        "_",
      );
      return e(EffectIcon, {
        key: `${entityId}-${ef.id}`,
        effect: ef,
        hostClass,
        entity: props.entity,
        iconSize,
      });
    }),
    overflow > 0
      ? e(
          "div",
          {
            key: `${entityId}-overflow`,
            className: "comm-fx-overflow",
            title: overflowTitle,
            style: {
              flex: "0 0 auto",
              minWidth: `${Math.max(22, iconSize - 4)}px`,
              height: `${iconSize}px`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid #555",
              color: "#ccc",
              fontSize: compact ? TYPE.badge : TYPE.secondary,
              lineHeight: 1,
              ...PIXEL_TEXT,
              cursor: "default",
              boxSizing: "border-box",
            },
          },
          `+${overflow}`,
        )
      : null,
  );
}
