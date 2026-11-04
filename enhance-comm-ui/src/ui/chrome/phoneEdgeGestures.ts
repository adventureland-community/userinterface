/**
 * Phone edge gestures (Samsung-learned):
 * left/right = back, top = shade, bottom = app drawer.
 * Edge-started only so map move/pinch and home-page swipes stay free.
 */

import { phoneDockHeightPx, PHONE_DOCK_FALLBACK_PX } from "../../lib/phoneChrome";
import { detectViewportProfile } from "../../lib/viewport";

export type PhoneEdge = "left" | "right" | "top" | "bottom";

export type PhoneEdgeGestureHandlers = {
  onLeft: () => void;
  onRight: () => void;
  onBottom: () => void;
  onTop: () => void;
};

export const PHONE_EDGE_INSET_PX = 24;
export const PHONE_EDGE_BOTTOM_BAND_PX = 32;
export const PHONE_EDGE_MIN_DIST_PX = 72;
/** Max |off-axis| / |main-axis| for a committed swipe. */
export const PHONE_EDGE_MAX_OFF_AXIS = 0.65;

export type EdgeSwipeSample = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  viewportW: number;
  viewportH: number;
  /** Bottom safe band top (dock top), for bottom-edge starts. */
  bottomBandTop: number;
};

export function classifyPhoneEdgeStart(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
  bottomBandTop: number,
  inset = PHONE_EDGE_INSET_PX,
): PhoneEdge | null {
  if (!(viewportW > 0 && viewportH > 0)) return null;
  if (x <= inset) return "left";
  if (x >= viewportW - inset) return "right";
  if (y <= inset) return "top";
  if (y >= bottomBandTop && y <= viewportH) return "bottom";
  return null;
}

/**
 * Returns the edge that completed an inward swipe, or null.
 * Pure — used by tests and the live touch path.
 */
export function classifyPhoneEdgeSwipe(
  sample: EdgeSwipeSample,
): PhoneEdge | null {
  const edge = classifyPhoneEdgeStart(
    sample.startX,
    sample.startY,
    sample.viewportW,
    sample.viewportH,
    sample.bottomBandTop,
  );
  if (!edge) return null;
  const dx = sample.endX - sample.startX;
  const dy = sample.endY - sample.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (edge === "left" || edge === "right") {
    if (absX < PHONE_EDGE_MIN_DIST_PX) return null;
    if (absY > absX * PHONE_EDGE_MAX_OFF_AXIS) return null;
    if (edge === "left" && dx > 0) return "left";
    if (edge === "right" && dx < 0) return "right";
    return null;
  }
  if (absY < PHONE_EDGE_MIN_DIST_PX) return null;
  if (absX > absY * PHONE_EDGE_MAX_OFF_AXIS) return null;
  if (edge === "top" && dy > 0) return "top";
  if (edge === "bottom" && dy < 0) return "bottom";
  return null;
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  if (target.closest(".CodeMirror, .ecu-chat-log, .ecu-chat-body")) {
    return true;
  }
  // Shade / full sheet (handle + header + body) own their gestures.
  // Dock buttons stay allowed so swipe-up from the bar can open Apps.
  if (target.closest(".ecu-phone-shade, .ecu-phone-sheet")) {
    return true;
  }
  // Camera joystick + FOV cluster own their pointer stream.
  if (target.closest(".ecu-cam-stick, .ecu-cam-chrome")) {
    return true;
  }
  return false;
}

function bottomBandTopPx(viewportH: number): number {
  const dock = phoneDockHeightPx() || PHONE_DOCK_FALLBACK_PX;
  // Start band at the top of the Material dock so swipe-up works on the bar.
  return Math.max(0, viewportH - dock - PHONE_EDGE_BOTTOM_BAND_PX);
}

let installed = false;
let handlersRef: PhoneEdgeGestureHandlers | null = null;

type ActiveStroke = {
  edge: PhoneEdge;
  startX: number;
  startY: number;
  id: number;
  committed: boolean;
};

let stroke: ActiveStroke | null = null;

function fire(edge: PhoneEdge): void {
  const h = handlersRef;
  if (!h) return;
  if (edge === "left") h.onLeft();
  else if (edge === "right") h.onRight();
  else if (edge === "bottom") h.onBottom();
  else h.onTop();
}

function onTouchStart(ev: TouchEvent): void {
  if (detectViewportProfile() !== "phone") return;
  // Two-finger pinch belongs to world zoom — never start an edge stroke.
  if (ev.touches.length !== 1) {
    stroke = null;
    return;
  }
  if (isIgnoredTarget(ev.target)) {
    stroke = null;
    return;
  }
  const t = ev.touches[0];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bandTop = bottomBandTopPx(vh);
  const edge = classifyPhoneEdgeStart(t.clientX, t.clientY, vw, vh, bandTop);
  if (!edge) {
    stroke = null;
    return;
  }
  stroke = {
    edge,
    startX: t.clientX,
    startY: t.clientY,
    id: t.identifier,
    committed: false,
  };
}

function onTouchMove(ev: TouchEvent): void {
  if (!stroke || detectViewportProfile() !== "phone") return;
  if (ev.touches.length !== 1) {
    stroke = null;
    return;
  }
  const t = ev.touches[0];
  if (t.identifier !== stroke.id) return;
  const classified = classifyPhoneEdgeSwipe({
    startX: stroke.startX,
    startY: stroke.startY,
    endX: t.clientX,
    endY: t.clientY,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    bottomBandTop: bottomBandTopPx(window.innerHeight),
  });
  if (classified === stroke.edge) {
    stroke.committed = true;
    ev.preventDefault();
  }
}

function onTouchEnd(ev: TouchEvent): void {
  if (!stroke) return;
  const active = stroke;
  stroke = null;
  if (detectViewportProfile() !== "phone") return;
  let endX = active.startX;
  let endY = active.startY;
  if (ev.changedTouches.length) {
    for (let i = 0; i < ev.changedTouches.length; i++) {
      const t = ev.changedTouches[i];
      if (t.identifier === active.id) {
        endX = t.clientX;
        endY = t.clientY;
        break;
      }
    }
  }
  const edge = classifyPhoneEdgeSwipe({
    startX: active.startX,
    startY: active.startY,
    endX,
    endY,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    bottomBandTop: bottomBandTopPx(window.innerHeight),
  });
  if (edge === active.edge) {
    // Swipe-up from a dock button would also synthesize a click — swallow it.
    if (edge === "bottom" && active.committed) {
      const suppress = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener("click", suppress, true);
      window.setTimeout(
        () => window.removeEventListener("click", suppress, true),
        450,
      );
    }
    fire(edge);
  }
}

/**
 * Install (or replace) phone edge gesture handlers. No-op off phone until
 * profile becomes phone — listeners stay and gate on profile.
 */
export function installPhoneEdgeGestures(
  handlers: PhoneEdgeGestureHandlers,
): () => void {
  handlersRef = handlers;
  if (!installed && typeof window !== "undefined") {
    installed = true;
    window.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchend", onTouchEnd, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
      capture: true,
    });
  }
  return () => {
    if (handlersRef === handlers) handlersRef = null;
  };
}

export function uninstallPhoneEdgeGestures(): void {
  handlersRef = null;
  stroke = null;
  if (!installed || typeof window === "undefined") return;
  installed = false;
  window.removeEventListener("touchstart", onTouchStart, true);
  window.removeEventListener("touchmove", onTouchMove, true);
  window.removeEventListener("touchend", onTouchEnd, true);
  window.removeEventListener("touchcancel", onTouchEnd, true);
}
