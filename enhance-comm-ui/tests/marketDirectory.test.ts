import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  filterMarketListings,
  marketGroupHasArb,
  sortMarketGroups,
  sortMarketListings,
} from "../src/lib/market/marketBrowse";
import type { MarketListingRow } from "../src/lib/market/marketTypes";
import {
  normalizeCatalogSlot,
  slotsFromCatalogChar,
  extractMerchantChars,
} from "../src/host/market/pullMerchants";
import {
  buildMerchantDirectory,
  flattenListings,
  classifyMerchantStatus,
} from "../src/host/market/merchantDirectory";

beforeEach(() => {
  (globalThis as any).window = {
    current_map: "main",
    server_region: "EU",
    server_identifier: "I",
    observing: { id: "me", name: "Me" },
  };
});

afterEach(() => {
  delete (globalThis as any).window;
});

function row(
  partial: Partial<MarketListingRow> & {
    name: string;
    merchant: string;
    price: number;
  },
): MarketListingRow {
  return {
    slot: "trade1",
    buyOrder: false,
    merchantStatus: "inRange",
    standOpen: true,
    catalogOnly: false,
    fromLive: true,
    ...partial,
  };
}

describe("pull_merchants normalize", () => {
  it("normalizes catalog slots", () => {
    const s = normalizeCatalogSlot("trade5", {
      name: "hpot0",
      price: 100,
      rid: "abc",
      b: true,
      q: 3,
    });
    assert.equal(s?.name, "hpot0");
    assert.equal(s?.buyOrder, true);
    assert.equal(s?.rid, "abc");
    assert.equal(s?.q, 3);
  });

  it("keeps giveaways without a finite price", () => {
    const s = normalizeCatalogSlot("trade2", {
      name: "scroll0",
      giveaway: true,
      rid: "g1",
      registry: { a: "Alice", b: "Bob" },
    });
    assert.equal(s?.giveaway, true);
    assert.equal(s?.buyOrder, false);
    assert.equal(s?.price, 0);
    assert.equal(s?.giveawayEntries, 2);
  });

  it("lists trade* keys only", () => {
    const slots = slotsFromCatalogChar({
      trade1: { name: "a", price: 1 },
      helmet: { name: "helm", price: 2 },
      trade2: { name: "b", price: 3 },
    });
    assert.deepEqual(
      slots.map((x) => x.slot),
      ["trade1", "trade2"],
    );
  });

  it("extracts chars from stock infs envelope", () => {
    const got = extractMerchantChars({
      success: true,
      infs: [
        {
          type: "merchants",
          pulledAt: "2026-01-01T00:00:00.000Z",
          chars: [{ name: "Kaal", slots: {} }],
        },
      ],
    });
    assert.equal(got.chars.length, 1);
    assert.equal(got.chars[0].name, "Kaal");
    assert.equal(got.pulledAt, "2026-01-01T00:00:00.000Z");
  });
});

describe("merchant directory", () => {
  it("keeps cached slots when live merchant is present", () => {
    const dir = buildMerchantDirectory({
      entities: [
        {
          id: "1",
          name: "Bob",
          map: "main",
          x: 0,
          y: 0,
          stand: "stand",
          slots: {
            trade1: { name: "live", price: 50, rid: "r1" },
          },
        },
      ],
      catalogMerchants: [
        {
          name: "Bob",
          map: "main",
          server: "SR_EUI",
          lastSeenAt: 1,
          slots: [
            {
              slot: "trade1",
              name: "cached",
              price: 99,
              rid: "r-cached",
              buyOrder: false,
              lastRefreshedAt: 1,
            },
          ],
        },
      ],
      observing: { id: "me", name: "Me", x: 0, y: 0 },
    });
    assert.equal(dir.length, 1);
    assert.equal(dir[0].fromLive, true);
    // Directory reads cache; live open-stand reconcile updates cache separately.
    assert.equal(dir[0].slots[0].name, "cached");
    assert.equal(dir[0].slots[0].rid, "r-cached");
  });

  it("keeps catalog-only merchants", () => {
    const dir = buildMerchantDirectory({
      entities: [],
      catalogMerchants: [
        {
          name: "Far",
          map: "winterland",
          server: "SR_USI",
          lastSeenAt: 1,
          slots: [
            {
              slot: "trade1",
              name: "scroll0",
              price: 10,
              rid: "r1",
              buyOrder: false,
              lastRefreshedAt: 1,
            },
          ],
        },
      ],
      observing: { id: "me", name: "Me" },
    });
    assert.equal(dir[0].status, "otherServer");
    assert.equal(flattenListings(dir).length, 1);
    assert.equal(flattenListings(dir)[0].catalogOnly, true);
  });

  it("marks self as you", () => {
    assert.equal(
      classifyMerchantStatus({
        name: "Me",
        live: null,
        observing: { id: "1", name: "Me" },
      }),
      "you",
    );
  });
});

