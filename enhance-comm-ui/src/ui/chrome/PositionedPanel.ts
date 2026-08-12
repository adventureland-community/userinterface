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
import {
  snapFrameSizeToGrid,
  snapToAxisPercents,
  squareGridMetrics,
} from "../../lib/layoutGrid";
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
/** Max px to magnet painted edges to the screen. Grid mode further caps this
 * below half a cell so one interior grid row/column stays placeable. */
const VISUAL_EDGE_SNAP_PX = 8;

function anchorMeta(id: LayoutAnchor): { glyph: string; title: string } {
  for (let i = 0; i < LAYOUT_ANCHOR_OPTIONS.length; i++) {
    if (LAYOUT_ANCHOR_OPTIONS[i].id === id) return LAYOUT_ANCHOR_OPTIONS[i];
  }
  return { glyph: "·", title: id };
}

export type PositionedPanelProps = {
  /** PanelId or meter instance id (string). */
  id: PanelId | string;
  pos: PanelPos;
  editing: boolean;
  onMove: (id: any, pos: PanelPos) => void;
  /**
   * Fired once after a drag ends (final pos already pushed via onMove).
   * Used for meter edge-snap grouping.
   */
  onMoveEnd?: (id: any, pos: PanelPos) => void;
  /** Fired when a drag begins (movable / layout edit). */
  onDragStart?: (id: any) => void;
  /** Fired during drag — meter snap preview, etc. */
  onDragMove?: (id: any, pos: PanelPos) => void;
  /** When false, skip softAvoidOverlap on drop (meter snap groups). */
  softAvoid?: boolean;
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
  /** Layout-edit: show a per-panel opacity slider on this frame. */
  onOpacityChange?: (value: number) => void;
  /** Optional footprint for the hidden/closed edit body (e.g. bag size). */
  hiddenBodyStyle?: Record<string, any>;
  /** Other panel positions for edge snap + soft avoid-overlap. */
  peerLayout?: Partial<Record<string, PanelPos>>;
  /** Active viewport profile — enlarges handles on tablet/phone. */
  viewportProfile?: ViewportProfile;
  /**
   * Keep body (and shell) pointer-events in layout edit so controls stay
   * clickable. Default is click-through so overlapping panels can be grabbed.
   */
  interactiveBody?: boolean;
  /**
   * Layout-edit drag chrome. `full` = labeled header + anchors (default).
   * `grip` = compact ⠿ only — for panels whose body is the real control
   * (Layout toggle) so the header does not steal the click.
   * `anchors` = drag strip + anchor pad only (meters already show their title).
   */
  editChrome?: "full" | "grip" | "anchors";
  /** Override chrome label (meters). */
  label?: string;
  /** Extra class on the outer shell (e.g. meter resize frame). */
  className?: string;
  /** Persist outer box size after CSS / drag resize. */
  onResizeFrame?: (size: { w: number; h: number }) => void;
  /**
   * When true, hide × only appears on hover even while `editing` — so meter
   * unlock/arrange chrome (lock, Seg, View) stays clickable.
   */
  closeOnHoverOnly?: boolean;
  /**
   * `above` = float hide × just over the top-right of the frame (meters),
   * so it does not cover titlebar actions like reset.
   */
  closePlacement?: "corner" | "above";
  /**
   * Play-mode move (meter unlock / Alt). Shows a drag grip and enables
   * reposition without full layout-edit chrome or an always-on hide ×.
   */
  movable?: boolean;
  /**
   * Optional extra element (e.g. meter titlebar) that also starts a drag
   * when the panel is movable / editing.
   */
  extraDragRef?: { current: HTMLElement | null };
  /** When false, omit the ⠿ grip (meters drag from titlebar). Default true. */
  showMoveGrip?: boolean;
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
  const { id, pos, editing, onMove, children, onClose, hidden, onShow } = props;
  const panelLabel =
    props.label || (PANEL_LABELS as Record<string, string>)[id] || String(id);
  const [hover, setHover] = React.useState(false);
  const hoverLeaveTimer = React.useRef(
    null as ReturnType<typeof setTimeout> | null,
  );
  const setPanelHover = (next: boolean) => {
    if (hoverLeaveTimer.current != null) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    if (next) {
      setHover(true);
      return;
    }
    // Delay leave so the cursor can reach an above-frame hide ×.
    hoverLeaveTimer.current = setTimeout(() => {
      hoverLeaveTimer.current = null;
      setHover(false);
    }, 180);
  };
  React.useEffect(() => {
    return () => {
      if (hoverLeaveTimer.current != null) {
        clearTimeout(hoverLeaveTimer.current);
      }
    };
  }, []);
  const [freePlacement, setFreePlacement] = React.useState(() =>
    getLayoutFreePlacement(),
  );
  const freePlacementRef = React.useRef(freePlacement);
  freePlacementRef.current = freePlacement;
  const gridStepRef = React.useRef(getLayoutGridStep());
  const shellRef = React.useRef(null as HTMLDivElement | null);
  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        gridStepRef.current = getLayoutGridStep();
      }),
    [],
  );

  React.useEffect(() => {
    if (!props.onResizeFrame) return;
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastW = 0;
    let lastH = 0;
    let timer = 0;
    let shiftHeld = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeld = e.type === "keydown";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    const obs = new ResizeObserver(() => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 40 || h < 40) return;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!props.onResizeFrame) return;
        const free =
          freePlacementRef.current || shiftHeld || getLayoutFreePlacement();
        let outW = w;
        let outH = h;
        if (!free) {
          const root = layoutDragRoot().getBoundingClientRect();
          const snapped = snapFrameSizeToGrid(
            w,
            h,
            gridStepRef.current,
            root.width,
            root.height,
          );
          outW = snapped.w;
          outH = snapped.h;
          if (outW !== w || outH !== h) {
            el.style.width = outW + "px";
            el.style.height = outH + "px";
            lastW = outW;
            lastH = outH;
          }
        }
        props.onResizeFrame({ w: outW, h: outH });
      }, 120);
    });
    obs.observe(el);
    return () => {
      window.clearTimeout(timer);
      obs.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [props.onResizeFrame]);
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
    if (!editing && !props.movable) return;
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
    if (props.onDragStart) props.onDragStart(id);
    trySetPointerCapture(ev.currentTarget, ev.pointerId);
  };

  const onPointerMove = (ev: any) => {
    if (!dragging.current) return;
    const raw = percentFromPointerDrag(ev.clientX, ev.clientY, start.current);
    let nextX = raw.x;
    let nextY = raw.y;
    let edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
    let useVisualEdge = true;
    // Square fine-grid owns placement when Free is off — including 0/100.
    // Visual edge magnet used to eat the first interior cell and feel like
    // "only the coarser overlay snaps."
    if (!freePlacementRef.current) {
      const root = layoutDragRoot().getBoundingClientRect();
      const metrics = squareGridMetrics(
        gridStepRef.current,
        root.width,
        root.height,
      );
      // Always snap to the fine step (incl. 0/100). 2×/4× overlays are guides only.
      nextX = snapToAxisPercents(nextX, metrics.xPercents, false);
      nextY = snapToAxisPercents(nextY, metrics.yPercents, false);
      // Peers may magnetize, but tighter than one fine cell so they don't
      // yank off the chosen grid line onto mid/peer anchors.
      const cellPctX = (metrics.cellPx / Math.max(1, root.width)) * 100;
      const cellPctY = (metrics.cellPx / Math.max(1, root.height)) * 100;
      const peerThresh = Math.min(
        PEER_SNAP_PCT,
        Math.max(0.2, Math.min(cellPctX, cellPctY) * 0.4),
      );
      const { xs, ys } = peerAxes();
      nextX = snapPercent(nextX, peerThresh, xs);
      nextY = snapPercent(nextY, peerThresh, ys);
      useVisualEdge = false;
    } else {
      // Free: peer / mid magnets + tight painted-edge flush.
      const { xs, ys } = peerAxes();
      nextX = snapPercent(nextX, PEER_SNAP_PCT, xs);
      nextY = snapPercent(nextY, PEER_SNAP_PCT, ys);
      edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
    }
    const visual = visualStart.current;
    if (useVisualEdge && visual) {
      const edge = snapDragToVisualEdges(
        ev.clientX,
        ev.clientY,
        start.current,
        visual,
        edgeThresholdPx,
      );
      if (edge.snapX) nextX = edge.x;
      if (edge.snapY) nextY = edge.y;
    }
    onMove(id, { ...pos, x: nextX, y: nextY });
    if (props.onDragMove) props.onDragMove(id, { ...pos, x: nextX, y: nextY });
  };

  const onPointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    visualStart.current = null;
    tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
    let finalPos = lastPos.current;
    if (props.softAvoid !== false) {
      const peers = props.peerLayout || {};
      const nudged = softAvoidOverlap(id, lastPos.current, peers);
      if (nudged.x !== lastPos.current.x || nudged.y !== lastPos.current.y) {
        finalPos = nudged;
        onMove(id, nudged);
      }
    }
    if (props.onMoveEnd) props.onMoveEnd(id, finalPos);
  };

  // Keep handlers stable for extraDragRef attachment.
  const dragHandlersRef = React.useRef({
    onPointerDown,
    onPointerMove,
    onPointerUp,
  });
  dragHandlersRef.current = { onPointerDown, onPointerMove, onPointerUp };

  React.useEffect(() => {
    const el = props.extraDragRef?.current;
    if (!el) return;
    const down = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement | null;
      if (
        t &&
        typeof t.closest === "function" &&
        t.closest(
          "button, a, input, textarea, select, .ecu-meter-tool, .ecu-meter-ttl, .ecu-meter-btn",
        )
      ) {
        return;
      }
      dragHandlersRef.current.onPointerDown(ev);
    };
    const move = (ev: PointerEvent) =>
      dragHandlersRef.current.onPointerMove(ev);
    const up = (ev: PointerEvent) => dragHandlersRef.current.onPointerUp(ev);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    // Rebind when arrange/edit toggles; also when ref object identity is stable
    // but the node may appear after first paint — depend on movable/editing.
  }, [props.extraDragRef, editing, props.movable, id, pos.x, pos.y]);

  const showClose =
    !!onClose &&
    !hidden &&
    (hover || touchish || (editing && !props.closeOnHoverOnly));
  const opacity =
    typeof props.opacity === "number" && Number.isFinite(props.opacity)
      ? Math.max(0.25, Math.min(1, props.opacity))
      : 1;
  const interactiveBody = !!props.interactiveBody;
  const editChrome =
    props.editChrome === "grip" || props.editChrome === "anchors"
      ? props.editChrome
      : "full";
  const movable = !!props.movable && !editing;
  const shellStyle = Object.assign(
    {},
    panelStyle(pos, editing || movable),
    props.style || {},
    {
      opacity: editing && hidden ? Math.min(opacity, 0.72) : opacity,
    },
    editing
      ? {
          // Cyan + dark edge — yellow grid uses the same warm dashes as the old outline.
          outline: hidden
            ? "2px dashed rgba(160,160,160,0.85)"
            : "2px solid rgba(80, 210, 255, 0.95)",
          outlineOffset: "0px",
          boxShadow: hidden
            ? "0 0 0 1px rgba(0,0,0,0.55)"
            : "0 0 0 1px rgba(0,0,0,0.75), 0 0 10px rgba(40,140,200,0.35)",
          background: hidden ? "rgba(20,20,20,0.55)" : "transparent",
          // Default: click-through so overlapping panels can be grabbed.
          // interactiveBody (Layout toggles): keep hits so buttons work.
          pointerEvents: interactiveBody ? "auto" : "none",
        }
      : movable
        ? {
            outline: "2px solid rgba(80, 210, 255, 0.85)",
            outlineOffset: "0px",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.7)",
            pointerEvents: "auto",
          }
        : null,
  );

  const closeAbove = props.closePlacement === "above";
  const closeOnChrome = closeAbove && (editing || movable);
  const closeBtn = showClose
    ? e(
        "button",
        {
          type: "button",
          className:
            "comm-pos-panel-close" +
            (closeAbove ? " comm-pos-panel-close-above" : ""),
          title: `Hide ${panelLabel}`,
          "aria-label": `Hide ${panelLabel}`,
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            onClose!();
          },
          onPointerDown: (ev: any) => ev.stopPropagation(),
          onMouseEnter: () => setPanelHover(true),
          onMouseLeave: () => setPanelHover(false),
          style: {
            position: "absolute",
            top: closeAbove
              ? closeOnChrome
                ? "2px"
                : `-${closeSize + 2}px`
              : editing
                ? "2px"
                : "0",
            right: closeOnChrome ? "2px" : "0",
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

  const moveGrip =
    props.showMoveGrip !== false &&
    (movable || (editing && editChrome === "grip"))
      ? e(
          "div",
          {
            className: "comm-pos-edit-grip",
            title: "Drag to move",
            "aria-label": "Drag to move",
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: touchish ? "6px 8px" : "2px 4px",
              marginBottom: "2px",
              background: "rgba(40,40,20,0.92)",
              border: "1px solid #886",
              cursor: "grab",
              userSelect: "none",
              color: "#ffe08a",
              fontSize: headerFont,
              lineHeight: 1,
              touchAction: "none",
              pointerEvents: "auto",
              flexShrink: 0,
            },
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
          },
          e("span", { "aria-hidden": true }, "⠿"),
        )
      : null;

  const editHeaderStyle: Record<string, any> = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: headerPad,
    paddingRight: onClose && !hidden ? `${closeSize + 8}px` : "8px",
    marginBottom: 0,
    background: hidden ? "rgba(30,30,30,0.92)" : "rgba(40,40,20,0.92)",
    border: hidden ? "1px solid #666" : "1px solid #886",
    cursor: "grab",
    userSelect: "none",
    fontSize: headerFont,
    color: hidden ? "#bbb" : "#ffe08a",
    whiteSpace: "nowrap",
    touchAction: "none",
    minHeight: touchish ? "40px" : undefined,
    pointerEvents: "auto",
  };

  const editHeader = !editing
    ? moveGrip
    : editChrome === "grip"
      ? moveGrip
      : editChrome === "anchors"
        ? e(
            "div",
            {
              className: "comm-pos-edit-header is-anchors-only",
              title: `Drag to move · ${panelLabel}`,
              "aria-label": `Drag to move ${panelLabel}`,
              style: {
                ...editHeaderStyle,
                justifyContent: "space-between",
                paddingTop: touchish ? "4px" : "2px",
                paddingBottom: touchish ? "4px" : "2px",
              },
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
            },
            e(
              "span",
              {
                className: "comm-pos-edit-label",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  flex: 1,
                },
              },
              `${panelLabel}${hidden ? " (hidden)" : ""}`,
            ),
            anchorPad,
          )
        : e(
            "div",
            {
              className: "comm-pos-edit-header",
              style: editHeaderStyle,
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
            },
            e(
              "span",
              {
                className: "comm-pos-edit-label",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  flex: 1,
                },
              },
              `${panelLabel}${hidden ? " (hidden)" : ""}`,
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
          );

  const opacityRow =
    editing && props.onOpacityChange && !hidden
      ? e(
          "div",
          {
            className: "comm-pos-opacity-row",
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: touchish ? "4px 8px" : "2px 6px",
              marginBottom: "2px",
              background: "rgba(20,20,24,0.92)",
              border: "1px solid #555",
              color: "#bbb",
              fontSize: touchish ? "13px" : TYPE.secondaryMin,
              pointerEvents: "auto",
              flexShrink: 0,
              minWidth: 0,
            },
            onPointerDown: (ev: any) => ev.stopPropagation(),
          },
          e(
            "span",
            {
              style: {
                flexShrink: 0,
                color: "#999",
                minWidth: touchish ? "52px" : "44px",
              },
            },
            `${Math.round(opacity * 100)}%`,
          ),
          e("input", {
            type: "range",
            min: 25,
            max: 100,
            step: 5,
            value: Math.round(opacity * 100),
            title: "Panel opacity",
            "aria-label": "Panel opacity",
            style: {
              flex: 1,
              minWidth: 0,
              margin: 0,
              cursor: "pointer",
            },
            onChange: (ev: any) => {
              const pct = Number(ev.target.value);
              if (!Number.isFinite(pct)) return;
              props.onOpacityChange!(pct / 100);
            },
          }),
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
      className: `comm-pos-panel comm-pos-${id}${editing ? " comm-pos-editing" : ""}${movable ? " comm-pos-movable" : ""}${hidden ? " comm-pos-hidden" : ""}${props.className ? ` ${props.className}` : ""}`,
      "data-panel": id,
      style: shellStyle,
      onMouseEnter: onClose ? () => setPanelHover(true) : undefined,
      onMouseLeave: onClose ? () => setPanelHover(false) : undefined,
    },
    editHeader,
    opacityRow,
    closeBtn,
    hidden && editing
      ? e(
          "div",
          {
            className: "comm-pos-hidden-body",
            style: hiddenBodyStyle,
          },
          `${panelLabel} — closed`,
        )
      : editing && !hidden
        ? e(
            "div",
            {
              className: "comm-pos-panel-body",
              style: interactiveBody ? { pointerEvents: "auto" } : undefined,
            },
            children,
          )
        : children,
  );
}
