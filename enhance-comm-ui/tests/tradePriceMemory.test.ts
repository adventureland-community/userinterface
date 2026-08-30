import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nearbyTradePricesForItem,
  tradePriceSuggestions,
} from "../src/lib/tradePriceMemory";
import { tradeSlotIsEmpty } from "../src/lib/tradeSlots";

describe("trade price memory", () => {
  it("collects nearby listing prices for same item", () => {
    const prices = nearbyTradePricesForItem("hpot0", {
      trade1: { name: "hpot0", price: 5000 },
      trade2: { name: "hpot0", price: 4800 },
      trade3: { name: "scroll0", price: 100 },
    });
    assert.deepEqual(prices, [4800, 5000]);
  });

  it("builds suggestions with last and nearby", () => {
    const prev = (globalThis as { localStorage?: Storage; window?: Window }).localStorage;
    const winPrev = (globalThis as { window?: Window }).window;
    const store: Record<string, string> = {};
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
    } as Storage;
    (globalThis as { window: Window }).window = {
      G: { items: { hpot0: { g: 120 } } },
      observing: { id: "me", x: 0, y: 0 },
      entities: [
        {
          id: "near",
          name: "Bob",
          x: 10,
          y: 0,
          slots: { trade1: { name: "hpot0", price: 5500 } },
        },
      ],
    } as Window;
    try {
      store["ecu-trade-price-memory"] = JSON.stringify({
        hpot0: { price: 6000 },
      });
      const suggestions = tradePriceSuggestions("hpot0", {
        slots: { trade1: { name: "hpot0", price: 5200 } },
        currentPrice: 5200,
      });
      assert.ok(suggestions.some((s) => s.price === 6000 && s.kind === "last"));
      assert.ok(suggestions.some((s) => s.price === 5200 && s.kind === "current"));
      assert.ok(suggestions.some((s) => s.price === 5500 && s.kind === "nearby"));
      assert.ok(suggestions.some((s) => s.kind === "vendor"));
    } finally {
      (globalThis as { localStorage?: Storage }).localStorage = prev;
      (globalThis as { window?: Window }).window = winPrev;
    }
  });
});

describe("tradeSlotIsEmpty", () => {
  it("treats missing slots map as empty (allows list/drop)", () => {
    assert.equal(tradeSlotIsEmpty(null, "trade1"), true);
    assert.equal(tradeSlotIsEmpty(undefined, "trade1"), true);
  });
});
