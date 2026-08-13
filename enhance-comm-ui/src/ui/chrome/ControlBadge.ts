import { paintItemContainerIcon } from "../../lib/gameIcon";
import { getReact, e } from "../../host/react";
import type { ControlState } from "../../lib/controlState";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type ControlBadgeProps = {
  states: ControlState[];
  /** item_container size (px) — same path as EffectsRow. */
  iconSize?: number;
  /** Tighter padding + smaller label (party chips). */
  compact?: boolean;
};

function ControlIcon(props: {
  state: ControlState;
  iconSize: number;
}): any {
  const React = getReact();
  const ref = React.useRef(null);
  const { state, iconSize } = props;

  React.useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    paintItemContainerIcon(el, state.skin, iconSize);
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [state.skin, state.label, iconSize]);

  return e("div", {
    ref,
    className: "comm-ctrl-icon",
    style: {
      position: "relative",
      display: "inline-block",
      flex: "0 0 auto",
      verticalAlign: "top",
      lineHeight: 0,
      pointerEvents: "none",
    },
  });
}

function badgeTitle(state: ControlState): string {
  if (state.kind === "fear") {
    return `${state.label} (fear ${state.fear})`;
  }
  return state.label;
}

/**
 * Fear / hard-CC pill immediately after the name.
 * Icon + state label; background/border encode severity.
 */
export function ControlBadge(props: ControlBadgeProps): any {
  const { states, compact = false } = props;
  if (!states.length) return null;
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : compact
        ? 16
        : 26;

  return e(
    "div",
    {
      className: "comm-ctrl-badges is-inline" + (compact ? " is-compact" : ""),
      style: {
        position: "relative",
        display: "inline-flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        gap: compact ? "3px" : "4px",
        flex: "0 0 auto",
      },
    },
    ...states.map((state) => {
      const key =
        state.kind === "fear" ? `fear-${state.level}` : `cc-${state.id}`;
      return e(
        "div",
        {
          key,
          className:
            "comm-ctrl-badge" +
            (state.kind === "fear"
              ? ` is-fear is-${state.level}`
              : ` is-hardcc is-${state.id}`),
          title: badgeTitle(state),
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? "3px" : "5px",
            flex: "0 0 auto",
            padding: compact ? "1px 4px 1px 2px" : "2px 8px 2px 3px",
            boxSizing: "border-box",
            background: state.background,
            border: `${compact ? 1 : 2}px solid ${state.border}`,
            color: state.color,
            fontSize: compact ? TYPE.micro : TYPE.badge,
            lineHeight: 1,
            ...PIXEL_TEXT,
            cursor: "help",
            pointerEvents: "auto",
          },
        },
        e(ControlIcon, { state, iconSize }),
        e(
          "span",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: compact ? "5.5em" : "8em",
            },
          },
          state.label,
        ),
      );
    }),
  );
}
