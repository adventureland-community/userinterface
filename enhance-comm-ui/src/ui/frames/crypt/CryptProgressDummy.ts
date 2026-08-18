import { e } from "../../../host/react";
import { PANEL_SHELL } from "../../../crypt/cryptCardStyles";
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
        key: "content",
        className: "ecu-inst-body",
      },
      e("div", { key: "bosses-label", className: "ecu-inst-sec" }, "Bosses"),
      e(
        "div",
        { key: "bosses", className: "ecu-inst-grid" },
        e(CryptCard, {
          key: "a1",
          mtype: "a1",
          borderColor: "yellow",
          glance: "We see!",
          hoverLines: ["a1"],
          level: 10,
          dummy: true,
        }),
        e(CryptCard, {
          key: "a2",
          mtype: "a2",
          borderColor: "gray",
          glance: "Died · #2",
          hoverLines: ["a2", "Died · #2 · 3m ago", "luckm 0.125"],
          level: 12,
          faded: true,
          dummy: true,
        }),
      ),
      e("div", { key: "bats-label", className: "ecu-inst-sec" }, "Bats"),
      e(
        "div",
        { key: "bats", className: "ecu-inst-grid" },
        e(CryptCard, {
          key: "vbat",
          mtype: "vbat",
          borderColor: "red",
          glance: "Aggroed! · ×2",
          hoverLines: ["vbat"],
          level: 8,
          kills: 4,
          dummy: true,
        }),
        e(CryptCard, {
          key: "nerfedbat",
          mtype: "nerfedbat",
          borderColor: "gray",
          glance: "",
          hoverLines: ["nerfedbat"],
          kills: 3,
          faded: true,
          dummy: true,
        }),
      ),
    ),
  );
}