describe("market browse filters", () => {
  const rows = [
    row({ name: "hpot0", merchant: "A", price: 100, buyOrder: false }),
    row({ name: "hpot0", merchant: "B", price: 80, buyOrder: false }),
    row({
      name: "hpot0",
      merchant: "C",
      price: 200,
      buyOrder: true,
    }),
    row({ name: "scroll0", merchant: "Friend", price: 5, buyOrder: true }),
  ];

  it("filters sales and afford", () => {
    const got = filterMarketListings(rows, {
      query: "",
      side: "sale",
      canAfford: true,
      inMyBag: false,
      nearOnly: false,
      gold: 90,
      bagNames: {},
      friendNames: {},
    });
    assert.equal(got.length, 1);
    assert.equal(got[0].merchant, "B");
  });

  it("filters buy orders in bag", () => {
    const got = filterMarketListings(rows, {
      query: "",
      side: "buy",
      canAfford: false,
      inMyBag: true,
      nearOnly: false,
      gold: 0,
      bagNames: { scroll0: true },
      friendNames: {},
    });
    assert.equal(got.length, 1);
    assert.equal(got[0].name, "scroll0");
  });

  it("sorts cheapest sale first within item", () => {
    const sorted = sortMarketListings(
      rows.filter((r) => !r.buyOrder),
      { friend: true },
    );
    assert.equal(sorted[0].price, 80);
  });

  it("boosts friends", () => {
    const sorted = sortMarketListings(rows, { friend: true });
    assert.equal(sorted[0].merchant, "Friend");
  });
});

describe("sortMarketGroups", () => {
  const groups = [
    {
      key: "a",
      name: "zeta",
      rows: [{}, {}],
      sales: [{ price: 500 }],
      wants: [],
      giveaways: [],
      bestSale: 500,
      bestWant: null,
    },
    {
      key: "b",
      name: "alpha",
      rows: [{}],
      sales: [{ price: 100 }],
      wants: [{ price: 80 }],
      giveaways: [],
      bestSale: 100,
      bestWant: 80,
    },
    {
      key: "c",
      name: "mid",
      rows: [{}, {}, {}],
      sales: [],
      wants: [{ price: 900 }],
      giveaways: [],
      bestSale: null,
      bestWant: 900,
    },
    {
      key: "d",
      name: "spread-small",
      rows: [{}, {}],
      sales: [{ price: 100 }],
      wants: [{ price: 120 }],
      giveaways: [],
      bestSale: 100,
      bestWant: 120,
    },
    {
      key: "e",
      name: "spread-big",
      rows: [{}, {}],
      sales: [{ price: 50 }],
      wants: [{ price: 200 }],
      giveaways: [],
      bestSale: 50,
      bestWant: 200,
    },
  ] as any;

  it("sorts by name", () => {
    const got = sortMarketGroups(groups, "name");
    assert.deepEqual(
      got.map((g) => g.name),
      ["alpha", "mid", "spread-big", "spread-small", "zeta"],
    );
  });

  it("sorts sell ascending and dual first", () => {
    assert.equal(sortMarketGroups(groups, "sellAsc")[0].name, "spread-big");
    assert.equal(sortMarketGroups(groups, "dual")[0].name, "alpha");
    assert.equal(sortMarketGroups(groups, "buyDesc")[0].name, "mid");
    assert.equal(sortMarketGroups(groups, "offers")[0].name, "mid");
  });

  it("sorts arb by spread, then both-priced, then one-sided", () => {
    const got = sortMarketGroups(groups, "arb");
    assert.deepEqual(
      got.map((g) => g.name).slice(0, 2),
      ["spread-big", "spread-small"],
    );
    // alpha has both prices but sell > buy — after arbs, before one-sided
    const names = got.map((g) => g.name);
    assert.ok(names.indexOf("alpha") < names.indexOf("mid"));
    assert.ok(names.indexOf("alpha") < names.indexOf("zeta"));
    assert.ok(names.indexOf("spread-small") < names.indexOf("alpha"));
  });

  it("floats favorites to the top", () => {
    const got = sortMarketGroups(groups, "name", { c: true });
    assert.equal(got[0].name, "mid");
    assert.deepEqual(
      got.map((g) => g.name),
      ["mid", "alpha", "spread-big", "spread-small", "zeta"],
    );
  });
});

describe("marketGroupHasArb", () => {
  it("is true only when best sell is below best buy", () => {
    assert.equal(
      marketGroupHasArb({ bestSale: 100, bestWant: 120 } as any),
      true,
    );
    assert.equal(
      marketGroupHasArb({ bestSale: 100, bestWant: 100 } as any),
      false,
    );
    assert.equal(
      marketGroupHasArb({ bestSale: 120, bestWant: 100 } as any),
      false,
    );
    assert.equal(
      marketGroupHasArb({ bestSale: 100, bestWant: null } as any),
      false,
    );
  });

  it("ignores spreads that compact to the same gold label", () => {
    // Nightberry-style: 999_999 sells / 1_000_000 buys → both "1.00M"
    assert.equal(
      marketGroupHasArb({ bestSale: 999_999, bestWant: 1_000_000 } as any),
      false,
    );
    assert.equal(
      marketGroupHasArb({ bestSale: 1_000_000, bestWant: 1_004_999 } as any),
      false,
    );
    assert.equal(
      marketGroupHasArb({ bestSale: 1_000_000, bestWant: 1_050_000 } as any),
      true,
    );
  });
});
