import { e } from "../../host/react";

export type LayoutPlaceholderProps = {
  /** Panel role for the header strip. */
  label: string;
  className?: string;
  style?: Record<string, any>;
  /** Accent for the header dot / gradient; muted by default. */
  accent?: string;
  children?: any;
};

/**
 * Shared layout-edit silhouette shell (header + body).
 * FrameDummy / PaperdollDummy / BagDummy fill children differently.
 */
export function LayoutPlaceholder(props: LayoutPlaceholderProps): any {
  const accent = props.accent || "#555";
  return e(
    "div",
    {
      className: props.className,
      style: props.style,
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 10px",
          background: `linear-gradient(90deg, ${accent}33, transparent)`,
          borderBottom: `1px solid ${accent}66`,
          color: "#888",
          fontSize: "17px",
        },
      },
      e("div", {
        style: {
          width: "8px",
          height: "8px",
          background: accent,
          flexShrink: 0,
        },
      }),
      props.label,
    ),
    props.children,
  );
}
