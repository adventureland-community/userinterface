/** DataTransfer payload for trade slot → bag delist drags. */
export const TRADE_DRAG_SLOT_MIME = "application/x-ecu-trade-slot";

export function writeTradeDragPayload(dt: DataTransfer, tradeSlot: string): void {
  dt.setData(TRADE_DRAG_SLOT_MIME, tradeSlot);
  dt.setData("text/plain", `trade:${tradeSlot}`);
  dt.effectAllowed = "move";
}

export function readTradeDragPayload(ev: DragEvent): string | null {
  const dt = ev.dataTransfer;
  if (!dt) return null;
  const ecu = dt.getData(TRADE_DRAG_SLOT_MIME);
  if (ecu) return ecu;
  const plain = dt.getData("text/plain") || dt.getData("text");
  const m = /^trade:(trade\d+)$/.exec(plain);
  return m ? m[1] : null;
}

export function hasTradeDragPayload(ev: DragEvent): boolean {
  const types = ev.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === TRADE_DRAG_SLOT_MIME) return true;
  }
  return false;
}

