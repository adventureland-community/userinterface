import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  reconcileCatalogPull,
  reconcileLiveOpenStand,
  marketCacheContentEqual,
  cachedSlotsAsListings,
  type CachedMarketMerchant,
} from "../src/lib/market/marketPersistLogic";

const NOW = 1_700_000_000_000;

function listing(
  slot: string,
  rid: string,
  name: string,
  price: number,
  at = NOW,
) {
  return {
    slot,
    rid,
    name,
    price,
    buyOrder: false,
    lastRefreshedAt: at,
  };
}

describe("reconcileCatalogPull", () => {
  it("keeps merchants missing from the pull", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Absent",
        lastSeenAt: NOW - 1000,
        slots: [listing("trade1", "r-keep", "hpot0", 50, NOW - 1000)],
      },
    ];
    const next = reconcileCatalogPull(
      prev,
      [{ name: "Other", slots: { trade1: { name: "mpot0", price: 1, rid: "r2" } } }],
      NOW,
    );
    assert.equal(next.length, 2);
    const absent = next.find((m) => m.name === "Absent");
    assert.ok(absent);
    assert.equal(absent!.slots[0].rid, "r-keep");
    assert.equal(absent!.slots[0].lastRefreshedAt, NOW - 1000);
  });

  it("drops rids gone from a merchant that is in the pull", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Bob",
        lastSeenAt: NOW - 1000,
        slots: [
          listing("trade1", "r-old", "stale", 9, NOW - 1000),
          listing("trade2", "r-keep", "hpot0", 50, NOW - 1000),
        ],
      },
    ];
    const next = reconcileCatalogPull(
      prev,
      [
        {
          name: "Bob",
          map: "main",
          slots: {
            trade2: { name: "hpot0", price: 55, rid: "r-keep" },
            trade3: { name: "scroll0", price: 10, rid: "r-new" },
          },
        },
      ],
      NOW,
    );
    assert.equal(next.length, 1);
    const rids = next[0].slots.map((s) => s.rid).sort();
    assert.deepEqual(rids, ["r-keep", "r-new"]);
    const keep = next[0].slots.find((s) => s.rid === "r-keep");
    assert.equal(keep?.price, 55);
    assert.equal(keep?.lastRefreshedAt, NOW);
  });

  it("replaces a slot when rid changes", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Bob",
        lastSeenAt: NOW - 1,
        slots: [listing("trade1", "r-a", "old", 1)],
      },
    ];
    const next = reconcileCatalogPull(
      prev,
      [
        {
          name: "Bob",
          slots: { trade1: { name: "new", price: 2, rid: "r-b" } },
        },
      ],
      NOW,
    );
    assert.equal(next[0].slots.length, 1);
    assert.equal(next[0].slots[0].rid, "r-b");
    assert.equal(next[0].slots[0].name, "new");
  });

  it("ignores rid-less slots", () => {
    const next = reconcileCatalogPull(
      [],
      [
        {
          name: "Bob",
          slots: {
            trade1: { name: "no-rid", price: 1 },
            trade2: { name: "yes", price: 2, rid: "r1" },
          },
        },
      ],
      NOW,
    );
    assert.equal(next[0].slots.length, 1);
    assert.equal(next[0].slots[0].rid, "r1");
  });

  it("keeps tradeOffer want through pull → cache → listings", () => {
    const next = reconcileCatalogPull(
      [],
      [
        {
          name: "Swapper",
          slots: {
            trade1: {
              name: "staff",
              level: 5,
              rid: "toff1",
              want: { name: "fireblade", level: 3, p: "shiny", q: 1 },
            },
          },
        },
      ],
      NOW,
    );
    const slot = next[0].slots[0];
    assert.equal(slot.tradeOffer, true);
    assert.equal(slot.price, 0);
    assert.deepEqual(slot.want, {
      name: "fireblade",
      level: 3,
      p: "shiny",
      q: 1,
    });
    const listed = cachedSlotsAsListings(next[0].slots);
    assert.equal(listed[0].tradeOffer, true);
    assert.deepEqual(listed[0].want, slot.want);
  });
});

