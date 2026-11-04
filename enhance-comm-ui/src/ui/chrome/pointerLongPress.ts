/**
 * Long-press pointer helper for touchish Comm UI.
 * Fires `onLongPress` after a hold; short release fires `onTap` when provided.
 */

export const LONG_PRESS_DELAY_MS = 450;
export const LONG_PRESS_MOVE_PX = 10;

export type LongPressPhase = "pending" | "fired" | "cancelled" | "tapped";

export type LongPressClassifyStart = {
  pointerId: number;
  x: number;
  y: number;
  atMs: number;
};

export type LongPressClassifyMove = {
  start: LongPressClassifyStart;
  x: number;
  y: number;
  moveSlopPx?: number;
};

export type LongPressClassifyEnd = {
  start: LongPressClassifyStart;
  atMs: number;
  fired: boolean;
  cancelled: boolean;
  delayMs?: number;
};

/** True when the pointer moved past the cancel slop. */
export function longPressMovedTooFar(opts: LongPressClassifyMove): boolean {
  const slop =
    typeof opts.moveSlopPx === "number" ? opts.moveSlopPx : LONG_PRESS_MOVE_PX;
  const dx = opts.x - opts.start.x;
  const dy = opts.y - opts.start.y;
  return dx * dx + dy * dy > slop * slop;
}

/** Outcome when the pointer is released. */
export function classifyLongPressEnd(
  opts: LongPressClassifyEnd,
): LongPressPhase {
  if (opts.cancelled) return "cancelled";
  if (opts.fired) return "fired";
  const delay =
    typeof opts.delayMs === "number" ? opts.delayMs : LONG_PRESS_DELAY_MS;
  if (opts.atMs - opts.start.atMs >= delay) return "fired";
  return "tapped";
}

export type InstallLongPressOpts = {
  delayMs?: number;
  moveSlopPx?: number;
  /** Return true to ignore this pointerdown (e.g. multi-touch). */
  shouldIgnore?: (ev: PointerEvent) => boolean;
  onLongPress: (ev: PointerEvent) => void;
  onTap?: (ev: PointerEvent) => void;
};

/**
 * Install long-press on `target` (capture). Returns unsubscribe.
 * Suppresses the click that follows a fired long-press.
 */
export function installLongPress(
  target: HTMLElement,
  opts: InstallLongPressOpts,
): () => void {
  const delay =
    typeof opts.delayMs === "number" ? opts.delayMs : LONG_PRESS_DELAY_MS;
  const slop =
    typeof opts.moveSlopPx === "number" ? opts.moveSlopPx : LONG_PRESS_MOVE_PX;

  let start: LongPressClassifyStart | null = null;
  let timer: number | null = null;
  let fired = false;
  let cancelled = false;
  let suppressClick = false;
  let lastEvent: PointerEvent | null = null;

  const clearTimer = () => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const reset = () => {
    clearTimer();
    start = null;
    fired = false;
    cancelled = false;
    lastEvent = null;
  };

  const onDown = (ev: PointerEvent) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    if (opts.shouldIgnore && opts.shouldIgnore(ev)) return;
    reset();
    start = {
      pointerId: ev.pointerId,
      x: ev.clientX,
      y: ev.clientY,
      atMs: typeof ev.timeStamp === "number" ? ev.timeStamp : Date.now(),
    };
    lastEvent = ev;
    fired = false;
    cancelled = false;
    timer = window.setTimeout(() => {
      timer = null;
      if (!start || cancelled) return;
      fired = true;
      suppressClick = true;
      const pe = lastEvent || ev;
      opts.onLongPress(pe);
    }, delay);
  };

  const onMove = (ev: PointerEvent) => {
    if (!start || start.pointerId !== ev.pointerId) return;
    lastEvent = ev;
    if (
      longPressMovedTooFar({
        start,
        x: ev.clientX,
        y: ev.clientY,
        moveSlopPx: slop,
      })
    ) {
      cancelled = true;
      clearTimer();
    }
  };

  const onUp = (ev: PointerEvent) => {
    if (!start || start.pointerId !== ev.pointerId) return;
    const phase = classifyLongPressEnd({
      start,
      atMs: typeof ev.timeStamp === "number" ? ev.timeStamp : Date.now(),
      fired,
      cancelled,
      delayMs: delay,
    });
    clearTimer();
    const wasFired = fired;
    reset();
    if (phase === "tapped" && opts.onTap && !wasFired) {
      opts.onTap(ev);
    }
  };

  const onCancel = (ev: PointerEvent) => {
    if (!start || start.pointerId !== ev.pointerId) return;
    cancelled = true;
    reset();
  };

  const onClick = (ev: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    ev.preventDefault();
    ev.stopPropagation();
  };

  target.addEventListener("pointerdown", onDown, true);
  target.addEventListener("pointermove", onMove, true);
  target.addEventListener("pointerup", onUp, true);
  target.addEventListener("pointercancel", onCancel, true);
  target.addEventListener("click", onClick, true);

  return () => {
    reset();
    suppressClick = false;
    target.removeEventListener("pointerdown", onDown, true);
    target.removeEventListener("pointermove", onMove, true);
    target.removeEventListener("pointerup", onUp, true);
    target.removeEventListener("pointercancel", onCancel, true);
    target.removeEventListener("click", onClick, true);
  };
}
