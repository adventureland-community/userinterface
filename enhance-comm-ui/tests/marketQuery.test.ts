import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySearchSuggestion,
  listingMatchesMarketQuery,
  parseAmount,
  parseMarketQuery,
  rewriteIsInFilter,
  syncTogglesFromQuery,
  tokenizeQuery,
} from "../src/lib/market/marketQuery";
import type { MarketListingRow } from "../src/lib/market/marketTypes";
import { filterMarketListings } from "../src/lib/market/marketBrowse";

function row(partial: Partial<MarketListingRow> & { name: string; merchant: string }): MarketListingRow {
  return {
    slot: "trade1",
    price: 100,
    buyOrder: false,
    merchantStatus: "inRange",
    standOpen: true,
    catalogOnly: false,
    fromLive: true,
    ...partial,
  };
}

describe("marketQuery parse", () => {
  it("tokenizes quotes and parses OR groups", () => {
    assert.deepEqual(tokenizeQuery('item:"Fire Staff" OR merchant:Bob'), [
      'item:"Fire Staff"',
      "OR",
      "merchant:Bob",
    ]);
    const groups = parseMarketQuery('gloves level:>=7 OR merchant:Ada');
    assert.equal(groups.length, 2);
    assert.equal(groups[0][0].kind, "text");
    assert.equal(groups[0][1].kind, "level");
    assert.equal(groups[1][0].kind, "merchant");
  });

  it("parses amounts with k/m/b", () => {
    assert.deepEqual(parseAmount("<1M"), { op: "<", n: 1e6 });
    assert.deepEqual(parseAmount(">=10k"), { op: ">=", n: 1e4 });
  });

  it("matches item / price / is / negation", () => {
    const sale = row({
      name: "gloves",
      merchant: "Ada",
      price: 500,
      level: 8,
      buyOrder: false,
      map: "main",
    });
    const want = row({
      name: "gloves",
      merchant: "Bob",
      price: 900,
      buyOrder: true,
      merchantStatus: "otherMap",
      fromLive: false,
      catalogOnly: true,
    });
    const catalogSameMap = row({
      name: "gloves",
      merchant: "Cara",
      price: 400,
      merchantStatus: "sameMap",
      fromLive: false,
      catalogOnly: true,
    });
    const liveFar = row({
      name: "gloves",
      merchant: "Dee",
      price: 350,
      merchantStatus: "sameMap",
      fromLive: true,
      catalogOnly: false,
    });
    const ctx = { gold: 600, bagNames: { gloves: true } };
    assert.equal(listingMatchesMarketQuery(sale, "item:gloves price:<1k", ctx), true);
    assert.equal(listingMatchesMarketQuery(sale, "is:buy", ctx), false);
    assert.equal(listingMatchesMarketQuery(want, "is:buy", ctx), true);
    assert.equal(listingMatchesMarketQuery(sale, "is:near", ctx), true);
    assert.equal(listingMatchesMarketQuery(want, "is:near", ctx), false);
    assert.equal(listingMatchesMarketQuery(catalogSameMap, "is:near", ctx), false);
    assert.equal(listingMatchesMarketQuery(liveFar, "is:near", ctx), true);
    assert.equal(listingMatchesMarketQuery(sale, "-merchant:Ada", ctx), false);
    assert.equal(listingMatchesMarketQuery(sale, "gloves OR merchant:Zed", ctx), true);
  });

  it("syncs and rewrites toggle is: tokens", () => {
    const sync = syncTogglesFromQuery("staff is:sell is:near");
    assert.equal(sync.facet, "sale");
    assert.equal(sync.nearOnly, true);
    const rewritten = rewriteIsInFilter("staff is:sell", {
      facet: "wanted",
      nearOnly: true,
      canAfford: false,
      haveStock: true,
    });
    assert.equal(rewritten, "staff is:buy is:near is:have");
  });

  it("applies search suggestions", () => {
    assert.equal(
      applySearchSuggestion("foo ", { kind: "op", insert: "item:" }),
      "foo item:",
    );
    assert.equal(
      applySearchSuggestion("item:gl", {
        kind: "value",
        value: "gloves",
      }),
      "item:gloves ",
    );
  });
});

describe("filterMarketListings query DSL", () => {
  it("filters near as visible/in entities (not catalog same-map)", () => {
    const rows = [
      row({
        name: "hpamulet",
        merchant: "A",
        price: 50,
        merchantStatus: "sameMap",
        fromLive: false,
        catalogOnly: true,
      }),
      row({
        name: "hpamulet",
        merchant: "B",
        price: 80,
        merchantStatus: "sameMap",
        fromLive: true,
        catalogOnly: false,
      }),
      row({
        name: "hpamulet",
        merchant: "C",
        price: 90,
        merchantStatus: "inRange",
        fromLive: true,
      }),
      row({
        name: "hpamulet",
        merchant: "D",
        price: 95,
        merchantStatus: "otherServer",
        fromLive: false,
        catalogOnly: true,
      }),
    ];
    const got = filterMarketListings(rows, {
      query: "item:hpamulet",
      side: "all",
      canAfford: false,
      inMyBag: false,
      nearOnly: true,
      gold: 0,
      bagNames: {},
      friendNames: {},
    });
    assert.equal(got.length, 2);
    assert.deepEqual(
      got.map((r) => r.merchant).sort(),
      ["B", "C"],
    );
  });
});