describe("reconcileLiveOpenStand", () => {
  it("drops rid when live slot map shows the slot empty", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Near",
        lastSeenAt: NOW - 1,
        slots: [listing("trade1", "gone", "x", 1)],
      },
    ];
    const next = reconcileLiveOpenStand(
      prev,
      {
        name: "Near",
        map: "main",
        stand: "stand0",
        liveSlotMap: {
          trade1: null,
          trade5: { name: "live", price: 3, rid: "live1" },
        },
        slots: [
          {
            slot: "trade5",
            name: "live",
            price: 3,
            buyOrder: false,
            rid: "live1",
          },
        ],
      },
      NOW,
    );
    assert.equal(next[0].slots.length, 1);
    assert.equal(next[0].slots[0].rid, "live1");
  });

  it("keeps rid when soft sync omits the slot key", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Near",
        lastSeenAt: NOW - 1,
        slots: [
          listing("trade5", "keep", "hpot0", 50),
          listing("trade1", "row", "mpot0", 1),
        ],
      },
    ];
    const next = reconcileLiveOpenStand(
      prev,
      {
        name: "Near",
        stand: "stand0",
        liveSlotMap: {
          trade1: { name: "mpot0", price: 1, rid: "row" },
        },
        slots: [
          {
            slot: "trade1",
            name: "mpot0",
            price: 1,
            buyOrder: false,
            rid: "row",
          },
        ],
      },
      NOW,
    );
    const rids = next[0].slots.map((s) => s.rid).sort();
    assert.deepEqual(rids, ["keep", "row"]);
  });

  it("keeps prior trades on empty soft blink", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Me",
        lastSeenAt: NOW - 1,
        slots: [listing("trade5", "r1", "hpot0", 50, NOW - 1)],
      },
    ];
    const next = reconcileLiveOpenStand(
      prev,
      {
        name: "Me",
        stand: "stand0",
        liveSlotMap: {},
        slots: [],
      },
      NOW,
    );
    assert.equal(next[0].slots.length, 1);
    assert.equal(next[0].slots[0].rid, "r1");
    assert.equal(next[0].slots[0].lastRefreshedAt, NOW - 1);
    assert.equal(next[0].lastSeenAt, NOW - 1);
  });

  it("keeps want when live soft payload drops it", () => {
    const prev: CachedMarketMerchant[] = [
      {
        name: "Near",
        lastSeenAt: NOW - 1,
        slots: [
          {
            slot: "trade1",
            rid: "toff",
            name: "staff",
            price: 0,
            buyOrder: false,
            tradeOffer: true,
            want: { name: "fireblade", q: 1 },
            lastRefreshedAt: NOW - 1,
          },
        ],
      },
    ];
    const next = reconcileLiveOpenStand(
      prev,
      {
        name: "Near",
        stand: "stand0",
        liveSlotMap: {
          trade1: { name: "staff", price: 0, rid: "toff" },
        },
        slots: [
          {
            slot: "trade1",
            name: "staff",
            price: 0,
            buyOrder: false,
            rid: "toff",
          },
        ],
      },
      NOW,
    );
    assert.equal(next[0].slots[0].tradeOffer, true);
    assert.equal(next[0].slots[0].want?.name, "fireblade");
  });
});

describe("marketCacheContentEqual", () => {
  it("ignores timestamps", () => {
    const a: CachedMarketMerchant[] = [
      {
        name: "A",
        lastSeenAt: 1,
        slots: [listing("trade1", "r", "h", 1, 1)],
      },
    ];
    const b: CachedMarketMerchant[] = [
      {
        name: "A",
        lastSeenAt: 99,
        slots: [listing("trade1", "r", "h", 1, 99)],
      },
    ];
    assert.equal(marketCacheContentEqual(a, b), true);
  });
});
