import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

/**
 * Case C: queued sync open + immediate open must end open (not blink-close).
 * syncInventoryToBagPanel must not use raw toggle via draw_trigger.
 */

describe("syncInventoryToBagPanel idempotent open", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("late draw_trigger ensure-open no-ops when already open", async () => {
    const { syncInventoryToBagPanel } = await import(
      "../src/host/inventory"
    );

    let inventory = false;
    const queue: Array<() => void> = [];
    const renders: string[] = [];

    (globalThis as { window?: unknown }).window = {
      inventory: false,
      draw_trigger(fn: () => void) {
        queue.push(fn);
      },
      render_inventory() {
        // Stock toggle
        inventory = !inventory;
        (window as { inventory?: boolean }).inventory = inventory;
        renders.push(inventory ? "open" : "close");
      },
    };

    // Mirror isInventoryOpen reading window.inventory
    Object.defineProperty(window, "inventory", {
      get: () => inventory,
      set: (v: boolean) => {
        inventory = v;
      },
      configurable: true,
    });

    // Sync wants open while closed → queues ensure-open
    syncInventoryToBagPanel(true);
    assert.equal(queue.length, 1);

    // Immediate open (chrome click / another path) before draw fires
    inventory = false;
    (window as { render_inventory?: () => void }).render_inventory!();
    assert.equal(inventory, true);
    assert.deepEqual(renders, ["open"]);

    // Late callback must not toggle-close
    queue[0]();
    assert.equal(inventory, true);
    assert.deepEqual(renders, ["open"]);
  });

  it("sync close uses closeInventory, not toggle", async () => {
    const mod = await import("../src/host/inventory");
    let inventory = true;
    const renders: string[] = [];
    const doc = {
      getElementById() {
        return null;
      },
    };

    (globalThis as { document?: unknown }).document = doc;
    (globalThis as { window?: unknown }).window = {
      get inventory() {
        return inventory;
      },
      set inventory(v: boolean) {
        inventory = v;
      },
      draw_trigger(fn: () => void) {
        fn();
      },
      render_inventory() {
        inventory = !inventory;
        renders.push(inventory ? "open" : "close");
      },
      document: doc,
    };

    // closeInventory clears flag without render_inventory when host missing
    mod.syncInventoryToBagPanel(false);
    assert.equal(inventory, false);
    assert.deepEqual(renders, []);
  });
});
