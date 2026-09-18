/**
 * Bank panel open/close pub/sub (mirrors marketSession).
 */

export type BankOpenPayload = {
  toggle?: boolean;
};

type OpenListener = (payload: BankOpenPayload) => void;
const openListeners: OpenListener[] = [];

let panelOpen = false;

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
