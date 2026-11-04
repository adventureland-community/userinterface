/**
 * Center-band horizontal swipes on phone combat home → meter page change.
 * Edge bands stay free for back / shade / drawer gestures.
 */

import { phoneDockHeightPx, PHONE_DOCK_FALLBACK_PX } from "../../lib/phoneChrome";
import { detectViewportProfile } from "../../lib/viewport";
import { PHONE_EDGE_INSET_PX } from "./phoneEdgeGestures";

export const PHONE_HOME_SWIPE_MIN_PX = 64;
export const PHONE_HOME_SWIPE_MAX_OFF_AXIS = 0.55;

export type PhoneHomePageSwipeHandlers = {
  /** dir &lt; 0 previous page, &gt; 0 next page */
  onPageSwipe: (dir: -1 | 1) => void;
  /** When true, ignore (overlays open). */
  isBlocked: () => boolean;
};

export type HomePageSwipeSample = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  viewportW: number;
  viewportH: number;
  bottomExcludeTop: number;
};

/**
 * True when the stroke starts in the combat-home band (not edge / dock).
 */
export function classifyPhoneHomePageStart(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
  bottomExcludeTop: number,
  edgeInset = PHONE_EDGE_INSET_PX,
): boolean {
  if (!(viewportW > 0 && viewportH > 0)) return false;
  if (x <= edgeInset || x >= viewportW - edgeInset) return false;
  if (y <= edgeInset) return false;
  if (y >= bottomExcludeTop) return false;
  return true;
}

/**
 * Returns -1 (prev) / 1 (next) / null for a completed center horizontal swipe.
 * Samsung: swipe left → next page, swipe right → previous page.
 */
export function classifyPhoneHomePageSwipe(
  sample: HomePageSwipeSample,
): -1 | 1 | null {
  if (
    !classifyPhoneHomePageStart(
      sample.startX,
      sample.startY,
      sample.viewportW,
      sample.viewportH,
      sample.bottomExcludeTop,
    )
  ) {
    return null;
  }
  const dx = sample.endX - sample.startX;
  const dy = sample.endY - sample.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < PHONE_HOME_SWIPE_MIN_PX) return null;
  if (absY > absX * PHONE_HOME_SWIPE_MAX_OFF_AXIS) return null;
  if (dx < 0) return 1;
  if (dx > 0) return -1;
  return null;
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  if (
    target.closest(
      ".CodeMirror, .ecu-chat-log, .ecu-chat-body, .ecu-phone-sheet, .ecu-phone-shade, .ecu-phone-dock, .ecu-cam-stick, .ecu-cam-chrome, .ecu-meter-shell, [data-panel]",
    )
  ) {
    return true;
  }
  return false;
}

function bottomExcludeTopPx(viewportH: number): number {
  const dock = phoneDockHeightPx() || PHONE_DOCK_FALLBACK_PX;
  const bottom = document.getElementById("bottom");
  const chromeH = bottom
    ? Math.round(bottom.getBoundingClientRect().height)
    : 0;
  return Math.max(0, viewportH - dock - Math.max(chromeH, 0) - 8);
}

let installed = false;
let handlersRef: PhoneHomePageSwipeHandlers | null = null;

type ActiveStroke = {
  startX: number;
  startY: number;
  id: number;
};

let stroke: ActiveStroke | null = null;

function onTouchStart(ev: TouchEvent): void {
  if (detectViewportProfile() !== "phone") return;
  if (!handlersRef || handlersRef.isBlocked()) {
    stroke = null;
    return;
  }
  // Leave two-finger pinches to world zoom.
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
  if (
    !classifyPhoneHomePageStart(
      t.clientX,
      t.clientY,
      vw,
      vh,
      bottomExcludeTopPx(vh),
    )
  ) {
    stroke = null;
    return;
  }
  stroke = { startX: t.clientX, startY: t.clientY, id: t.identifier };
}

function onTouchEnd(ev: TouchEvent): void {
  if (!stroke) return;
  const active = stroke;
  stroke = null;
  if (detectViewportProfile() !== "phone") return;
  if (!handlersRef || handlersRef.isBlocked()) return;
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
  const dir = classifyPhoneHomePageSwipe({
    startX: active.startX,
    startY: active.startY,
    endX,
    endY,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    bottomExcludeTop: bottomExcludeTopPx(window.innerHeight),
  });
  if (dir) handlersRef.onPageSwipe(dir);
}

export function installPhoneHomePageGestures(
  handlers: PhoneHomePageSwipeHandlers,
): () => void {
  handlersRef = handlers;
  if (!installed && typeof window !== "undefined") {
    installed = true;
    window.addEventListener("touchstart", onTouchStart, {
      passive: true,
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

export function uninstallPhoneHomePageGestures(): void {
  handlersRef = null;
  stroke = null;
  if (!installed || typeof window === "undefined") return;
  installed = false;
  window.removeEventListener("touchstart", onTouchStart, true);
  window.removeEventListener("touchend", onTouchEnd, true);
  window.removeEventListener("touchcancel", onTouchEnd, true);
}
