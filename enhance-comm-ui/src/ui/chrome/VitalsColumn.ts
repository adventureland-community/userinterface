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

/** Stable HP track height from name font — fear/CC badges must not grow it. */
function hpBarHeightPx(nameStyle?: Record<string, any>): number {
  const fs = nameStyle && nameStyle.fontSize;
  let px = 21;
  if (typeof fs === "number" && Number.isFinite(fs) && fs > 0) {
    px = fs;
  } else if (typeof fs === "string") {
    const m = /^(\d+(?:\.\d+)?)px$/i.exec(fs.trim());
    if (m) px = parseFloat(m[1]);
  }
  // Matches prior padding+line box (~5+5 + 1.25×font) without room for a 26px fear icon.
  return Math.max(30, Math.round(px * 1.25 + 10));
}

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
  const barH = hpBarHeightPx(nameStyle);

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
          height: `${barH}px`,
          minHeight: `${barH}px`,
          maxHeight: `${barH}px`,
          boxSizing: "border-box",
          // Fear pill may paint slightly outside; do not clip to an L-shape.
          overflow: "visible",
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
              padding: "0 10px",
              whiteSpace: "nowrap",
              overflow: "visible",
              position: "relative",
              textShadow: "none",
              fontWeight: "normal",
              cursor: onClick ? "pointer" : undefined,
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
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
