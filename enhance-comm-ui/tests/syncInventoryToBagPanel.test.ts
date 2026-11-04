import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  isInventoryOpen,
  syncInventoryToBagPanel,
} from "../src/host/inventory";

function installWindow(stub: Record<string, unknown>): void {
  (globalThis as { window?: Record<string, unknown> }).window = stub;
}

describe("syncInventoryToBagPanel", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  /**
   * Phone dock / Apps call setVisible("bag", true) without render_inventory.
   * CommPanelLayout only mounts BagPanel when inventory is open — so the
   * panel flag alone must drive stock inventory open/close.
   */
  it("opens inventory when showing a closed bag panel", () => {
    let renders = 0;
    installWindow({
      inventory: false,
      render_inventory() {
        renders += 1;
        (globalThis as { window: { inventory: boolean } }).window.inventory =
          !(globalThis as { window: { inventory: boolean } }).window.inventory;
      },
    });
    assert.equal(isInventoryOpen(), false);
    syncInventoryToBagPanel(true);
    assert.equal(isInventoryOpen(), true);
    assert.equal(renders, 1);
  });

  it("closes inventory when hiding an open bag panel", () => {
    let renders = 0;
    installWindow({
      inventory: true,
      render_inventory() {
        renders += 1;
        (globalThis as { window: { inventory: boolean } }).window.inventory =
          !(globalThis as { window: { inventory: boolean } }).window.inventory;
      },
    });
    syncInventoryToBagPanel(false);
    assert.equal(isInventoryOpen(), false);
    assert.equal(renders, 1);
  });

  it("is a no-op when already matching", () => {
    let renders = 0;
    installWindow({
      inventory: true,
      render_inventory() {
        renders += 1;
      },
    });
    syncInventoryToBagPanel(true);
    assert.equal(renders, 0);
    assert.equal(isInventoryOpen(), true);
  });
});
