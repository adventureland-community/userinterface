import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { uiInspectClick } from "../../host/uiInspect";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type InspectButtonProps = {
  entity: EntityLike;
  /** Party-chip / compact unit-frame density. */
  compact?: boolean;
  title?: string;
};

/** `{}` inspect — same JSON modal as in-game ui_inspect / show_json. */
export function InspectButton(props: InspectButtonProps): any {
  const compact = !!props.compact;
  return e(
    "button",
    {
      type: "button",
      className: "comm-inspect-btn" + (compact ? " is-compact" : ""),
      title: props.title || "Inspect JSON",
      "aria-label": "Inspect JSON",
      style: {
        flex: "0 0 auto",
        margin: compact ? "0 0 0 2px" : "0 4px 0 0",
        padding: "0 2px",
        border: "none",
        background: "transparent",
        color: "#9a9a9a",
        fontSize: compact ? TYPE.micro : TYPE.secondary,
        fontWeight: "normal",
        lineHeight: 1,
        cursor: "pointer",
        pointerEvents: "auto",
        textShadow: "1px 1px 0 #000",
        ...PIXEL_TEXT,
      },
      onClick: (ev: Event) => {
        uiInspectClick(ev, props.entity);
      },
      onMouseEnter: (ev: any) => {
        ev.currentTarget.style.color = "#cfcfcf";
      },
      onMouseLeave: (ev: any) => {
        ev.currentTarget.style.color = "#9a9a9a";
      },
    },
    "{}",
  );
}
