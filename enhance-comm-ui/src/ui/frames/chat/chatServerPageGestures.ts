/**
 * Horizontal swipe on phone chat main → step server conversation pages.
 * Axis gates match home-page swipes; start must be inside `.ecu-chat-main`
 * and outside the composer / form controls.
 */

import {
  PHONE_HOME_SWIPE_MAX_OFF_AXIS,
  PHONE_HOME_SWIPE_MIN_PX,
} from "../../chrome/phoneHomePageGestures";

export type ChatServerPageSwipeHandlers = {
  onPageSwipe: (dir: -1 | 1) => void;
  isBlocked: () => boolean;
};

export type ChatServerPageSwipeSample = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

/** Pure — horizontal page swipe classification (home-page thresholds). */
export function classifyChatServerPageSwipe(
  sample: ChatServerPageSwipeSample,
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

function isIgnoredStartTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  if (target.closest(".ecu-chat-compose, .ecu-chat-to, .ecu-chat-input")) {
    return true;
  }
  return false;
}

function startAllowsServerPageSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isIgnoredStartTarget(target)) return false;
  if (!target.closest(".ecu-chat-main")) return false;
  if (target.closest(".ecu-chat-compose")) return false;
  return true;
}

type ActiveStroke = {
  startX: number;
  startY: number;
  id: number;
};

/**
 * Attach capture-phase touch listeners to a chat main node.
 * Returns an uninstall function.
 */
export function installChatServerPageGestures(
  root: HTMLElement,
  handlers: ChatServerPageSwipeHandlers,
): () => void {
  let stroke: ActiveStroke | null = null;

  const onTouchStart = (ev: TouchEvent) => {
    if (handlers.isBlocked()) {
      stroke = null;
      return;
    }
    if (ev.touches.length !== 1) {
      stroke = null;
      return;
    }
    if (!startAllowsServerPageSwipe(ev.target)) {
      stroke = null;
      return;
    }
    const t = ev.touches[0];
    stroke = { startX: t.clientX, startY: t.clientY, id: t.identifier };
  };

  const onTouchEnd = (ev: TouchEvent) => {
    if (!stroke) return;
    const active = stroke;
    stroke = null;
    if (handlers.isBlocked()) return;
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
    const dir = classifyChatServerPageSwipe({
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
    root.removeEventListener("touchend", onTouchEnd, true);
    root.removeEventListener("touchcancel", onTouchEnd, true);
  };
}
