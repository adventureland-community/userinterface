import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { AGGRO_BADGE, PIXEL_TEXT } from "../../lib/typeScale";
import {
  aggroCooltipHandlers,
  aggroCooltipHtml,
  aggroCooltipKey,
  dismissAggroCooltip,
} from "./aggroCooltip";

export type AggroSparkProps = {
  count: number;
  className?: string;
  /** Mobs targeting this unit — enables a rich cooltip list. */
  mobs?: EntityLike[];
  /** Framed entity — courage pools for aggro/capacity X/Y in the tip. */
  owner?: EntityLike | null;
  /** Framed entity id (cooltip key) + display name. */
  ownerId?: string;
  ownerName?: string;
};

/** Corner count of mobs targeting the framed entity. */
export function AggroSpark(props: AggroSparkProps): any {
  const React = getReact();
  const { count, className, mobs = [], owner, ownerId, ownerName } = props;
  if (!(count > 0)) return null;

  const tipKey = aggroCooltipKey(ownerId != null ? String(ownerId) : "anon");
  const tipHandlers = aggroCooltipHandlers(tipKey, () =>
    aggroCooltipHtml({
      ownerName: ownerName || (ownerId != null ? String(ownerId) : undefined),
      owner: owner || null,
      mobs: mobs.length ? mobs : [],
    }),
  );

  React.useEffect(() => {
    return () => {
      dismissAggroCooltip(tipKey);
    };
  }, [tipKey]);

  return e(
    "div",
    {
      className: className || "comm-threat-spark",
      "data-ecu-aggro": String(count),
      onMouseEnter: tipHandlers.onMouseEnter,
      onMouseMove: tipHandlers.onMouseMove,
      onMouseLeave: tipHandlers.onMouseLeave,
      style: {
        position: "absolute",
        // Keep inside the unit box — negative inset expands scrollable overflow
        // on ancestors with overflow:auto and shows scrollbars on unit frames.
        top: 0,
        right: 0,
        zIndex: 4,
        minWidth: AGGRO_BADGE.minWidth,
        height: AGGRO_BADGE.height,
        padding: `0 ${AGGRO_BADGE.padX}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#8a1e1e",
        border: "1px solid #e05555",
        color: "#ffd0d0",
        fontSize: AGGRO_BADGE.fontSize,
        lineHeight: 1,
        ...PIXEL_TEXT,
        cursor: "help",
        pointerEvents: "auto",
      },
    },
    String(count),
  );
}
