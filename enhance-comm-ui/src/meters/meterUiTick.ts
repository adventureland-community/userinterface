/**
 * Coalesced meter UI tick — ingest never paints; panels subscribe here.
 */

type Listener = () => void;

const listeners: Listener[] = [];
let dirty = false;
let raf = 0;

function flush(): void {
  raf = 0;
  if (!dirty) return;
  dirty = false;
  for (let i = 0; i < listeners.length; i++) {
    listeners[i]();
  }
}

export function markMeterDirty(): void {
  dirty = true;
  if (raf) return;
  raf = window.requestAnimationFrame(flush);
}

export function subscribeMeterTick(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
