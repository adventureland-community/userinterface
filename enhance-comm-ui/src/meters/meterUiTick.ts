/**
 * Coalesced meter UI tick — ingest never paints; panels subscribe here.
 * Cap at ~20 Hz so hit spam cannot schedule a React/DOM flush every frame
 * (the game's own rAF loop needs the leftover budget).
 */

type Listener = () => void;

const MIN_FLUSH_MS = 50;

const listeners: Listener[] = [];
let dirty = false;
let raf = 0;
let delay = 0;
let lastFlushAt = 0;

function notify(): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i]();
  }
}

function flush(): void {
  raf = 0;
  if (!dirty) return;
  // Keep dirty so combat ingest is not dropped — paint when the tab is back.
  if (typeof document !== "undefined" && document.hidden) return;
  dirty = false;
  lastFlushAt = performance.now();
  notify();
}

function schedule(): void {
  if (raf || delay) return;
  const wait = MIN_FLUSH_MS - (performance.now() - lastFlushAt);
  if (wait > 0) {
    delay = window.setTimeout(() => {
      delay = 0;
      if (!dirty) return;
      raf = window.requestAnimationFrame(flush);
    }, wait);
    return;
  }
  raf = window.requestAnimationFrame(flush);
}

export function markMeterDirty(): void {
  dirty = true;
  schedule();
}

export function subscribeMeterTick(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && dirty) schedule();
  });
}
