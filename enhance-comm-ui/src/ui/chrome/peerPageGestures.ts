/**
 * Horizontal peer-page swipes — same thresholds as home / chat server pages.
 */

import {
  PHONE_HOME_SWIPE_MAX_OFF_AXIS,
  PHONE_HOME_SWIPE_MIN_PX,
} from "./phoneHomePageGestures";

export type PeerPageSwipeHandlers = {
  onPageSwipe: (dir: -1 | 1) => void;
  isBlocked?: () => boolean;
  /** Return false to ignore this touch start (compose, inputs, etc.). */
  allowStart?: (target: EventTarget | null) => boolean;
};

export type PeerPageSwipeSample = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

/** Pure — horizontal page swipe classification (home-page thresholds). */
export function classifyPeerPageSwipe(
  sample: PeerPageSwipeSample,
): -1 | 1 | null {
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

function defaultAllowStart(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return false;
  }
  if (target.closest("button, a, [role='button']")) return false;
  return true;
}

type ActiveStroke = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  id: number;
  claimed: boolean;
};

/**
 * Capture-phase touch listeners on `root`. Returns uninstall.
 * Claims the gesture once the stroke is clearly horizontal so Edge/Android
 * back-swipe does not cancel the page change.
 */
export function installPeerPageGestures(
  root: HTMLElement,
  handlers: PeerPageSwipeHandlers,
): () => void {
  let stroke: ActiveStroke | null = null;
  const allow = handlers.allowStart || defaultAllowStart;

  const onTouchStart = (ev: TouchEvent) => {
    if (handlers.isBlocked && handlers.isBlocked()) {
      stroke = null;
      return;
    }
    if (ev.touches.length !== 1) {
      stroke = null;
      return;
    }
    if (!allow(ev.target)) {
      stroke = null;
      return;
    }
    const t = ev.touches[0];
    stroke = {
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      lastY: t.clientY,
      id: t.identifier,
      claimed: false,
    };
  };

  const onTouchMove = (ev: TouchEvent) => {
    if (!stroke || ev.touches.length !== 1) return;
    const t = ev.touches[0];
    if (t.identifier !== stroke.id) return;
    stroke.lastX = t.clientX;
    stroke.lastY = t.clientY;
    const dx = t.clientX - stroke.startX;
    const dy = t.clientY - stroke.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!stroke.claimed) {
      if (absX < 12) return;
      if (absY > absX * PHONE_HOME_SWIPE_MAX_OFF_AXIS) {
        stroke = null;
        return;
      }
      stroke.claimed = true;
    }
    if (stroke.claimed && ev.cancelable) ev.preventDefault();
  };

  const onTouchEnd = (ev: TouchEvent) => {
    if (!stroke) return;
    const active = stroke;
    stroke = null;
    if (handlers.isBlocked && handlers.isBlocked()) return;
    let endX = active.lastX;
    let endY = active.lastY;
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
    const dir = classifyPeerPageSwipe({
      startX: active.startX,
      startY: active.startY,
      endX,
      endY,
    });
    if (dir) handlers.onPageSwipe(dir);
  };

  root.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  root.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });
  root.addEventListener("touchend", onTouchEnd, {
    passive: true,
    capture: true,
  });
  root.addEventListener("touchcancel", onTouchEnd, {
    passive: true,
    capture: true,
  });

  return () => {
    stroke = null;
    root.removeEventListener("touchstart", onTouchStart, true);
    root.removeEventListener("touchmove", onTouchMove, true);
    root.removeEventListener("touchend", onTouchEnd, true);
    root.removeEventListener("touchcancel", onTouchEnd, true);
  };
}

/**
 * Drill-in back: right swipe only (dir -1) → onBack.
 */
export function installDrillBackSwipe(
  root: HTMLElement,
  handlers: {
    onBack: () => void;
    isActive?: () => boolean;
    allowStart?: (target: EventTarget | null) => boolean;
  },
): () => void {
  return installPeerPageGestures(root, {
    allowStart: handlers.allowStart,
    isBlocked: () =>
      handlers.isActive ? !handlers.isActive() : false,
    onPageSwipe: (dir) => {
      if (dir === -1) handlers.onBack();
    },
  });
}
