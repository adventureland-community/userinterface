import { getReact, e } from "../../host/react";
import {
  LAYOUT_ANCHOR_OPTIONS,
  LAYOUT_ANCHOR_PAD,
  PANEL_LABELS,
  captureVisualSnapStart,
  panelStyle,
  reanchorKeepingVisual,
  snapDragToVisualEdges,
  snapPercent,
  softAvoidOverlap,
  type LayoutAnchor,
  type PanelId,
  type PanelPos,
  type VisualSnapStart,
} from "../../lib/layout";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
  subscribeLayoutEditPrefs,
} from "../../lib/layoutEditPrefs";
import { snapToAxisPercents, squareGridMetrics } from "../../lib/layoutGrid";
import {
  layoutDragRoot,
  percentFromPointerDrag,
  tryReleasePointerCapture,
  trySetPointerCapture,
  type PercentDragStart,
} from "../../lib/percentDrag";
import { isTouchishProfile, type ViewportProfile } from "../../lib/viewport";
import { TYPE } from "../../lib/typeScale";

/** Peer / mid magnet — tighter than old 2.2% so near-edge stays placeable. */
const PEER_SNAP_PCT = 1.0;
/** Only snap painted box to screen when this close (px). */
const VISUAL_EDGE_SNAP_PX = 8;

