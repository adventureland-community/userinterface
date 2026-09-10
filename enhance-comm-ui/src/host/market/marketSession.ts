/**
 * Market panel open/close pub/sub (mirrors mailSession).
 */

export type MarketOpenPayload = {
  /** When true and panel already open, close it. */
  toggle?: boolean;
  /** Prefill search / merchant filter (e.g. after inspect). */
  merchantName?: string | null;
  desk?: "buy" | "sell";
};

type OpenListener = (payload: MarketOpenPayload) => void;
const openListeners: OpenListener[] = [];

let panelOpen = false;

export function isMarketPanelOpen(): boolean {
  return panelOpen;
}

export function setMarketPanelOpen(open: boolean): void {
  panelOpen = !!open;
}

export function subscribeMarketOpen(fn: OpenListener): () => void {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx >= 0) openListeners.splice(idx, 1);
  };
}

export function openMarket(payload: MarketOpenPayload = {}): void {
  for (let i = 0; i < openListeners.length; i++) {
    openListeners[i](payload);
  }
}
