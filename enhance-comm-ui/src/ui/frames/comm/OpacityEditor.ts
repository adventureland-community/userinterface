import { e } from "../../../host/react";
import { PANEL_LABELS, type PanelId } from "../../../lib/layout";
import { TYPE } from "../../../lib/typeScale";

export type OpacityEditorProps = {
  panelIds: PanelId[];
  opacityFor: (id: PanelId) => number;
  onChange: (id: PanelId, value: number) => void;
  onClose: () => void;
};

export function OpacityEditor(props: OpacityEditorProps): any {
  return e(
    "div",
    {
      style: {
        position: "absolute",
        right: "12px",
        bottom: "72px",
        zIndex: 55,
        pointerEvents: "auto",
        width: "220px",
        maxHeight: "50vh",
        overflow: "auto",
        padding: "8px 10px",
        background: "rgba(16,16,16,0.96)",
        border: "1px solid #555",
        color: "#ddd",
        fontSize: TYPE.secondary,
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          color: "#ccc",
        },
      },
      "Panel opacity",
      e(
        "button",
        {
          type: "button",
          onClick: props.onClose,
          style: {
            cursor: "pointer",
            border: "1px solid #555",
            background: "#222",
            color: "#ddd",
            fontSize: TYPE.secondaryMin,
            padding: "4px 8px",
            minHeight: "26px",
          },
        },
        "×",
      ),
    ),
    ...props.panelIds.map((id) =>
      e(
        "label",
        {
          key: id,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            marginBottom: "6px",
          },
        },
        e(
          "span",
          { style: { color: "#999" } },
          `${PANEL_LABELS[id]} · ${Math.round(props.opacityFor(id) * 100)}%`,
        ),
        e("input", {
          type: "range",
          min: 25,
          max: 100,
          step: 5,
          value: Math.round(props.opacityFor(id) * 100),
          onChange: (ev: any) => {
            const pct = Number(ev.target.value);
            props.onChange(id, pct / 100);
          },
        }),
      ),
    ),
  );
}
