/**
 * Bottom-right control strip — layout, meters, add meter, intro tour, changelog.
 */

import { e } from "../../../host/react";
import { isTouchishProfile, type ViewportProfile } from "../../../lib/viewport";

export type CommControlStripProps = {
  layoutEdit: boolean;
  toggleLayoutEdit: () => void;
  metersHidden: boolean;
  setMetersHiddenPersist: (hidden: boolean) => void;
  onAddMeter: () => void;
  onReplayIntroTour: () => void;
  /** Open full What's New / changelog history (all entries). */
  onOpenChangelog: () => void;
  viewportProfile: ViewportProfile;
};

function stopPtr(ev: any) {
  if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
}

export function CommControlStrip(props: CommControlStripProps): any {
  const touchPad = isTouchishProfile(props.viewportProfile);
  const toggleBtnPad = touchPad ? "10px 16px" : "5px 12px";
  const toggleFont = touchPad ? "16px" : "14px";

  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        pointerEvents: "auto",
      },
    },
    e(
      "button",
      {
        type: "button",
        "data-ecu-tour": "btn-layout",
        title: "Toggle layout edit (Ctrl+Shift+L)",
        style: {
          cursor: "pointer",
          padding: toggleBtnPad,
          fontSize: toggleFont,
          minHeight: touchPad ? "40px" : undefined,
          border: props.layoutEdit ? "1px solid #ffe08a" : "1px solid #555",
          background: props.layoutEdit ? "#3a3510" : "#1a1a1a",
          color: props.layoutEdit ? "#ffe08a" : "#eee",
          textShadow: "none",
          fontWeight: "normal",
          pointerEvents: "auto",
          position: "relative",
          zIndex: 1,
        },
        onPointerDown: stopPtr,
        onClick: (ev: any) => {
          stopPtr(ev);
          props.toggleLayoutEdit();
        },
      },
      props.layoutEdit ? "Layout: ON" : "Layout",
    ),
    e(
      "button",
      {
        type: "button",
        "data-ecu-tour": "btn-meters",
        title: props.metersHidden ? "Show all meters" : "Hide all meters",
        style: {
          cursor: "pointer",
          padding: toggleBtnPad,
          fontSize: toggleFont,
          minHeight: touchPad ? "40px" : undefined,
          border: props.metersHidden ? "1px solid #886" : "1px solid #555",
          background: props.metersHidden ? "#2a1a1a" : "#1a1a1a",
          color: props.metersHidden ? "#c9a" : "#eee",
          textShadow: "none",
          fontWeight: "normal",
        },
        onPointerDown: stopPtr,
        onClick: () => props.setMetersHiddenPersist(!props.metersHidden),
      },
      props.metersHidden ? "Meters: OFF" : "Meters",
    ),
    e(
      "button",
      {
        type: "button",
        "data-ecu-tour": "btn-add-meter",
        title: "Add meter panel",
        style: {
          cursor: "pointer",
          padding: toggleBtnPad,
          fontSize: toggleFont,
          minHeight: touchPad ? "40px" : undefined,
          border: "1px solid #555",
          background: "#1a1a1a",
          color: "#eee",
          textShadow: "none",
          fontWeight: "normal",
        },
        onPointerDown: stopPtr,
        onClick: () => props.onAddMeter(),
      },
      "+ Meter",
    ),
    e(
      "button",
      {
        type: "button",
        title: "Replay intro spotlight tour",
        style: {
          cursor: "pointer",
          padding: toggleBtnPad,
          fontSize: toggleFont,
          minHeight: touchPad ? "40px" : undefined,
          border: "1px solid #555",
          background: "#1a1a1a",
          color: "#bbb",
          textShadow: "none",
          fontWeight: "normal",
        },
        onPointerDown: stopPtr,
        onClick: () => props.onReplayIntroTour(),
      },
      "Intro",
    ),
    e(
      "button",
      {
        type: "button",
        title: "Open full changelog / What's New history",
        style: {
          cursor: "pointer",
          padding: toggleBtnPad,
          fontSize: toggleFont,
          minHeight: touchPad ? "40px" : undefined,
          border: "1px solid #555",
          background: "#1a1a1a",
          color: "#bbb",
          textShadow: "none",
          fontWeight: "normal",
        },
        onPointerDown: stopPtr,
        onClick: () => props.onOpenChangelog(),
      },
      "Changelog",
    ),
  );
}
