import { getReact, e } from "../../host/react";
import { type PanelGroupDragOpts } from "../../lib/panelGroupDrag";
import {
  PANEL_LABELS,
  clampPanelPosInRoot,
  panelStyle,
  applyCallerStackZ,
  unclipShellOverflow,
  reanchorKeepingVisual,
  type LayoutAnchor,
  type PanelId,
  type PanelPos,
} from "../../lib/layout";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
  subscribeLayoutEditPrefs,
} from "../../lib/layoutEditPrefs";
import { snapFrameSizeToGrid } from "../../lib/layoutGrid";
import { layoutDragRoot } from "../../lib/percentDrag";
import { clampWindowScale, type CommWindowGraphState } from "../../lib/commWindowGroup";
import {
  panelUsesAutoSize,
  panelFillsFrame,
  isPanelId,
} from "../../lib/panelCatalog";
import { beginLayoutGuide, endLayoutGuide } from "../../lib/layoutGuide";
import { isTouchishProfile, type ViewportProfile } from "../../lib/viewport";
import { TYPE } from "../../lib/typeScale";
import { applyAutoSizeMaxWidth } from "../../lib/frameSizes";
import { PositionedPanelChrome } from "./PositionedPanelChrome";
import { usePositionedPanelDrag } from "./usePositionedPanelDrag";

