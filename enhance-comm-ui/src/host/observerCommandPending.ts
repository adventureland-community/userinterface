/**
 * Tracks in-flight o:command dispatches for bag/gear UI feedback.
 */

type PendingListener = () => void;

let pendingCount = 0;
const listeners: PendingListener[] = [];
let clearTimer: number | null = null;

function notify(): void {
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function isObserverCommandPending(): boolean {
  return pendingCount > 0;
}

export function subscribeObserverCommandPending(
  listener: PendingListener,
): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/** Mark an observer command as started (emit succeeded). */
export function markObserverCommandPending(): void {
  pendingCount += 1;
  if (clearTimer != null) {
    window.clearTimeout(clearTimer);
    clearTimer = null;
  }
  notify();
}

/** Clear pending state after bag sync or safety timeout. */
export function clearObserverCommandPending(): void {
  if (pendingCount <= 0) return;
  pendingCount = 0;
  if (clearTimer != null) {
    window.clearTimeout(clearTimer);
    clearTimer = null;
  }
  notify();
}

/** Schedule a fallback clear if no bag refresh arrives. */
export function scheduleObserverCommandPendingClear(ms = 1400): void {
  if (clearTimer != null) window.clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => {
    clearTimer = null;
    clearObserverCommandPending();
  }, ms);
}
