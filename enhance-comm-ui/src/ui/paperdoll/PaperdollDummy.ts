import { e } from "../../host/react";
import { PAPERDOLL_FRAME_WIDTH } from "../../lib/frameSizes";
import { LayoutPlaceholder } from "../chrome/LayoutPlaceholder";
import { Stat } from "./Stat";
import { VitalsBar } from "./VitalsBar";
import { TYPE } from "../../lib/typeScale";

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
      {
        style: {
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        },
      },
      e(
        "div",
        { style: { fontSize: TYPE.secondary, color: "#666" } },
        "Select a unit to preview gear",
      ),
      e(
        "div",
        {},
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
      ),
      e(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 14px",
            padding: "8px",
            background: "#0d0d0d",
            border: "1px solid #2a2a2a",
            color: "#555",
            fontSize: TYPE.body,
            lineHeight: "20px",
          },
        },
        e(Stat, { label: "ATK", value: "—" }),
        e(Stat, { label: "Armor", value: "—" }),
        e(Stat, { label: "Res", value: "—" }),
        e(Stat, { label: "Speed", value: "—" }),
      ),
      e(
        "div",
        {
          style: {
            borderTop: "1px solid #2a2a2a",
            paddingTop: "8px",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.body,
              color: "#555",
              marginBottom: "6px",
              letterSpacing: "0.04em",
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
