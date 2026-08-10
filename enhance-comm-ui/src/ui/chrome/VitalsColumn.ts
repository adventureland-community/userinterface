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
      },
    },
    e(
      "div",
      {
        style: {
          background: "black",
          position: "relative",
        },
      },
      e("div", {
        style: {
          position: "absolute",
          top: 0,
          bottom: 0,
          width: getPercent(hpPct, 1),
          background: hpColor,
        },
      }),
      e(
        "div",
        {
          style: Object.assign(
            {
              padding: "4px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              position: "relative",
              textShadow: "0 0 2px black",
              cursor: onClick ? "pointer" : undefined,
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
          { style: { background: "black" } },
          e("div", {
            style: {
              background: "blue",
              height: "4px",
              width: getPercent(mpPct, 1),
            },
          }),
        )
      : null,
  );
}
