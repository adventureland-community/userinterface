/**
 * Layout-edit interaction prefs (separate key so panel-layout migrations
 * elsewhere can land without fighting this toggle).
 */
import {
  LAYOUT_GRID_STEP,
  normalizeGridStep,
} from "./layoutGrid";

const KEY = "al-comm-ui-layout-edit-prefs-v1";

/** Viewport-% position of the Layout edit toolbar (top-center anchor). */
export type LayoutChromePos = {
  x: number;
  y: number;
};

export type LayoutEditPrefs = {
  /** When true, drag skips grid snap (peer-edge snap still applies). */
  freePlacement: boolean;
  /** Viewport-% grid step for guides + snap (when Free is off). */
  gridStep: number;
  /** Where the Layout edit control bar sits (user can drag it aside). */
  chromePos: LayoutChromePos;
};

type Listener = () => void;

/** Matches the historic fixed bar: centered, near the top edge. */
export const DEFAULT_LAYOUT_CHROME_POS: LayoutChromePos = {
  x: 50,
  y: 0.8,
};

const DEFAULTS: LayoutEditPrefs = {
  freePlacement: false,
  gridStep: LAYOUT_GRID_STEP,
  chromePos: { ...DEFAULT_LAYOUT_CHROME_POS },
};

let cache: LayoutEditPrefs | null = null;
const listeners: Listener[] = [];

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function normalizeChromePos(raw: unknown): LayoutChromePos {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_LAYOUT_CHROME_POS };
  }
  const obj = raw as { x?: unknown; y?: unknown };
  const x =
    typeof obj.x === "number" && Number.isFinite(obj.x)
      ? clampPct(obj.x)
      : DEFAULT_LAYOUT_CHROME_POS.x;
  const y =
    typeof obj.y === "number" && Number.isFinite(obj.y)
      ? clampPct(obj.y)
      : DEFAULT_LAYOUT_CHROME_POS.y;
  return { x, y };
}

function read(): LayoutEditPrefs {
  try {
    const raw = window.localStorage?.getItem(KEY);
    if (!raw) return { ...DEFAULTS, chromePos: { ...DEFAULT_LAYOUT_CHROME_POS } };
    const parsed = JSON.parse(raw);
    return {
      freePlacement: !!parsed.freePlacement,
      gridStep:
        parsed.gridStep != null
          ? normalizeGridStep(parsed.gridStep)
          : LAYOUT_GRID_STEP,
      chromePos: normalizeChromePos(parsed.chromePos),
    };
  } catch {
    return { ...DEFAULTS, chromePos: { ...DEFAULT_LAYOUT_CHROME_POS } };
  }
}

function write(prefs: LayoutEditPrefs): void {
  try {
    window.localStorage?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

function notify(): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i]();
  }
}

export function getLayoutEditPrefs(): LayoutEditPrefs {
  if (!cache) cache = read();
  return cache;
}

export function getLayoutFreePlacement(): boolean {
  return getLayoutEditPrefs().freePlacement;
}

export function setLayoutFreePlacement(free: boolean): LayoutEditPrefs {
  const next: LayoutEditPrefs = {
    ...getLayoutEditPrefs(),
    freePlacement: !!free,
  };
  cache = next;
  write(next);
  notify();
  return next;
}

export function getLayoutGridStep(): number {
  return getLayoutEditPrefs().gridStep;
}

export function setLayoutGridStep(step: number): LayoutEditPrefs {
  const next: LayoutEditPrefs = {
    ...getLayoutEditPrefs(),
    gridStep: normalizeGridStep(step),
  };
  cache = next;
  write(next);
  notify();
  return next;
}

export function getLayoutChromePos(): LayoutChromePos {
  return getLayoutEditPrefs().chromePos;
}

export function setLayoutChromePos(pos: LayoutChromePos): LayoutEditPrefs {
  const next: LayoutEditPrefs = {
    ...getLayoutEditPrefs(),
    chromePos: normalizeChromePos(pos),
  };
  cache = next;
  write(next);
  notify();
  return next;
}

/** Subscribe to layout-edit pref changes (Free, grid step, chrome pos, …). */
export function subscribeLayoutEditPrefs(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
