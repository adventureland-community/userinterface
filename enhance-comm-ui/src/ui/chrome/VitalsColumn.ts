import { e } from "../../host/react";
import { getPercent } from "../../lib/format";
import type { HpThresholdMark } from "../../instance/monsterSpawns";
import { getHpBarGhosts } from "../../meters/pendingProjectiles";
import { HpThresholdMarkChip } from "./HpThresholdMarkChip";

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
  /** Entity id — enables in-flight damage/heal ghosts from projectiles. */
  entityId?: string | number | null;
  /** G.monsters hp-threshold spawn marks (boss bars). */
  hpThresholdMarks?: HpThresholdMark[];
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
    entityId,
    hpThresholdMarks,
  } = props;

  const max = maxHp > 0 ? maxHp : 1;
  const cur = Math.max(0, hp || 0);
  const hpPct = cur / max;
  const mpPct = maxMp && maxMp > 0 ? (mp || 0) / maxMp : 0;
  const barH = hpBarHeightPx(nameStyle);
  const marks = hpThresholdMarks || [];

  const ghosts = getHpBarGhosts(entityId);
  // Bar model: red = HP left, black = already lost.
  // In-flight damage on remaining HP; in-flight heal into missing. No recent —
  // landed hits already shortened the red fill.
  const MIN_GHOST_PCT = 0.02;
  const pendingOnFill = Math.min(cur, Math.max(0, ghosts.pendingDamage));
  let pendingDmgW = pendingOnFill > 0 ? pendingOnFill / max : 0;
  if (pendingOnFill > 0) {
    pendingDmgW = Math.max(pendingDmgW, Math.min(MIN_GHOST_PCT, hpPct));
  }
  const pendingStartPct = hpPct - pendingDmgW;

  const missing = Math.max(0, max - cur);
  const healAmt = Math.min(missing, Math.max(0, ghosts.pendingHeal));
  let healGhostW = healAmt > 0 ? healAmt / max : 0;
  if (healAmt > 0) {
    healGhostW = Math.max(healGhostW, Math.min(MIN_GHOST_PCT, 1 - hpPct));
  }

  return e(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
        pointerEvents: "none",
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
      pendingDmgW > 0.0005
        ? e("div", {
            className: "comm-hp-ghost is-pending-damage",
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: getPercent(pendingStartPct, 1),
              width: getPercent(pendingDmgW, 1),
              // Incoming — amber on the trailing edge of remaining HP.
              background: "rgba(255, 200, 50, 0.85)",
              boxShadow: "inset 1px 0 0 rgba(0,0,0,0.35)",
              pointerEvents: "none",
              zIndex: 0,
            },
          })
        : null,
      healGhostW > 0.0005
        ? e("div", {
            className: "comm-hp-ghost is-heal",
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: getPercent(hpPct, 1),
              width: getPercent(healGhostW, 1),
              // Into missing HP (black track).
              background: "rgba(70, 220, 120, 0.75)",
              boxShadow: "inset 1px 0 0 rgba(0,0,0,0.25)",
              pointerEvents: "none",
              zIndex: 0,
            },
          })
        : null,
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
              zIndex: 1,
              pointerEvents: onClick ? "auto" : "none",
            },
            nameStyle || {},
          ),
          onClick,
        },
        children,
      ),
      // After the name row so phase cooltips sit above the click/label layer.
      ...marks.map((m) =>
        e(HpThresholdMarkChip, { key: m.key, mark: m }),
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
