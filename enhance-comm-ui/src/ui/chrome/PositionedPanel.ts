import { getReact, e } from "../../host/react";
import {
  PANEL_LABELS,
  panelStyle,
  snapPercent,
  softAvoidOverlap,
  type PanelId,
  type PanelPos,
} from "../../lib/layout";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
  subscribeLayoutEditPrefs,
} from "../../lib/layoutEditPrefs";
import { snapToGridPercent } from "../../lib/layoutGrid";
import {
  percentFromPointerDrag,
  tryReleasePointerCapture,
  trySetPointerCapture,
  type PercentDragStart,
} from "../../lib/percentDrag";
import { isTouchishProfile, type ViewportProfile } from "../../lib/viewport";

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
  /** Other panel positions for edge snap + soft avoid-overlap. */
  peerLayout?: Partial<Record<PanelId, PanelPos>>;
  /** Active viewport profile — enlarges handles on tablet/phone. */
  viewportProfile?: ViewportProfile;
};

/**
 * Absolutely places children at viewport-% coords.
 * In edit mode: drag the header bar to reposition (persisted by parent).
 * While dragging: grid snap (chosen step) unless Free placement is on; peer-edge snap
 * always (0 / 50 / 100 + peers). On drop, soft-nudges away from near peers.
 */
export function PositionedPanel(props: PositionedPanelProps): any {
  const React = getReact();
  const { id, pos, editing, onMove, children, onClose, hidden, onShow } =
    props;
  const [hover, setHover] = React.useState(false);
  const [freePlacement, setFreePlacement] = React.useState(() =>
    getLayoutFreePlacement(),
  );
  const freePlacementRef = React.useRef(freePlacement);
  freePlacementRef.current = freePlacement;
  const gridStepRef = React.useRef(getLayoutGridStep());
  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        gridStepRef.current = getLayoutGridStep();
      }),
    [],
  );
  const dragging = React.useRef(false);
  const start = React.useRef({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  } as PercentDragStart);
  const lastPos = React.useRef(pos);
  lastPos.current = pos;

  const touchish = isTouchishProfile(props.viewportProfile || "desktop");
  const closeSize = touchish ? 36 : 22;
  const headerPad = touchish ? "8px 12px" : "3px 8px";
  const headerFont = touchish ? "15px" : "13px";

  const peerAxes = (): { xs: number[]; ys: number[] } => {
    const peers = props.peerLayout || {};
    const ids = Object.keys(peers) as PanelId[];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] === id) continue;
      const p = peers[ids[i]];
      if (!p) continue;
      xs.push(p.x);
      ys.push(p.y);
    }
    return { xs, ys };
  };

  const onPointerDown = (ev: any) => {
    if (!editing) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging.current = true;
    start.current = {
      clientX: ev.clientX,
      clientY: ev.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    trySetPointerCapture(ev.currentTarget, ev.pointerId);
  };

  const onPointerMove = (ev: any) => {
    if (!dragging.current) return;
    let { x: nextX, y: nextY } = percentFromPointerDrag(
      ev.clientX,
      ev.clientY,
      start.current,
    );
    // Grid is primary when Free is off; peer-edge magnet still applies after.
    if (!freePlacementRef.current) {
      nextX = snapToGridPercent(nextX, gridStepRef.current);
      nextY = snapToGridPercent(nextY, gridStepRef.current);
    }
    const { xs, ys } = peerAxes();
    nextX = snapPercent(nextX, 2.2, xs);
    nextY = snapPercent(nextY, 2.2, ys);
    onMove(id, { ...pos, x: nextX, y: nextY });
  };

  const onPointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
    const peers = props.peerLayout || {};
    const nudged = softAvoidOverlap(id, lastPos.current, peers);
    if (nudged.x !== lastPos.current.x || nudged.y !== lastPos.current.y) {
      onMove(id, nudged);
    }
  };

  const showClose = !!onClose && !hidden && (editing || hover || touchish);
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
            width: `${closeSize}px`,
            height: `${closeSize}px`,
            padding: 0,
            margin: 0,
            border: "1px solid #555",
            background: "rgba(20,20,20,0.9)",
            color: "#ccc",
            fontSize: touchish ? "18px" : "14px",
            lineHeight: `${closeSize - 2}px`,
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
            padding: headerPad,
            paddingRight: onClose && !hidden ? `${closeSize + 8}px` : "8px",
            marginBottom: 0,
            background: hidden
              ? "rgba(30,30,30,0.92)"
              : "rgba(40,40,20,0.92)",
            border: hidden ? "1px solid #666" : "1px solid #886",
            cursor: "grab",
            userSelect: "none",
            fontSize: headerFont,
            color: hidden ? "#bbb" : "#ffe08a",
            whiteSpace: "nowrap",
            touchAction: "none",
            minHeight: touchish ? "40px" : undefined,
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
                  fontSize: touchish ? "14px" : "12px",
                  padding: touchish ? "6px 12px" : "2px 8px",
                  minHeight: touchish ? "36px" : undefined,
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