const HUD_FRAME_MIN = { w: 80, h: 48 };

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
  onMoveEnd?: (id: any, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
  /** Fired when a drag begins (movable / layout edit). */
  onDragStart?: (id: any) => void;
  /**
   * Details SetToplevel — raise this window on any pointer-down inside the
   * shell (click / drag), including when locked. Not hover.
   */
  onActivate?: (id: any) => void;
  /** Fired during drag — meter snap preview, etc. */
  onDragMove?: (id: any, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
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
  /** Comm window graph for peer magnets + drag-finish policy. */
  getGraphState?: () => CommWindowGraphState;
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
   * When true (default if onResizeFrame is set), show corner resize grips while
   * layout-editing or play-arrange (movable). Meters use shell grips instead.
   */
  showResizeHandles?: boolean;
  /** Width-only vs box resize. Default `wh`. */
  resizeAxes?: "w" | "wh";
  /**
   * When true, hide × only appears on hover even while `editing` — so meter
   * unlock/arrange chrome (lock, Seg, View) stays clickable.
   */
  closeOnHoverOnly?: boolean;
  /**
   * `above` = hide × lives on Window Control / play-arrange chrome
   * (meters), not on the maroon titlebar next to stretch/Details tools.
   * When the arrange overlay is absent, × floats just over the frame.
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
  /** Detach this window from an edge-snap group. */
  onUngroup?: () => void;
  /** Details-style lock. When set with onToggleLock, shows lock control. */
  locked?: boolean;
  onToggleLock?: () => void;
  /** Closed windows for Window Control → Reopen (meters + HUD). */
  closedWindows?: Array<{ id: string; label: string }>;
  onReopenWindow?: (id: string) => void;
  onCreateWindow?: () => void;
  /** Stable Comm window number (Details meu_id). */
  windowNumber?: number;
  /** Show large instance id overlay (after ~1s drag hold). */
  showWindowIds?: boolean;
  /** Ctrl+wheel → Details SetWindowScale (whole snap group). */
  onWindowScale?: (scale: number) => void;
  /**
   * Grow the shell to max-content when frameW/H are a floor (HUD hug shells).
   * False = fixed box. HUD ids use the panel catalog; this is for meters.
   */
  hugContent?: boolean;
  /** WC → Auto-resize. Manual corner resize turns this off. */
  onAutoSizeChange?: (
    autoSize: boolean,
    size?: { w: number; h: number },
  ) => void;
};

/**
 * Absolutely places children at viewport-% coords.
 * In edit mode: drag the header bar to reposition (persisted by parent);
 * 3×3 anchor pad sets stretch direction (keeps painted box put).
 * While dragging (layout edit OR play-arrange / unlocked): fine-grid snap
 * unless Free placement is on; peer mid snap; visual screen-edge (Free only).
 * Hold Ctrl to skip edge-group join (live: release re-enables snap).
 * On drop, soft-nudges away from near peers then re-snaps to the fine grid.
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
    // Delay leave so the cursor can reach above-frame chrome (grip / lock / ×)
    // across the small gap without the bar vanishing mid-click.
    hoverLeaveTimer.current = setTimeout(() => {
      hoverLeaveTimer.current = null;
      setHover(false);
    }, 280);
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
  /** Prefer above-frame chrome; fall back to in-flow when it would clip off-screen. */
  const [arrangePlacement, setArrangePlacement] = React.useState(
    "above" as "above" | "inline",
  );
  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        gridStepRef.current = getLayoutGridStep();
      }),
    [],
  );

  // Details SetWindowScale — Ctrl+wheel on unlocked / layout-edit windows.
  React.useEffect(() => {
    const onScale = props.onWindowScale;
    if (!onScale) return;
    const el = shellRef.current;
    if (!el) return;
    const canScale = editing || !!props.movable || !props.locked;
    if (!canScale) return;
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const cur =
        typeof pos.scale === "number" && Number.isFinite(pos.scale)
          ? pos.scale
          : 1;
      const delta = ev.deltaY < 0 ? 0.05 : -0.05;
      onScale(clampWindowScale(cur + delta));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [props.onWindowScale, props.locked, props.movable, editing, pos.scale]);

  React.useEffect(() => {
    if (!props.onResizeFrame) return;
    if (panelUsesAutoSize(pos, String(id))) return;
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
  }, [props.onResizeFrame, pos.autoSize, id]);
  const {
    dragPinned,
    draggingRef: dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = usePositionedPanelDrag({
    id,
    pos,
    editing,
    movableProp: !!props.movable,
    softAvoid: props.softAvoid,
    getGraphState: props.getGraphState,
    shellRef,
    extraDragRef: props.extraDragRef,
    freePlacementRef,
    gridStepRef,
    onMove,
    onMoveEnd: props.onMoveEnd,
    onDragStart: props.onDragStart,
    onDragMove: props.onDragMove,
  });

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

  const opacity =
    typeof props.opacity === "number" && Number.isFinite(props.opacity)
      ? Math.max(0.25, Math.min(1, props.opacity))
      : 1;
  const interactiveBody = !!props.interactiveBody;
  const editChrome =
    props.editChrome === "grip" || props.editChrome === "anchors"
      ? props.editChrome
      : "full";
  const movable = (!!props.movable || dragPinned) && !editing;
  const autoSize = panelUsesAutoSize(pos, String(id));
  const showResizeHandles =
    props.showResizeHandles !== false &&
    !!props.onResizeFrame &&
    (editing || movable) &&
    !autoSize;

  const onResizePointerDown = (ev: any, corner: "br" | "bl") => {
    if (!props.onResizeFrame) return;
    ev.preventDefault();
    ev.stopPropagation();
    const el = shellRef.current;
    if (!el) return;
    const startX = ev.clientX;
    const startY = ev.clientY;
    const startW = Math.round(el.offsetWidth);
    const startH = Math.round(el.offsetHeight);
    beginLayoutGuide();
    const pointerId = ev.pointerId;
    try {
      (ev.currentTarget as HTMLElement).setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    let pendingW = startW;
    let pendingH = startH;
    const sizeFrame = (w: number, h: number, freeForm: boolean) => {
      const root = layoutDragRoot().getBoundingClientRect();
      const maxW = Math.max(HUD_FRAME_MIN.w, Math.round(root.width) || w);
      const maxH = Math.max(HUD_FRAME_MIN.h, Math.round(root.height) || h);
      let outW = Math.min(maxW, Math.max(HUD_FRAME_MIN.w, Math.round(w)));
      let outH = Math.min(maxH, Math.max(HUD_FRAME_MIN.h, Math.round(h)));
      if (!(freeForm || freePlacementRef.current || getLayoutFreePlacement())) {
        const snapped = snapFrameSizeToGrid(
          outW,
          outH,
          gridStepRef.current,
          root.width,
          root.height,
        );
        outW = snapped.w;
        outH = snapped.h;
      }
      return { w: outW, h: outH };
    };
    const axes = props.resizeAxes === "w" ? "w" : "wh";
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = axes === "w" ? 0 : e.clientY - startY;
      const rawW = corner === "br" ? startW + dx : startW - dx;
      const next = sizeFrame(rawW, startH + dy, !!e.shiftKey);
      pendingW = next.w;
      pendingH = axes === "w" ? startH : next.h;
      el.style.width = pendingW + "px";
      if (axes === "wh") el.style.height = pendingH + "px";
    };
    const onUp = () => {
      endLayoutGuide();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        (ev.currentTarget as HTMLElement).releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      if (props.onResizeFrame)
        props.onResizeFrame({ w: pendingW, h: pendingH });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const fillFrame = isPanelId(String(id))
    ? panelFillsFrame(String(id))
    : props.hugContent === false;
  const sizePos = autoSize
    ? { ...pos, frameW: undefined, frameH: undefined }
    : pos;
  const fillW =
    fillFrame && !autoSize && typeof pos.frameW === "number" && pos.frameW > 0
      ? Math.round(pos.frameW)
      : 0;
  const fillH =
    fillFrame && !autoSize && typeof pos.frameH === "number" && pos.frameH > 0
      ? Math.round(pos.frameH)
      : 0;
  const shellStyle = Object.assign(
    {},
    props.style || {},
    panelStyle(sizePos, editing || movable),
    {
      opacity: editing && hidden ? Math.min(opacity, 0.72) : opacity,
    },
    fillW > 0
      ? {
          width: fillW + "px",
          minWidth: fillW + "px",
          maxWidth: "100vw",
        }
      : null,
    fillH > 0
      ? {
          height: fillH + "px",
          minHeight: Math.min(fillH, HUD_FRAME_MIN.h) + "px",
          maxHeight: "100vh",
        }
      : null,
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
            boxShadow: "0 0 0 1px rgba(0,0,0, 0.7)",
          }
        : null,
  );
  // panelStyle stamps idle z 20/40 — preserve raise / meter stack z from props.
  applyCallerStackZ(shellStyle, props.style);
  applyAutoSizeMaxWidth(shellStyle, String(id), autoSize);
  // Fixed frameW/H sets overflowX/Y in panelStyle, which clips above-frame
  // arrange chrome. Unclip the shell when needed.
  // Hug + frame: scroll in a body wrapper — except panels that intentionally
  // paint outside (player/target frames: AggroSpark + effects overlay use
  // overflow:visible on their style; wrapping those in overflow:auto shows
  // scrollbars from the spark's -3px inset).
  const hasSavedFrame =
    !autoSize &&
    ((typeof pos.frameW === "number" && pos.frameW > 0) ||
      (typeof pos.frameH === "number" && pos.frameH > 0));
  const styleOverflowVisible = !!(
    props.style && props.style.overflow === "visible"
  );
  const wrapFrameBody =
    fillFrame || (hasSavedFrame && !styleOverflowVisible);
  // Same as !!moveGrip || lock || ungroup when !editing (grip-in-edit is false).
  const showArrangeOverlay =
    !editing &&
    ((movable && props.showMoveGrip !== false) ||
      !!props.onToggleLock ||
      !!props.onUngroup ||
      !!props.onClose);
  if (
    ((wrapFrameBody || styleOverflowVisible) && !autoSize) ||
    showArrangeOverlay ||
    editing
  ) {
    unclipShellOverflow(shellStyle);
  }

  const ARRANGE_CHROME_H = 34;
  React.useLayoutEffect(() => {
    if (!showArrangeOverlay) {
      setArrangePlacement("above");
      return;
    }
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const root = layoutDragRoot().getBoundingClientRect();
      const panel = el.getBoundingClientRect();
      // Need comfortable headroom — a tight gap above parks chrome where
      // tooltips/menus can't open below the controls.
      const fitsAbove = panel.top - ARRANGE_CHROME_H >= root.top + 40;
      setArrangePlacement(fitsAbove ? "above" : "inline");
    };
    measure();
    if (!hover) return;
    // Re-check after paint once chrome is open (size may change).
    const t = window.setTimeout(measure, 0);
    return () => window.clearTimeout(t);
  }, [showArrangeOverlay, hover, pos.x, pos.y, movable, id]);

  // Wait two frames so /comm reopen doesn't clamp against a half-laid-out root
  // and overwrite saved coordinates.
  const [clampReady, setClampReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setClampReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
    };
  }, []);

  // Recover panels parked off-screen (center/bottom anchors + edge snap).
  React.useLayoutEffect(() => {
    if (!clampReady || dragging.current) return;
    const shell = shellRef.current;
    const rootEl = layoutDragRoot();
    if (!shell || !rootEl) return;
    const pr = shell.getBoundingClientRect();
    const rr = rootEl.getBoundingClientRect();
    // Tiny root = transient mount; clamping here shoves panels to wrong spots.
    if (!(
      pr.width > 0 &&
      pr.height > 0 &&
      rr.width >= 120 &&
      rr.height >= 120
    )) {
      return;
    }
    const next = clampPanelPosInRoot(
      pos,
      pr.width,
      pr.height,
      rr.width,
      rr.height,
    );
    if (Math.abs(next.x - pos.x) > 0.05 || Math.abs(next.y - pos.y) > 0.05) {
      onMove(id, next);
    }
  }, [
    clampReady,
    pos.x,
    pos.y,
    pos.anchor,
    pos.scale,
    pos.frameW,
    pos.frameH,
    pos.autoSize,
    id,
  ]);

  const {
    editHeader,
    opacityRow,
    closeBtn,
    closeInArrangeOverlay,
    windowIdOverlay,
    needsChromeHover,
  } = PositionedPanelChrome({
    props,
    pos,
    editing,
    hidden: !!hidden,
    hover,
    touchish,
    movable,
    editChrome,
    panelLabel,
    closeSize,
    headerPad,
    headerFont,
    anchorBtn,
    opacity,
    arrangePlacement,
    showArrangeOverlay,
    onClose,
    onShow,
    setPanelHover,
    setAnchor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    autoSize,
    onToggleAutoSize: props.onAutoSizeChange
      ? () => {
          const next = !autoSize;
          if (next) {
            props.onAutoSizeChange!(true);
            return;
          }
          const el = shellRef.current;
          props.onAutoSizeChange!(
            false,
            el
              ? {
                  w: Math.round(el.offsetWidth),
                  h: Math.round(el.offsetHeight),
                }
              : undefined,
          );
        }
      : undefined,
  });

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

  const onActivateCapture = props.onActivate
    ? (_ev: any) => {
        props.onActivate!(id);
      }
    : undefined;

  return e(
    "div",
    {
      ref: shellRef,
      className: `comm-pos-panel comm-pos-${id}${fillFrame ? " comm-pos-fill" : ""}${editing ? " comm-pos-editing" : ""}${movable ? " comm-pos-movable" : ""}${interactiveBody ? " comm-pos-interactive" : ""}${hidden ? " comm-pos-hidden" : ""}${hover ? " comm-pos-chrome-open" : ""}${props.className ? ` ${props.className}` : ""}`,
      "data-panel": id,
      "data-auto-size": autoSize ? "true" : undefined,
      style: shellStyle,
      onPointerDownCapture: onActivateCapture,
      onMouseEnter: needsChromeHover ? () => setPanelHover(true) : undefined,
      onMouseLeave: needsChromeHover ? () => setPanelHover(false) : undefined,
    },
    editHeader,
    opacityRow,
    closeInArrangeOverlay ? null : closeBtn,
    windowIdOverlay,
    hidden && editing
      ? e(
          "div",
          {
            className: "comm-pos-hidden-body",
            style: hiddenBodyStyle,
          },
          `${panelLabel} — closed`,
        )
      : (wrapFrameBody || editing) && !hidden
        ? e(
            "div",
            {
              className:
                "comm-pos-panel-body" +
                (hasSavedFrame && !fillFrame ? " comm-pos-panel-body-frame" : ""),
              style: interactiveBody ? { pointerEvents: "auto" } : undefined,
            },
            children,
          )
        : children,
    showResizeHandles
      ? e("div", {
          className: "comm-pos-resize comm-pos-resize-left",
          title:
            "Resize from bottom-left (keeps top-right fixed · Shift = free size)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "bl"),
        })
      : null,
    showResizeHandles
      ? e("div", {
          className: "comm-pos-resize",
          title: getLayoutFreePlacement()
            ? "Resize from bottom-right (keeps top-left fixed · free size)"
            : "Resize from bottom-right (keeps top-left fixed · Shift = free size)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "br"),
        })
      : null,
  );
}
