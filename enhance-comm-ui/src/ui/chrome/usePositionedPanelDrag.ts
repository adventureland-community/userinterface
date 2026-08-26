/**
 * Panel drag session for PositionedPanel — owns begin/move/end, window
 * capture listeners, Alt-release finish, and handler pinning so play-arrange
 * chrome can unmount mid-drag without losing pointerup.
 */

import { getReact } from "../../host/react";
import {
  commWindowDragMove,
  commWindowPeerSnapAxes,
  finishCommWindowDragDrop,
  type CommWindowGraphState,
} from "../../lib/commWindowGroup";
import { panelHasSnap } from "../../lib/panelEdgeGroup";
import {
  isSnapPeerElement,
  queryCommPosPanel,
} from "../../lib/panelEdgeSnapDom";
import {
  isPlaceWithoutGroupModifier,
  type PanelGroupDragOpts,
} from "../../lib/panelGroupDrag";
import {
  captureVisualSnapStart,
  clampPanelPosInRoot,
  softAvoidOverlap,
  type PanelId,
  type PanelPos,
  type VisualSnapStart,
} from "../../lib/layout";
import { getLayoutFreePlacement } from "../../lib/layoutEditPrefs";
import {
  layoutDragRoot,
  percentFromPointerDrag,
  tryReleasePointerCapture,
  trySetPointerCapture,
  type PercentDragStart,
} from "../../lib/percentDrag";
import { beginLayoutGuide, endLayoutGuide } from "../../lib/layoutGuide";

