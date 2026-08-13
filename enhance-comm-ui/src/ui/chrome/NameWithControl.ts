import { e } from "../../host/react";
import type { ControlState } from "../../lib/controlState";
import { ControlBadge } from "./ControlBadge";

export type NameWithControlProps = {
  name: string;
  states: ControlState[];
  /** Party-chip density. */
  compact?: boolean;
  iconSize?: number;
  className?: string;
};

/**
 * Level/name text + fear/CC pill as one tight cluster.
 * Must not flex-grow — growth shoved the pill to the far end of the HP bar.
 */
export function NameWithControl(props: NameWithControlProps): any {
  const { name, states, compact = false, className } = props;
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : compact
        ? 16
        : 26;

  return e(
    "span",
    {
      className: className || "comm-unit-namecluster",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? "5px" : "6px",
        flex: "0 1 auto",
        minWidth: 0,
        maxWidth: "100%",
      },
    },
    e(
      "span",
      {
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: "0 1 auto",
          minWidth: 0,
        },
      },
      name,
    ),
    e(ControlBadge, {
      states,
      compact,
      iconSize,
    }),
  );
}
