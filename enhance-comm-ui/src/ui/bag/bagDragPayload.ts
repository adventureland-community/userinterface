/** DataTransfer payload for bag → bag / bag → paperdoll drags on /comm. */
export const BAG_DRAG_SLOT_MIME = "application/x-ecu-inv-slot";

/** Set on dragstart; cleared on dragend. getData() is empty during dragover. */
let activeBagDragSlot: number | null = null;

export function setActiveBagDragSlot(invSlot: number | null): void {
  activeBagDragSlot = invSlot;
}

export function getActiveBagDragSlot(): number | null {
  return activeBagDragSlot;
}

export function writeBagDragPayload(dt: DataTransfer, invSlot: number): void {
  dt.setData(BAG_DRAG_SLOT_MIME, String(invSlot));
  dt.setData("text/plain", `inv:${invSlot}`);
  dt.setData("text", `inv:${invSlot}`);
  dt.effectAllowed = "move";
}

export function readBagDragPayloadFromDataTransfer(
  dt: DataTransfer | null | undefined,
): number | null {
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

export function readBagDragPayload(ev: DragEvent): number | null {
  const fromData = readBagDragPayloadFromDataTransfer(ev.dataTransfer);
  if (fromData != null) return fromData;
  return activeBagDragSlot;
}

export function hasBagDragPayload(ev: DragEvent): boolean {
  const types = ev.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (t === BAG_DRAG_SLOT_MIME || t === "text/plain") return true;
  }
  return activeBagDragSlot != null;
}
