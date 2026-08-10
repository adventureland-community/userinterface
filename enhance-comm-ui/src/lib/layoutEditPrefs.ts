/**
 * Layout-edit interaction prefs (separate key so panel-layout migrations
 * elsewhere can land without fighting this toggle).
 */
const KEY = "al-comm-ui-layout-edit-prefs-v1";

export type LayoutEditPrefs = {
  /** When true, drag skips grid snap (peer-edge snap still applies). */
  freePlacement: boolean;
};

type Listener = () => void;

const DEFAULTS: LayoutEditPrefs = {
  freePlacement: false,
};

let cache: LayoutEditPrefs | null = null;
const listeners: Listener[] = [];

function read(): LayoutEditPrefs {
  try {
    const raw = window.localStorage?.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      freePlacement: !!parsed.freePlacement,
    };
  } catch {
    return { ...DEFAULTS };
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

/** Subscribe to Free-placement (and future layout-edit pref) changes. */
export function subscribeLayoutEditPrefs(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
