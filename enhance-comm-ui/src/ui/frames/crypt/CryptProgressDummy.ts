import { e } from "../../../host/react";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import {
  PANEL_SHELL,
  SECTION_LABEL_STYLE,
} from "../../../crypt/cryptCardStyles";
import { CryptCard } from "./CryptCard";

export function CryptProgressLayoutDummy(): any {
  return e(
    "div",
    {
      className: "comm-crypt-progress comm-crypt-progress-dummy",
      style: PANEL_SHELL,
    },
    e(
      "div",
      {
        style: {
          padding: "5px 8px 0",
          whiteSpace: "nowrap",
          fontSize: TYPE.title,
          color: "#ccc",
          ...PIXEL_TEXT,
        },
      },
      "Crypt",
    ),
    e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "0 4px 4px",
        },
      },
      e("div", { key: "bosses-label", style: SECTION_LABEL_STYLE }, "Bosses"),
      e(
        "div",
        {
          key: "bosses",
          style: { display: "flex", flexWrap: "wrap", gap: "4px" },
        },
        e(CryptCard, {
          key: "a1",
          mtype: "a1",
          borderColor: "yellow",
          levelComponent: " (10 lvl)",
          status: "Alive",
          lastSeenComponent: "We see!",
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
        e(CryptCard, {
          key: "a2",
          mtype: "a2",
          borderColor: "gray",
          levelComponent: "",
          status: "Died · #2 · 3m ago",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: "luckm: 0.125",
          dummy: true,
        }),
      ),
      e("div", { key: "bats-label", style: SECTION_LABEL_STYLE }, "Bats"),
      e(
        "div",
        {
          key: "bats",
          style: { display: "flex", flexWrap: "wrap", gap: "4px" },
        },
        e(CryptCard, {
          key: "vbat",
          mtype: "vbat",
          borderColor: "red",
          levelComponent: "",
          status: "Died: 1",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
        e(CryptCard, {
          key: "nerfedbat",
          mtype: "nerfedbat",
          borderColor: "gray",
          levelComponent: "",
          status: "Died: 0",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
      ),
    ),
  );
}
