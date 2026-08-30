import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canStackItems } from "../src/lib/itemStack";

describe("canStackItems", () => {
  it("merges same stackable item when under limit", () => {
    const prev = (globalThis as { window?: unknown }).window;
    (globalThis as { window: { G: { items: Record<string, { s: number }> } } }).window = {
      G: { items: { potionhp: { s: 1000 } } },
    };
    try {
      assert.equal(
        canStackItems({ name: "potionhp", q: 5 }, { name: "potionhp", q: 10 }),
        true,
      );
      assert.equal(
        canStackItems({ name: "potionhp", q: 500 }, { name: "potionhp", q: 600 }),
        false,
      );
    } finally {
      (globalThis as { window?: unknown }).window = prev;
    }
  });

  it("rejects mismatched properties and locked items", () => {
    const prev = (globalThis as { window?: unknown }).window;
    (globalThis as { window: { G: { items: Record<string, { s: number }> } } }).window = {
      G: { items: { gem0: { s: 9999 } } },
    };
    try {
      assert.equal(
        canStackItems({ name: "gem0", q: 1, p: "a" }, { name: "gem0", q: 1, p: "b" }),
        false,
      );
      assert.equal(
        canStackItems({ name: "gem0", q: 1, l: 1 }, { name: "gem0", q: 1 }),
        false,
      );
    } finally {
      (globalThis as { window?: unknown }).window = prev;
    }
  });
});
