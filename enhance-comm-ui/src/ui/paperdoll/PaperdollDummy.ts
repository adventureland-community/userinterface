import { e } from "../../host/react";
import { PAPERDOLL_FRAME_WIDTH } from "../../lib/frameSizes";
import { LayoutPlaceholder } from "../chrome/LayoutPlaceholder";
import { Stat } from "./Stat";
import { VitalsBar } from "./VitalsBar";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

/** Matches GearGrid SLOT_SIZE + AL item_container border/space (~46 content). */
const DUMMY_SLOT = 46;

export const PAPERDOLL_SHELL: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  margin: 0,
  background: "rgba(0,0,0,0.92)",
  boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
  width: PAPERDOLL_FRAME_WIDTH,
  minWidth: PAPERDOLL_FRAME_WIDTH,
  maxWidth: "340px",
  boxSizing: "border-box",
  overflow: "visible",
  pointerEvents: "none",
};

export const PAPERDOLL_BODY: Record<string, any> = {
  padding: "6px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  pointerEvents: "auto",
};

export const PAPERDOLL_VITALS: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

export const PAPERDOLL_STATS_GRID: Record<string, any> = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1px 8px",
  padding: "4px 6px",
  background: "#0d0d0d",
  border: "1px solid #2a2a2a",
};

/** Layout-edit silhouette: vitals + stats + 4×4 gear at real footprint. */
export function PaperdollDummy(): any {
  const slots: any[] = [];
  for (let r = 0; r < 4; r++) {
    const cells: any[] = [];
    for (let c = 0; c < 4; c++) {
      cells.push(
        e("div", {
          key: `s${r}-${c}`,
          style: {
            width: DUMMY_SLOT,
            height: DUMMY_SLOT,
            background: "#0a0a0a",
            border: "2px solid #292929",
            boxSizing: "border-box",
          },
        }),
      );
    }
    slots.push(
      e(
        "div",
        {
          key: `r${r}`,
          style: {
            display: "flex",
            flexDirection: "row",
            gap: "2px",
          },
        },
        ...cells,
      ),
    );
  }

  return e(
    LayoutPlaceholder,
    {
      className: "comm-paperdoll comm-paperdoll-dummy",
      label: "Paperdoll",
      style: Object.assign({}, PAPERDOLL_SHELL, {
        border: "2px dashed #555",
        opacity: 0.85,
      }),
    },
    e(
      "div",
      { style: PAPERDOLL_BODY },
      e(
        "div",
        {
          style: {
            fontSize: TYPE.micro,
            color: "#666",
            ...PIXEL_TEXT,
          },
        },
        "Select a unit to preview gear",
      ),
      e(
        "div",
        { style: PAPERDOLL_VITALS },
        e(VitalsBar, {
          label: "HP",
          current: 0,
          max: 1,
          color: "#444",
        }),
        e(VitalsBar, {
          label: "MP",
          current: 0,
          max: 1,
          color: "#2a3a6a",
        }),
        e(VitalsBar, {
          label: "XP",
          current: 0,
          max: 1,
          color: "#2a4a22",
        }),
      ),
      e(
        "div",
        {
          style: Object.assign({}, PAPERDOLL_STATS_GRID, {
            color: "#555",
          }),
        },
        e(Stat, { label: "ATK", value: "—" }),
        e(Stat, { label: "Armor", value: "—" }),
        e(Stat, { label: "Res", value: "—" }),
        e(Stat, { label: "Speed", value: "—" }),
        e(Stat, { label: "🍀 Luck", value: "—" }),
        e(Stat, { label: "Gold", value: "—" }),
      ),
      e(
        "div",
        {
          style: {
            borderTop: "1px solid #2a2a2a",
            paddingTop: "6px",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.micro,
              color: "#555",
              marginBottom: "4px",
              letterSpacing: "0.04em",
              ...PIXEL_TEXT,
            },
          },
          "GEAR",
        ),
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              width: "fit-content",
            },
          },
          ...slots,
        ),
      ),
    ),
  );
}
