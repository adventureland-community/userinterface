/**
 * Transient layout guide visibility — show the square grid while dragging
 * or resizing windows (play-arrange + layout edit).
 */

type Listener = () => void;

let depth = 0;
const listeners: Listener[] = [];

function notify(): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i]();
  }
}

export function isLayoutGuideActive(): boolean {
  return depth > 0;
}

/** Begin a drag/resize guide session (refcount). */
export function beginLayoutGuide(): void {
  depth += 1;
  if (depth === 1) notify();
}

/** End a drag/resize guide session. */
export function endLayoutGuide(): void {
  if (depth <= 0) {
    depth = 0;
    return;
  }
  depth -= 1;
  if (depth === 0) notify();
}

/**
 * Force-clear the guide (Alt released mid-drag, remount, lost pointerup).
 * Safe to call when depth is already 0.
 */
export function resetLayoutGuide(): void {
  if (depth === 0) return;
  depth = 0;
  notify();
}

export function subscribeLayoutGuide(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
