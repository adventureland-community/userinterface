/**
 * Re-fit the PIXI canvas after the layout viewport changes without a reliable
 * window `resize` (Fullscreen API on mobile Edge/Chrome is the common case).
 */

import {
  applyWorldFov,
  readAppliedWorldFov,
  readWindowCssSize,
} from "../lib/worldFov";

let installed = false;
let scheduleTimer: ReturnType<typeof setTimeout> | null = null;
const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

/** CSS size for FOV fit — larger of layout vs visual viewport (fullscreen lag). */
export function readCssViewportSize(): { w: number; h: number } {
  return readWindowCssSize();
}

/**
 * Run stock `on_resize` (which our FOV host wraps) so width/height + canvas
 * CSS match the current window. Falls back to applyWorldFov alone.
 */
export function forceGameViewportRefit(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    on_resize?: (...args: unknown[]) => void;
    __ecuOnResize?: (...args: unknown[]) => void;
  };
  const resize =
    typeof w.on_resize === "function"
      ? w.on_resize
      : typeof w.__ecuOnResize === "function"
        ? w.__ecuOnResize
        : null;
  if (resize) {
    try {
      resize.call(w);
      return;
    } catch {
      /* fall through */
    }
  }
  applyWorldFov(readAppliedWorldFov());
}

/**
 * Fullscreen / URL-bar settle is asynchronous — refit now, next frame, and a
 * few short delays so the canvas catches the final height.
 */
export function scheduleGameViewportRefit(): void {
  while (pendingTimeouts.length) {
    const id = pendingTimeouts.pop();
    if (id != null) clearTimeout(id);
  }
  forceGameViewportRefit();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => forceGameViewportRefit());
  }
  const delays = [50, 150, 400];
  for (let i = 0; i < delays.length; i++) {
    const id = window.setTimeout(() => forceGameViewportRefit(), delays[i]);
    pendingTimeouts.push(id);
  }
}

function debouncedSchedule(): void {
  if (scheduleTimer != null) clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;
    forceGameViewportRefit();
  }, 50);
}

/** Wire fullscreen + visualViewport so the world fills after Apps → Full. */
export function installViewportRefit(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const onFs = () => scheduleGameViewportRefit();
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);

  const vv = window.visualViewport;
  if (vv && typeof vv.addEventListener === "function") {
    vv.addEventListener("resize", debouncedSchedule);
    vv.addEventListener("scroll", debouncedSchedule);
  }
}