export type UsePositionedPanelDragArgs = {
  id: PanelId | string;
  pos: PanelPos;
  editing: boolean;
  /** Raw `movable` prop (before dragPinned merge). */
  movableProp: boolean;
  softAvoid?: boolean;
  /** Comm window graph — peer layout + drag-finish policy. */
  getGraphState?: () => CommWindowGraphState;
  shellRef: { current: HTMLDivElement | null };
  extraDragRef?: { current: HTMLElement | null };
  freePlacementRef: { current: boolean };
  gridStepRef: { current: number };
  onMove: (id: any, pos: PanelPos) => void;
  onMoveEnd?: (id: any, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
  onDragStart?: (id: any) => void;
  onDragMove?: (id: any, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
};

export type UsePositionedPanelDragResult = {
  dragPinned: boolean;
  draggingRef: { current: boolean };
  onPointerDown: (ev: any) => void;
  onPointerMove: (ev: any) => void;
  onPointerUp: (ev: any) => void;
};

export function usePositionedPanelDrag(
  args: UsePositionedPanelDragArgs,
): UsePositionedPanelDragResult {
  const React = getReact();
  const {
    id,
    pos,
    editing,
    movableProp,
    softAvoid,
    getGraphState,
    shellRef,
    extraDragRef,
    freePlacementRef,
    gridStepRef,
    onMove,
    onMoveEnd,
    onDragStart,
    onDragMove,
  } = args;

  const dragging = React.useRef(false);
  /** Keep play-arrange chrome mounted if Alt drops mid-drag (otherwise pointerup is lost). */
  const [dragPinned, setDragPinned] = React.useState(false);
  const moveEndRef = React.useRef(onMoveEnd);
  const dragStartRef = React.useRef(onDragStart);
  // Keep last known handlers while dragging — Alt release clears playArrange
  // props (onMoveEnd → undefined) before pointerup on Windows.
  if (onMoveEnd) moveEndRef.current = onMoveEnd;
  if (onDragStart) dragStartRef.current = onDragStart;
  const winDragCleanupRef = React.useRef(null as (() => void) | null);
  const start = React.useRef({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  } as PercentDragStart);
  const visualStart = React.useRef(null as VisualSnapStart | null);
  const lastPos = React.useRef(pos);
  lastPos.current = pos;
  const skipGroupRef = React.useRef(false);
  const dragKeyCleanupRef = React.useRef(null as (() => void) | null);
  const onDragMoveRef = React.useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const softAvoidRef = React.useRef(softAvoid);
  softAvoidRef.current = softAvoid;
  const getGraphStateRef = React.useRef(getGraphState);
  getGraphStateRef.current = getGraphState;
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;
  const posRef = React.useRef(pos);
  posRef.current = pos;

  const groupDragOpts = (): PanelGroupDragOpts | undefined =>
    skipGroupRef.current ? { skipGroupJoin: true } : undefined;

  const syncGroupSnapSuppress = (held: boolean) => {
    skipGroupRef.current = held;
  };

  const detachDragKeyListeners = () => {
    if (!dragKeyCleanupRef.current) return;
    dragKeyCleanupRef.current();
    dragKeyCleanupRef.current = null;
  };

  const detachWinDragListeners = () => {
    if (!winDragCleanupRef.current) return;
    winDragCleanupRef.current();
    winDragCleanupRef.current = null;
  };

  const attachDragKeyListeners = () => {
    detachDragKeyListeners();
    const onKey = (e: KeyboardEvent) => {
      if (!dragging.current) return;
      if (e.key !== "Control") return;
      const held = e.ctrlKey;
      if (held === skipGroupRef.current) return;
      syncGroupSnapSuppress(held);
      if (onDragMoveRef.current) {
        onDragMoveRef.current(id, lastPos.current, groupDragOpts());
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    dragKeyCleanupRef.current = () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  };

  const isPeerVisible = (peerId: string): boolean => {
    const el = queryCommPosPanel(peerId);
    return !!el && isSnapPeerElement(el);
  };

  const peerAxes = (): { xs: number[]; ys: number[] } => {
    const getState = getGraphStateRef.current;
    if (!getState) return { xs: [], ys: [] };
    return commWindowPeerSnapAxes(getState(), id, isPeerVisible);
  };

  const finishDrag = (ev?: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    setDragPinned(false);
    visualStart.current = null;
    if (ev) syncGroupSnapSuppress(isPlaceWithoutGroupModifier(ev));
    detachDragKeyListeners();
    detachWinDragListeners();
    if (ev && ev.currentTarget) {
      tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
    }
    let finalPos = lastPos.current;
    const getState = getGraphStateRef.current;
    const root = layoutDragRoot().getBoundingClientRect();
    if (getState) {
      finalPos = finishCommWindowDragDrop({
        id,
        pos: lastPos.current,
        state: getState(),
        softAvoid: softAvoidRef.current !== false,
        freePlacement:
          freePlacementRef.current || getLayoutFreePlacement(),
        gridStep: gridStepRef.current,
        rootWidth: root.width,
        rootHeight: root.height,
      });
    } else if (softAvoidRef.current !== false) {
      const nudged = softAvoidOverlap(id, lastPos.current, {});
      if (nudged.x !== lastPos.current.x || nudged.y !== lastPos.current.y) {
        finalPos = nudged;
      }
    }
    if (finalPos.x !== lastPos.current.x || finalPos.y !== lastPos.current.y) {
      onMoveRef.current(id, finalPos);
    }
    const end = moveEndRef.current;
    if (end) end(id, finalPos, groupDragOpts());
    else endLayoutGuide();
    skipGroupRef.current = false;
    syncGroupSnapSuppress(false);
  };

  const finishDragRef = React.useRef(finishDrag);
  finishDragRef.current = finishDrag;

  React.useEffect(() => {
    return () => {
      detachDragKeyListeners();
      detachWinDragListeners();
      skipGroupRef.current = false;
      if (dragging.current) {
        // Same end path as pointer-up (snap + onMoveEnd), not guide-only.
        finishDragRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (ev: any) => {
    if (!editing && !movableProp && !dragPinned) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging.current = true;
    setDragPinned(true);
    const cur = posRef.current;
    start.current = {
      clientX: ev.clientX,
      clientY: ev.clientY,
      posX: cur.x,
      posY: cur.y,
    };
    visualStart.current = captureVisualSnapStart(
      shellRef.current,
      layoutDragRoot(),
      cur,
    );
    syncGroupSnapSuppress(isPlaceWithoutGroupModifier(ev));
    attachDragKeyListeners();
    if (dragStartRef.current) dragStartRef.current(id);
    trySetPointerCapture(ev.currentTarget, ev.pointerId);
    // Window listeners survive Alt-release remounts of arrange chrome.
    // Capture phase: Windows Alt→menu-bar often swallows bubble pointerup.
    detachWinDragListeners();
    const onWinMove = (e: PointerEvent) =>
      dragHandlersRef.current.onPointerMove(e);
    const onWinUp = (e: Event) => dragHandlersRef.current.onPointerUp(e);
    const onAltUp = (e: KeyboardEvent) => {
      if (!dragging.current) return;
      if (e.key !== "Alt" && e.code !== "AltLeft" && e.code !== "AltRight") {
        return;
      }
      // Releasing Alt ends play-arrange; Windows may never deliver pointerup.
      finishDragRef.current(e);
    };
    const onWinBlur = () => {
      if (!dragging.current) return;
      finishDragRef.current();
    };
    window.addEventListener("pointermove", onWinMove, true);
    window.addEventListener("pointerup", onWinUp, true);
    window.addEventListener("pointercancel", onWinUp, true);
    window.addEventListener("lostpointercapture", onWinUp, true);
    window.addEventListener("keyup", onAltUp, true);
    window.addEventListener("blur", onWinBlur);
    winDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", onWinMove, true);
      window.removeEventListener("pointerup", onWinUp, true);
      window.removeEventListener("pointercancel", onWinUp, true);
      window.removeEventListener("lostpointercapture", onWinUp, true);
      window.removeEventListener("keyup", onAltUp, true);
      window.removeEventListener("blur", onWinBlur);
    };
  };

  const onPointerMove = (ev: any) => {
    if (!dragging.current) return;
    syncGroupSnapSuppress(isPlaceWithoutGroupModifier(ev));
    const raw = percentFromPointerDrag(ev.clientX, ev.clientY, start.current);
    const free = freePlacementRef.current || getLayoutFreePlacement();
    let rootWidth = 0;
    let rootHeight = 0;
    if (!free) {
      const root = layoutDragRoot().getBoundingClientRect();
      rootWidth = root.width;
      rootHeight = root.height;
    }
    const { xs, ys } = peerAxes();
    // Grouped panels must translate as a rigid body — peer % magnets would
    // yank only the leader onto another panel's anchor and scramble relatives.
    const cur = posRef.current;
    const skipPeer =
      skipGroupRef.current ||
      panelHasSnap({ id: String(id), pos: cur, snap: cur.snap });
    const snapped = commWindowDragMove({
      rawX: raw.x,
      rawY: raw.y,
      clientX: ev.clientX,
      clientY: ev.clientY,
      start: start.current,
      visual: visualStart.current,
      free,
      gridStep: gridStepRef.current,
      rootWidth,
      rootHeight,
      peerXs: xs,
      peerYs: ys,
      skipPeerSnap: skipPeer,
    });
    let nextPos: PanelPos = { ...cur, x: snapped.x, y: snapped.y };
    const shell = shellRef.current;
    const rootEl = layoutDragRoot();
    if (shell && rootEl) {
      const pr = shell.getBoundingClientRect();
      const rr = rootEl.getBoundingClientRect();
      if (pr.width > 0 && pr.height > 0 && rr.width > 0 && rr.height > 0) {
        nextPos = clampPanelPosInRoot(
          nextPos,
          pr.width,
          pr.height,
          rr.width,
          rr.height,
        );
      }
    }
    lastPos.current = nextPos;
    onMoveRef.current(id, nextPos);
    if (onDragMoveRef.current) {
      onDragMoveRef.current(id, nextPos, groupDragOpts());
    }
  };

  const onPointerUp = (ev: any) => {
    finishDrag(ev);
  };

  // Keep handlers stable for extraDragRef attachment.
  const dragHandlersRef = React.useRef({
    onPointerDown,
    onPointerMove,
    onPointerUp,
  });
  dragHandlersRef.current = { onPointerDown, onPointerMove, onPointerUp };

  React.useEffect(() => {
    const el = extraDragRef?.current;
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
      // Only detach host listeners. An in-progress Alt-arrange drag keeps
      // window pointer listeners + layout guide until pointerup (or unmount).
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    // Rebind when arrange/edit toggles or the drag host node appears — do NOT
    // depend on pos.x/y (that re-attached listeners every move and broke capture).
  }, [extraDragRef, editing, movableProp, id]);

  // Inner title bars (paperdoll, Kills, …) opt in with data-comm-drag-handle so
  // Alt-arrange works even when the above-frame strip is hard to grab.
  React.useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!editing && !movableProp) return;
    const down = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement | null;
      if (!t || typeof t.closest !== "function") return;
      if (!t.closest("[data-comm-drag-handle]")) return;
      if (
        t.closest(
          "button, a, input, textarea, select, .ecu-meter-tool, .ecu-meter-ttl, .ecu-meter-btn",
        )
      ) {
        return;
      }
      dragHandlersRef.current.onPointerDown(ev);
    };
    shell.addEventListener("pointerdown", down);
    return () => shell.removeEventListener("pointerdown", down);
  }, [shellRef, editing, movableProp, id]);

  return {
    dragPinned,
    draggingRef: dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
