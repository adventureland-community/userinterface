import { e } from "../../../host/react";

export type LayoutEditChromeProps = {
  onReset: () => void;
  onDone: () => void;
};

export function LayoutEditChrome(props: LayoutEditChromeProps): any {
  return e(
    "div",
    {
      style: {
        position: "absolute",
        left: "50%",
        top: "8px",
        transform: "translateX(-50%)",
        zIndex: 50,
        pointerEvents: "auto",
        display: "flex",
        gap: "8px",
        alignItems: "center",
        padding: "6px 12px",
        background: "rgba(30,28,10,0.95)",
        border: "1px solid #aa8",
        color: "#ffe08a",
        fontSize: "14px",
      },
    },
    "Layout edit — drag snaps to edges · Ctrl+Shift+L · Show restores",
    e(
      "button",
      {
        type: "button",
        onClick: props.onReset,
        style: {
          cursor: "pointer",
          fontSize: "13px",
          padding: "3px 10px",
          border: "1px solid #886",
          background: "#222",
          color: "#eee",
        },
      },
      "Reset positions",
    ),
    e(
      "button",
      {
        type: "button",
        onClick: props.onDone,
        style: {
          cursor: "pointer",
          fontSize: "13px",
          padding: "3px 10px",
          border: "1px solid #886",
          background: "#333",
          color: "#ffe08a",
        },
      },
      "Done",
    ),
  );
}
