/**
 * Apply an optional PIXI renderer.resolution scale.
 * Restores the original resolution when set back to 1×.
 */

import {
  normalizeGameRenderScale,
  type GameRenderScale,
} from "../lib/gameRenderScale";
import { getSettings, patchSettings } from "../lib/settings";

type ScaleRenderer = {
  resolution?: number;
  view?: HTMLElement | null;
  resize?: (w: number, h: number) => void;
};

type ScaleWindow = Window & {
  renderer?: ScaleRenderer;
  width?: number;
  height?: number;
  on_resize?: () => void;
  __ecuSetGameRenderScale?: (scale: unknown) => GameRenderScale;
  __ecuGetGameRenderScale?: () => GameRenderScale;
};

let installed = false;
let currentScale: GameRenderScale = 1;
let savedResolution: number | null = null;
let pollId: ReturnType<typeof setInterval> | null = null;

function host(): ScaleWindow {
  return window as ScaleWindow;
}

function applyToRenderer(scale: GameRenderScale): boolean {
  const w = host();
  const renderer = w.renderer;
  if (!renderer || typeof renderer.resolution !== "number") return false;
  if (savedResolution == null) savedResolution = renderer.resolution || 1;
  const next = scale === 1 ? savedResolution : savedResolution * scale;
  if (Math.abs((renderer.resolution || 1) - next) < 1e-6) return true;
  renderer.resolution = next;
  const rw =
    typeof w.width === "number" && w.width > 0
      ? w.width
      : renderer.view
        ? (renderer.view as HTMLCanvasElement).width || 0
        : 0;
  const rh =
    typeof w.height === "number" && w.height > 0
      ? w.height
      : renderer.view
        ? (renderer.view as HTMLCanvasElement).height || 0
        : 0;
  if (typeof renderer.resize === "function" && rw > 0 && rh > 0) {
    try {
      renderer.resize(rw, rh);
    } catch {
      /* ignore */
    }
  }
  if (typeof w.on_resize === "function") {
    try {
      w.on_resize();
    } catch {
      /* ignore */
    }
  }
  return true;
}

export function setGameRenderScale(
  raw: unknown,
  opts?: { persist?: boolean },
): GameRenderScale {
  const scale = normalizeGameRenderScale(raw);
  currentScale = scale;
  applyToRenderer(scale);
  if (opts?.persist !== false && getSettings().gameRenderScale !== scale) {
    patchSettings({ gameRenderScale: scale });
  }
  return scale;
}

export function getGameRenderScale(): GameRenderScale {
  return currentScale;
}

function onSettingsEvent(ev: Event): void {
  const detail = (ev as CustomEvent).detail;
  if (!detail || typeof detail !== "object") return;
  if (!("gameRenderScale" in (detail as object))) return;
  setGameRenderScale((detail as { gameRenderScale?: unknown }).gameRenderScale, {
    persist: false,
  });
}

export function installGameRenderScale(): void {
  if (installed) return;
  installed = true;
  const w = host();
  w.__ecuSetGameRenderScale = (s) => setGameRenderScale(s);
  w.__ecuGetGameRenderScale = getGameRenderScale;
  currentScale = normalizeGameRenderScale(getSettings().gameRenderScale);
  if (typeof window !== "undefined") {
    window.addEventListener("ecu:settings", onSettingsEvent);
  }
  if (applyToRenderer(currentScale)) return;
  const started = Date.now();
  pollId = window.setInterval(() => {
    if (applyToRenderer(currentScale) || Date.now() - started > 60000) {
      if (pollId != null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    }
  }, 500);
}
