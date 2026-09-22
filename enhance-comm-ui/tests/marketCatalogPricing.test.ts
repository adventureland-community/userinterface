import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marketCatalogPricesForItem } from "../src/lib/market/marketCatalogPricing";
import type { CachedMarketMerchant } from "../src/lib/market/marketPersistLogic";
import { setCachedMarketMerchants } from "../src/host/market/marketMemory";
import {
  defaultTradePriceNumber,
  tradePriceSuggestions,
} from "../src/lib/tradePriceMemory";

function sampleMerchants(): CachedMarketMerchant[] {
  return [
    {
      name: "Alice",
      lastSeenAt: 1,
      slots: [
        {
          slot: "trade1",
          name: "rod",
          rid: "a1",
          price: 5000,
          buyOrder: false,
          lastRefreshedAt: 1,
        },
        {
          slot: "trade2",
          name: "rod",
          rid: "a2",
          price: 4000,
          buyOrder: true,
          lastRefreshedAt: 1,
        },
      ],
    },
    {
      name: "Bob",
      lastSeenAt: 1,
      slots: [
        {
          slot: "trade1",
          name: "rod",
          rid: "b1",
          price: 4500,
          buyOrder: false,
          lastRefreshedAt: 1,
        },
        {
          slot: "trade2",
          name: "rod",
          rid: "b2",
          price: 4200,
          buyOrder: true,
          lastRefreshedAt: 1,
        },
        {
          slot: "trade3",
          name: "hpot0",
          rid: "b3",
          price: 100,
          buyOrder: false,
          lastRefreshedAt: 1,
        },
      ],
    },
  ];
}

describe("marketCatalogPricesForItem", () => {
  it("splits sells ascending and wants descending", () => {
    const info = marketCatalogPricesForItem("rod", sampleMerchants());
    assert.deepEqual(
      info.sells.map((s) => s.price),
      [4500, 5000],
    );
    assert.equal(info.sells[0].merchant, "Bob");
    assert.deepEqual(
      info.wants.map((s) => s.price),
      [4200, 4000],
    );
    assert.equal(info.wants[0].merchant, "Bob");
  });

  it("skips giveaways and unrelated items", () => {
    const merchants: CachedMarketMerchant[] = [
      {
        name: "Giver",
        lastSeenAt: 1,
        slots: [
          {
            slot: "trade1",
            name: "rod",
            rid: "g1",
            price: 1,
            buyOrder: false,
            giveaway: true,
            lastRefreshedAt: 1,
          },
        ],
      },
    ];
    const info = marketCatalogPricesForItem("rod", merchants);
    assert.equal(info.sells.length, 0);
    assert.equal(info.wants.length, 0);
  });
});

describe("tradePriceSuggestions market catalog", () => {
  it("adds market low and want chips from memory cache", () => {
    const prev = (globalThis as { window?: Window }).window;
    (globalThis as { window: Window }).window = {
      G: { items: { rod: { g: 100 } } },
      observing: { id: "me", level: 10 },
      entities: [],
    } as Window;
    setCachedMarketMerchants(sampleMerchants());
    try {
      const suggestions = tradePriceSuggestions("rod", { mode: "list" });
      assert.ok(
        suggestions.some((s) => s.kind === "market" && s.price === 4500),
      );
      assert.ok(suggestions.some((s) => s.kind === "want" && s.price === 4200));
      assert.ok(
        suggestions.some((s) => s.kind === "undercut" && s.price === 4499),
      );
      assert.equal(
        defaultTradePriceNumber("rod", { mode: "wishlist" }),
        4500,
      );
    } finally {
      setCachedMarketMerchants([]);
      (globalThis as { window?: Window }).window = prev;
    }
  });
});
