import { e } from "../../host/react";
import { getPercent } from "../../lib/format";

export type VitalsColumnProps = {
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  hpColor?: string;
  showMp?: boolean;
  children?: any;
  onClick?: () => void;
  nameStyle?: any;
};

export function VitalsColumn(props: VitalsColumnProps): any {
  const {
    hp,
    maxHp,
    mp,
    maxMp,
    hpColor = "red",
    showMp = true,
    children,
    onClick,
    nameStyle,
  } = props;

  const hpPct = maxHp > 0 ? hp / maxHp : 0;
  const mpPct = maxMp && maxMp > 0 ? (mp || 0) / maxMp : 0;

  return e(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
      },
    },
    e(
      "div",
      {
        style: {
          background: "black",
          position: "relative",
          width: "100%",
          minHeight: "30px",
          boxSizing: "border-box",
        },
      },
      e("div", {
        style: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: getPercent(hpPct, 1),
          background: hpColor,
        },
      }),
      e(
        "div",
        {
          style: Object.assign(
            {
              padding: "5px 10px",
              whiteSpace: "nowrap",
              // Ellipsis lives on the name span; visible overflow so fear
              // border/background is not clipped to an L-shape.
              overflow: "visible",
              position: "relative",
              textShadow: "none",
              fontWeight: "normal",
              cursor: onClick ? "pointer" : undefined,
              width: "100%",
              boxSizing: "border-box",
              lineHeight: "1.25",
            },
            nameStyle || {},
          ),
          onClick,
        },
        children,
      ),
    ),
    showMp
      ? e(
          "div",
          {
            style: {
              background: "black",
              width: "100%",
              height: "5px",
              boxSizing: "border-box",
            },
          },
          e("div", {
            style: {
              background: "#3a5fd4",
              height: "100%",
              width: getPercent(mpPct, 1),
            },
          }),
        )
      : null,
  );
}
