import { e } from "../../host/react";
import { AGGRO_BADGE, PIXEL_TEXT } from "../../lib/typeScale";

export type AggroSparkProps = {
  count: number;
  className?: string;
};

/** Corner count of mobs targeting the framed entity. */
export function AggroSpark(props: AggroSparkProps): any {
  const { count, className } = props;
  if (!(count > 0)) return null;
  return e(
    "div",
    {
      className: className || "comm-threat-spark",
      title: `Aggro: ${count} mob${count === 1 ? "" : "s"}`,
      "data-ecu-aggro": String(count),
      style: {
        position: "absolute",
        top: "-3px",
        right: "-3px",
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
        pointerEvents: "none",
      },
    },
    String(count),
  );
}
