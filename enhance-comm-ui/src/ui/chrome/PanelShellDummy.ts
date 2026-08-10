import { e } from "../../host/react";
import { LayoutPlaceholder } from "./LayoutPlaceholder";

export type PanelShellDummyProps = {
  /** Panel title shown in the header. */
  label: string;
  /** Optional subtitle / hint under the header. */
  hint?: string;
  /** Accent for the placeholder shell. */
  accent?: string;
  /** Extra body style (min size matching real panel). */
  style?: Record<string, any>;
  /** Fake rows to approximate content height. */
  rows?: number;
};

/**
 * Generic layout-edit silhouette for panels that are empty in play
 * (combat / threat / command / meters / kills).
 */
export function PanelShellDummy(props: PanelShellDummyProps): any {
  const rows = Math.max(1, props.rows || 3);
  const rowEls: any[] = [];
  for (let i = 0; i < rows; i++) {
    rowEls.push(
      e("div", {
        key: `r${i}`,
        style: {
          height: i === 0 ? "18px" : "14px",
          width: i === 0 ? "72%" : `${58 - i * 6}%`,
          background: i === 0 ? "#3a3a3a" : "#2a2a2a",
          opacity: 0.85,
        },
      }),
    );
  }

  return e(
    LayoutPlaceholder,
    {
      label: props.label,
      accent: props.accent || "#666",
      className: "comm-panel-shell-dummy",
      style: Object.assign(
        {
          opacity: 0.78,
          border: "2px solid #444",
          background: "rgba(0,0,0,0.88)",
          boxSizing: "border-box",
          minWidth: "160px",
        },
        props.style || {},
      ),
    },
    e(
      "div",
      {
        style: {
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        },
      },
      props.hint
        ? e(
            "div",
            { style: { fontSize: "13px", color: "#777", marginBottom: "4px" } },
            props.hint,
          )
        : null,
      ...rowEls,
    ),
  );
}
