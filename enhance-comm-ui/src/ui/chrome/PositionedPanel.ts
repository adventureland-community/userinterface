import { getReact, e } from "../../host/react";
import {
  PANEL_LABELS,
  deltaToPercent,
  panelStyle,
  snapPercent,
  type PanelId,
  type PanelPos,
} from "../../lib/layout";

export type PositionedPanelProps = {
  id: PanelId;
  pos: PanelPos;
  editing: boolean;
  onMove: (id: PanelId, pos: PanelPos) => void;
  children?: any;
  /** Extra style merged onto the shell (e.g. width). */
  style?: Record<string, any>;
  /** When set, shows a small × to hide the panel. */
  onClose?: () => void;
  /** Panel is currently hidden; in edit mode show a restore chrome. */
  hidden?: boolean;
  /** Re-enable a hidden panel (layout edit). */
  onShow?: () => void;
  /** Overlay opacity 0.25–1 (persisted settings). */
  opacity?: number;
  /** Optional footprint for the hidden/closed edit body (e.g. bag size). */
  hiddenBodyStyle?: Record<string, any>;
};

/**
 * Absolutely places children at viewport-% coords.
 * In edit mode: drag the header bar to reposition (persisted by parent).
 * While dragging, snaps to edges / mid (0 / 50 / 100).
 */
export function PositionedPanel(props: PositionedPanelProps): any {
  const React = getReact();
  const { id, pos, editing, onMove, children, onClose, hidden, onShow } =
    props;
  const [hover, setHover] = React.useState(false);
  const dragging = React.useRef(false);
  const start = React.useRef({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });

  const onPointerDown = (ev: any) => {
    if (!editing) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging.current = true;
    start.current = {
      x: ev.clientX,
      y: ev.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (ev: any) => {
    if (!dragging.current) return;
    const root =
      (document.getElementById("comm-ui") as HTMLElement | null) ||
      document.documentElement;
    const rect = root.getBoundingClientRect();
    const { dxPct, dyPct } = deltaToPercent(
      ev.clientX - start.current.x,
      ev.clientY - start.current.y,
      rect.width,
      rect.height,
    );
    let nextX = start.current.posX + dxPct;
    let nextY = start.current.posY + dyPct;
    nextX = Math.max(0, Math.min(100, nextX));
    nextY = Math.max(0, Math.min(100, nextY));
    nextX = snapPercent(nextX);
    nextY = snapPercent(nextY);
    onMove(id, { ...pos, x: nextX, y: nextY });
  };

  const onPointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  const showClose = !!onClose && !hidden && (editing || hover);
  const opacity =
    typeof props.opacity === "number" && Number.isFinite(props.opacity)
      ? Math.max(0.25, Math.min(1, props.opacity))
      : 1;
  const shellStyle = Object.assign(
    {},
    panelStyle(pos, editing),
    props.style || {},
    {
      opacity: editing && hidden ? Math.min(opacity, 0.72) : opacity,
    },
    editing
      ? {
          outline: hidden
            ? "1px dashed rgba(140,140,140,0.7)"
            : "1px dashed rgba(255,220,100,0.85)",
          outlineOffset: "0px",
          background: hidden
            ? "rgba(20,20,20,0.55)"
            : "transparent",
        }
      : null,
  );

  const closeBtn = showClose
    ? e(
        "button",
        {
          type: "button",
          title: `Hide ${PANEL_LABELS[id]}`,
          "aria-label": `Hide ${PANEL_LABELS[id]}`,
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            onClose!();
          },
          onPointerDown: (ev: any) => ev.stopPropagation(),
          style: {
            position: "absolute",
            top: editing ? "2px" : "0",
            right: "0",
            zIndex: 2,
            width: "22px",
            height: "22px",
            padding: 0,
            margin: 0,
            border: "1px solid #555",
            background: "rgba(20,20,20,0.9)",
            color: "#ccc",
            fontSize: "14px",
            lineHeight: "20px",
            cursor: "pointer",
            pointerEvents: "auto",
          },
        },
        "×",
      )
    : null;

  const editHeader = editing
    ? e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 8px",
            paddingRight: onClose && !hidden ? "28px" : "8px",
            marginBottom: 0,
            background: hidden
              ? "rgba(30,30,30,0.92)"
              : "rgba(40,40,20,0.92)",
            border: hidden ? "1px solid #666" : "1px solid #886",
            cursor: "grab",
            userSelect: "none",
            fontSize: "13px",
            color: hidden ? "#bbb" : "#ffe08a",
            whiteSpace: "nowrap",
            touchAction: "none",
          },
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: onPointerUp,
        },
        `⠿ ${PANEL_LABELS[id]}${hidden ? " (hidden)" : ""}`,
        hidden && onShow
          ? e(
              "button",
              {
                type: "button",
                onClick: (ev: any) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  onShow();
                },
                onPointerDown: (ev: any) => ev.stopPropagation(),
                style: {
                  marginLeft: "auto",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "2px 8px",
                  border: "1px solid #7a7",
                  background: "#1a2a1a",
                  color: "#9e9",
                },
              },
              "Show",
            )
          : null,
      )
    : null;

  const hiddenBodyStyle: Record<string, any> = Object.assign(
    {
      padding: "8px 10px",
      color: "#888",
      fontSize: "13px",
      minWidth: "120px",
      boxSizing: "border-box",
    },
    props.hiddenBodyStyle || {},
  );

  return e(
    "div",
    {
      className: `comm-pos-panel comm-pos-${id}`,
      "data-panel": id,
      style: shellStyle,
      onMouseEnter: onClose ? () => setHover(true) : undefined,
      onMouseLeave: onClose ? () => setHover(false) : undefined,
    },
    editHeader,
    closeBtn,
    hidden && editing
      ? e(
          "div",
          {
            style: hiddenBodyStyle,
          },
          `${PANEL_LABELS[id]} — closed`,
        )
      : children,
  );
}
