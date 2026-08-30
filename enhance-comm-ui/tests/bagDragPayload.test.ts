import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  BAG_DRAG_SLOT_MIME,
  getActiveBagDragSlot,
  hasBagDragPayload,
  readBagDragPayload,
  readBagDragPayloadFromDataTransfer,
  setActiveBagDragSlot,
  writeBagDragPayload,
} from "../src/ui/bag/bagDragPayload";

function mockDragEvent(
  dt: DataTransfer | null,
  types: string[] = [],
): DragEvent {
  return { dataTransfer: dt } as DragEvent;
}

describe("bagDragPayload", () => {
  afterEach(() => {
    setActiveBagDragSlot(null);
  });

  it("round-trips slot via DataTransfer on drop", () => {
    const store: Record<string, string> = {};
    const dt = {
      setData(k: string, v: string) {
        store[k] = v;
      },
      getData(k: string) {
        return store[k] ?? "";
      },
      types: [BAG_DRAG_SLOT_MIME],
      effectAllowed: "",
    } as DataTransfer;

    writeBagDragPayload(dt, 7);
    assert.equal(readBagDragPayloadFromDataTransfer(dt), 7);
    assert.equal(readBagDragPayload(mockDragEvent(dt)), 7);
  });

  it("falls back to active slot when getData is empty during dragover", () => {
    const dt = {
      getData() {
        return "";
      },
      types: [BAG_DRAG_SLOT_MIME],
    } as DataTransfer;

    setActiveBagDragSlot(12);
    assert.equal(readBagDragPayload(mockDragEvent(dt)), 12);
    assert.equal(getActiveBagDragSlot(), 12);
  });

  it("hasBagDragPayload accepts MIME types or active slot", () => {
    const dtTypes = {
      getData() {
        return "";
      },
      types: [BAG_DRAG_SLOT_MIME],
    } as DataTransfer;
    assert.equal(hasBagDragPayload(mockDragEvent(dtTypes)), true);

    setActiveBagDragSlot(3);
    const dtEmpty = {
      getData() {
        return "";
      },
      types: [] as unknown as DOMStringList,
    } as DataTransfer;
    assert.equal(hasBagDragPayload(mockDragEvent(dtEmpty)), true);
  });
});