function anchorMeta(id: LayoutAnchor): { glyph: string; title: string } {
  for (let i = 0; i < LAYOUT_ANCHOR_OPTIONS.length; i++) {
    if (LAYOUT_ANCHOR_OPTIONS[i].id === id) return LAYOUT_ANCHOR_OPTIONS[i];
  }
  return { glyph: "·", title: id };
}

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
 * In edit mode: drag the header bar to reposition (persisted by parent);
 * 3×3 anchor pad sets stretch direction (keeps painted box put).
 * While dragging: grid snap (chosen step) unless Free placement is on; peer
 * mid snap; visual screen-edge snap (painted box, tight px threshold).
 * On drop, soft-nudges away from near peers.
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
  const shellRef = React.useRef(null as HTMLDivElement | null);
  const dragging = React.useRef(false);
  const start = React.useRef({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  } as PercentDragStart);
  const visualStart = React.useRef(null as VisualSnapStart | null);
  const lastPos = React.useRef(pos);
  lastPos.current = pos;

  const touchish = isTouchishProfile(props.viewportProfile || "desktop");
  const closeSize = touchish ? 36 : 22;
  const headerPad = touchish ? "8px 12px" : "3px 8px";
  const headerFont = touchish ? "15px" : "13px";
  const anchorBtn = touchish ? 28 : 20;

  const setAnchor = (next: LayoutAnchor) => {
    if (next === pos.anchor) return;
    const panelEl = shellRef.current;
    const rootEl = layoutDragRoot();
    if (!panelEl) {
      onMove(id, { ...pos, anchor: next });
      return;
    }
    const p = panelEl.getBoundingClientRect();
    const c = rootEl.getBoundingClientRect();
    onMove(
      id,
      reanchorKeepingVisual(pos, next, p.width, p.height, c.width, c.height),
    );
  };

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
    visualStart.current = captureVisualSnapStart(
      shellRef.current,
      layoutDragRoot(),
      pos,
    );
    trySetPointerCapture(ev.currentTarget, ev.pointerId);
  };

  const onPointerMove = (ev: any) => {
    if (!dragging.current) return;
    const raw = percentFromPointerDrag(
      ev.clientX,
      ev.clientY,
      start.current,
    );
    let nextX = raw.x;
    let nextY = raw.y;
    // Square grid (skip 0/100 — visual snap owns screen edges).
    if (!freePlacementRef.current) {
      const root = layoutDragRoot().getBoundingClientRect();
      const metrics = squareGridMetrics(
        gridStepRef.current,
        root.width,
        root.height,
      );
      nextX = snapToAxisPercents(nextX, metrics.xPercents, true);
      nextY = snapToAxisPercents(nextY, metrics.yPercents, true);
    }
    // Peer / mid magnets only (no 0/100).
    const { xs, ys } = peerAxes();
    nextX = snapPercent(nextX, PEER_SNAP_PCT, xs);
    nextY = snapPercent(nextY, PEER_SNAP_PCT, ys);
    // Painted-box flush last — wins over grid while within threshold
    // (including already flush, so grid cannot yank off the edge).
    const visual = visualStart.current;
    if (visual) {
      const edge = snapDragToVisualEdges(
        ev.clientX,
        ev.clientY,
        start.current,
        visual,
        VISUAL_EDGE_SNAP_PX,
      );
      if (edge.snapX) nextX = edge.x;
      if (edge.snapY) nextY = edge.y;
    }
    onMove(id, { ...pos, x: nextX, y: nextY });
  };

  const onPointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    visualStart.current = null;
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
          // Shell click-through in edit mode; header/close/anchor re-enable below.
          pointerEvents: "none",
        }
      : null,
  );

  const closeBtn = showClose
    ? e(
        "button",
        {
          type: "button",
          className: "comm-pos-panel-close",
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

  const anchorPad = editing
    ? e(
        "div",
        {
          className: "comm-pos-anchor-pad",
          title: "Stretch / anchor point",
          onPointerDown: (ev: any) => ev.stopPropagation(),
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(3, ${anchorBtn}px)`,
            gridTemplateRows: `repeat(3, ${anchorBtn}px)`,
            gap: "2px",
            marginLeft: "auto",
            flexShrink: 0,
            cursor: "default",
          },
        },
        ...LAYOUT_ANCHOR_PAD.reduce((cells: any[], row) => {
          for (let c = 0; c < row.length; c++) {
            const a = row[c];
            if (!a) {
              cells.push(
                e("div", {
                  key: `empty-${cells.length}`,
                  style: { width: anchorBtn, height: anchorBtn },
                }),
              );
              continue;
            }
            const meta = anchorMeta(a);
            const active = pos.anchor === a;
            cells.push(
              e(
                "button",
                {
                  key: a,
                  type: "button",
                  title: meta.title,
                  "aria-label": meta.title,
                  "aria-pressed": active,
                  onClick: (ev: any) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setAnchor(a);
                  },
                  onPointerDown: (ev: any) => ev.stopPropagation(),
                  style: {
                    width: `${anchorBtn}px`,
                    height: `${anchorBtn}px`,
                    padding: 0,
                    margin: 0,
                    border: active ? "1px solid #ffe08a" : "1px solid #666",
                    background: active
                      ? "rgba(80,70,20,0.95)"
                      : "rgba(20,20,20,0.9)",
                    color: active ? "#ffe08a" : "#bbb",
                    fontSize: touchish ? "14px" : "12px",
                    lineHeight: `${anchorBtn - 2}px`,
                    cursor: "pointer",
                    boxSizing: "border-box",
                  },
                },
                meta.glyph,
              ),
            );
          }
          return cells;
        }, []),
      )
    : null;

  const editHeader = editing
    ? e(
        "div",
        {
          className: "comm-pos-edit-header",
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
            pointerEvents: "auto",
          },
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: onPointerUp,
        },
        e(
          "span",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            },
          },
          `⠿ ${PANEL_LABELS[id]}${hidden ? " (hidden)" : ""}`,
        ),
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
        anchorPad,
      )
    : null;

  const hiddenBodyStyle: Record<string, any> = Object.assign(
    {
      padding: "8px 10px",
      color: "#888",
      fontSize: TYPE.secondary,
      minWidth: "120px",
      boxSizing: "border-box",
    },
    props.hiddenBodyStyle || {},
  );

  return e(
    "div",
    {
      ref: shellRef,
      className: `comm-pos-panel comm-pos-${id}${editing ? " comm-pos-editing" : ""}${hidden ? " comm-pos-hidden" : ""}`,
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
            className: "comm-pos-hidden-body",
            style: hiddenBodyStyle,
          },
          `${PANEL_LABELS[id]} — closed`,
        )
      : editing && !hidden
        ? e(
            "div",
            {
              className: "comm-pos-panel-body",
            },
            children,
          )
        : children,
  );
}
