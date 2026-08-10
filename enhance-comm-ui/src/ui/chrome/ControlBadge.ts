import { itemContainer } from "../../host/icons";
import { getReact, e } from "../../host/react";
import type { ControlState } from "../../lib/controlState";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type ControlBadgeProps = {
  states: ControlState[];
  /**
   * compact: icon-only corner (party chips).
   * full: icon + label pill (ObservedUnit / boss).
   */
  compact?: boolean;
  /** Absolute icon size for item_container. */
  iconSize?: number;
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
    const html = itemContainer(
      { skin: state.skin, size: iconSize, draggable: false },
      null,
    );
    if (html) {
      el.innerHTML = html;
      const root = el.firstElementChild as HTMLElement | null;
      if (root) {
        root.style.margin = "0";
        root.removeAttribute("onmousedown");
        root.removeAttribute("ontouchstart");
        root.removeAttribute("onclick");
      }
    } else {
      el.textContent = state.label.slice(0, 1);
    }
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
      overflow: "visible",
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
 * Corner badge for fear tiers / hard-CC.
 * Fear is not in EffectsRow — this is the primary cue.
 * Hard-CC stays in EffectsRow; badge amplifies at frame level.
 */
export function ControlBadge(props: ControlBadgeProps): any {
  const { states, compact = false } = props;
  if (!states.length) return null;
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : compact
        ? 18
        : 22;

  return e(
    "div",
    {
      className: "comm-ctrl-badges" + (compact ? " is-compact" : ""),
      style: {
        position: "absolute",
        top: compact ? "-3px" : "2px",
        left: compact ? "-3px" : "2px",
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: compact ? "2px" : "3px",
        pointerEvents: "none",
      },
    },
    ...states.map((state) => {
      const key =
        state.kind === "fear"
          ? `fear-${state.level}`
          : `cc-${state.id}`;
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
            gap: compact ? "0" : "4px",
            maxWidth: compact ? undefined : "100%",
            padding: compact ? "1px" : "1px 5px 1px 1px",
            boxSizing: "border-box",
            background: state.background,
            border: `1px solid ${state.border}`,
            color: state.color,
            fontSize: TYPE.badge,
            lineHeight: 1,
            ...PIXEL_TEXT,
          },
        },
        e(ControlIcon, { state, iconSize }),
        compact
          ? null
          : e(
              "span",
              {
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "7.5em",
                },
              },
              state.label,
            ),
      );
    }),
  );
}
