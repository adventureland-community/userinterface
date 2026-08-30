/** DataTransfer payload for bag → bag / bag → paperdoll drags on /comm. */
export const BAG_DRAG_SLOT_MIME = "application/x-ecu-inv-slot";

export function writeBagDragPayload(dt: DataTransfer, invSlot: number): void {
  dt.setData(BAG_DRAG_SLOT_MIME, String(invSlot));
  dt.setData("text/plain", `inv:${invSlot}`);
  dt.setData("text", `inv:${invSlot}`);
  dt.effectAllowed = "move";
}

export function readBagDragPayload(ev: DragEvent): number | null {
  const dt = ev.dataTransfer;
  if (!dt) return null;
  const ecu = dt.getData(BAG_DRAG_SLOT_MIME);
  if (ecu !== "") {
    const n = parseInt(ecu, 10);
    if (Number.isFinite(n)) return n;
  }
  const plain = dt.getData("text/plain") || dt.getData("text");
  const m = /^inv:(\d+)$/.exec(plain);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function hasBagDragPayload(ev: DragEvent): boolean {
  const types = ev.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (t === BAG_DRAG_SLOT_MIME || t === "text/plain") return true;
  }
  return false;
}
