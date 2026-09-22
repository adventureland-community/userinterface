/**
 * Bank panel open/close pub/sub (mirrors marketSession).
 */

export type BankOpenPayload = {
  toggle?: boolean;
};

/** Render mode for Bank tools (All / Packs / Types / Ready). */
export type BankViewMode = "all" | "packs" | "types" | "ready";

type OpenListener = (payload: BankOpenPayload) => void;
type ViewCueListener = (view: BankViewMode) => void;

const openListeners: OpenListener[] = [];
const viewCueListeners: ViewCueListener[] = [];

let panelOpen = false;
/** Last tour/host view cue — applied when Bank mounts if listeners were empty. */
let pendingViewCue: BankViewMode | null = null;

export function isBankPanelOpen(): boolean {
  return panelOpen;
}

export function setBankPanelOpen(open: boolean): void {
  panelOpen = !!open;
}

export function subscribeBankOpen(fn: OpenListener): () => void {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx >= 0) openListeners.splice(idx, 1);
  };
}

export function openBank(payload: BankOpenPayload = {}): void {
  for (let i = 0; i < openListeners.length; i++) {
    openListeners[i](payload);
  }
}

/** Tour / host cue: switch Bank panel view mode. */
export function cueBankView(view: BankViewMode): void {
  pendingViewCue = view;
  if (viewCueListeners.length === 0) return;
  for (let i = 0; i < viewCueListeners.length; i++) {
    viewCueListeners[i](view);
  }
}

export function subscribeBankViewCue(fn: ViewCueListener): () => void {
  viewCueListeners.push(fn);
  if (pendingViewCue) fn(pendingViewCue);
  return () => {
    const idx = viewCueListeners.indexOf(fn);
    if (idx >= 0) viewCueListeners.splice(idx, 1);
  };
}
