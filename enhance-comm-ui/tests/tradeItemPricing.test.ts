import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nearbyMapSellPricesForItem,
  vendorGoldPrice,
  vendorListFloorPrice,
  tradeTaxRateFromLevel,
  tradeSaleNetGold,
  minListPriceForNetGold,
} from "../src/lib/tradeItemPricing";
import {
  defaultTradePriceNumber,
  tradePriceSuggestions,
} from "../src/lib/tradePriceMemory";
import {
  merchantStandSectionVisible,
  observingTradeSlotNames,
} from "../src/lib/tradeSlots";

describe("trade item pricing", () => {
  it("reads vendor gold from G.items", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      G: { items: { hpot0: { g: 120 } } },
    } as Window;
    try {
      assert.equal(vendorGoldPrice("hpot0"), 120);
      assert.equal(vendorGoldPrice("missing"), null);
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });

  it("collects nearby map sell listings in trade range", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      observing: { id: "me", x: 0, y: 0 },
      entities: [
        {
          id: "me",
          x: 0,
          y: 0,
          slots: { trade1: { name: "hpot0", price: 999 } },
        },
        {
          id: "far",
          name: "Farmer",
          x: 900,
          y: 0,
          slots: { trade1: { name: "hpot0", price: 100 } },
        },
        {
          id: "near",
          name: "MerchantBob",
          x: 50,
          y: 0,
          slots: {
            trade1: { name: "hpot0", price: 5000 },
            trade2: { name: "scroll0", price: 100 },
          },
        },
      ],
    } as Window;
    try {
      const rows = nearbyMapSellPricesForItem("hpot0");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].price, 5000);
      assert.equal(rows[0].seller, "MerchantBob");
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });

  it("defaults to tax-adjusted vendor when no memory or nearby", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      G: { items: { hpot0: { g: 120 } } },
      observing: { id: "me", level: 10 },
      entities: [],
    } as Window;
    try {
      assert.equal(tradeTaxRateFromLevel(10), 0.05);
      assert.equal(tradeSaleNetGold(126, 0.05), 120);
      assert.equal(minListPriceForNetGold(120, 0.05), 126);
      assert.equal(defaultTradePriceNumber("hpot0"), 126);
      const suggestions = tradePriceSuggestions("hpot0");
      assert.ok(
        suggestions.some((s) => s.kind === "vendor" && s.price === 126),
      );
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });

  it("vendor list floor uses live tax when present", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      G: { items: { hpot0: { g: 120 } } },
    } as Window;
    try {
      assert.equal(
        vendorListFloorPrice("hpot0", {
          observer: { id: "x", tax: 0.01, level: 90 },
        }),
        minListPriceForNetGold(120, 0.01),
      );
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });
});

describe("trade slot workflows", () => {
  it("non-merchant without stand lists personal trade1-4 only", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      observing: {
        id: "priest",
        ctype: "priest",
        level: 80,
        slots: { helmet: { name: "helmet" } },
      },
    } as Window;
    try {
      assert.deepEqual(observingTradeSlotNames(), [
        "trade1",
        "trade2",
        "trade3",
        "trade4",
      ]);
      assert.equal(
        merchantStandSectionVisible(
          (window as Window & { observing: unknown }).observing as any,
          { helmet: { name: "helmet" } },
          true,
        ),
        false,
      );
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });

  it("merchant with open stand lists full stand grid in menu", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      observing: {
        id: "m1",
        ctype: "merchant",
        level: 80,
        stand: "stand0",
        slots: { trade1: { name: "a" } },
      },
    } as Window;
    try {
      assert.equal(observingTradeSlotNames().length, 30);
      assert.equal(
        merchantStandSectionVisible(
          (window as Window & { observing: unknown }).observing as any,
          { trade1: { name: "a" } },
          true,
        ),
        true,
      );
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });

  it("merchant with closed stand still uses personal row for bag menu", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      observing: {
        id: "m2",
        ctype: "merchant",
        level: 50,
        slots: {
          trade1: { name: "hpot0" },
          trade5: { name: "scroll0" },
        },
      },
    } as Window;
    try {
      assert.deepEqual(observingTradeSlotNames(), [
        "trade1",
        "trade2",
        "trade3",
        "trade4",
      ]);
      assert.equal(
        merchantStandSectionVisible(
          (window as Window & { observing: unknown }).observing as any,
          {
            trade1: { name: "hpot0" },
            trade5: { name: "scroll0" },
          },
          true,
        ),
        true,
      );
    } finally {
      (globalThis as { window?: Window }).window = prev;
    }
  });
});
