import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseMarketStandPackSlots,
  marketStandPackStackKey,
} from "../src/lib/market/marketStandPackStacks";

describe("collapseMarketStandPackSlots", () => {
  it("keys by buy/sell + name + level + title + price", () => {
    assert.equal(
      marketStandPackStackKey({
        name: "batwing",
        b: false,
        level: undefined,
        p: null,
        price: 8840000,
      }),
      ["0", "batwing", "", "", "8840000"].join("\0"),
    );
    assert.notEqual(
      marketStandPackStackKey({ name: "batwing", price: 100, b: false }),
      marketStandPackStackKey({ name: "batwing", price: 100, b: true }),
    );
    assert.notEqual(
      marketStandPackStackKey({ name: "batwing", price: 100 }),
      marketStandPackStackKey({ name: "batwing", price: 101 }),
    );
    assert.notEqual(
      marketStandPackStackKey({ name: "batwing", price: 0, giveaway: true }),
      marketStandPackStackKey({ name: "batwing", price: 0, b: false }),
    );
  });

  it("sums qty for identical listings and keeps empties", () => {
    const slots = {
      trade1: { name: "batwing", price: 8840000, q: 10 },
      trade2: { name: "batwing", price: 8840000, q: 10 },
      trade3: { name: "mpot1", price: 5910000, q: 20, b: true },
      trade4: { name: "mpot1", price: 5920000, q: 20, b: true },
      trade5: null,
    };
    const got = collapseMarketStandPackSlots(
      ["trade1", "trade2", "trade3", "trade4", "trade5"],
      slots,
    );
    assert.equal(got.length, 4);
    assert.equal(got[0].slotName, "trade1");
    assert.deepEqual(got[0].slotNames, ["trade1", "trade2"]);
    assert.equal(got[0].slot && got[0].slot.q, 20);
    assert.equal(got[1].slotName, "trade3");
    assert.equal(got[1].slot && got[1].slot.q, 20);
    assert.equal(got[2].slotName, "trade4");
    assert.equal(got[2].slot && got[2].slot.price, 5920000);
    assert.equal(got[3].slotName, "trade5");
    assert.equal(got[3].slot, null);
  });

  it("does not merge different levels or titles", () => {
    const slots = {
      trade1: { name: "firestaff", level: 7, price: 100 },
      trade2: { name: "firestaff", level: 8, price: 100 },
      trade3: { name: "firestaff", level: 7, p: "shiny", price: 100 },
    };
    const got = collapseMarketStandPackSlots(
      ["trade1", "trade2", "trade3"],
      slots,
    );
    assert.equal(got.length, 3);
  });

  it("keeps trade offers with different wants separate", () => {
    const slots = {
      trade1: {
        name: "slice_strawberry",
        price: 0,
        q: 1,
        want: { name: "slice_blueberry", q: 1 },
      },
      trade2: {
        name: "slice_strawberry",
        price: 0,
        q: 1,
        want: { name: "slice_blueberry", q: 1 },
      },
      trade3: {
        name: "slice_strawberry",
        price: 0,
        q: 1,
        want: { name: "slice_honey", q: 1 },
      },
      trade4: {
        name: "slice_strawberry",
        price: 0,
        q: 200,
        want: { name: "slice_mint", q: 200 },
      },
    };
    const got = collapseMarketStandPackSlots(
      ["trade1", "trade2", "trade3", "trade4"],
      slots,
    );
    assert.equal(got.length, 3);
    assert.deepEqual(got[0].slotNames, ["trade1", "trade2"]);
    assert.equal(got[0].slot && got[0].slot.q, 2);
    assert.equal(got[1].slotNames.length, 1);
    assert.equal(got[1].slot && (got[1].slot.want as any).name, "slice_honey");
    assert.equal(got[2].slot && got[2].slot.q, 200);
  });

  it("does not merge a trade offer with a gold sale at price 0", () => {
    assert.notEqual(
      marketStandPackStackKey({
        name: "slice_strawberry",
        price: 0,
        want: { name: "slice_honey", q: 1 },
        q: 1,
      }),
      marketStandPackStackKey({
        name: "slice_strawberry",
        price: 0,
        q: 220,
      }),
    );
  });
});
