import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTradeGold,
  findBagMatchForBuyOrder,
  isGiveawayListing,
  isInTradeRange,
  isJoinedGiveaway,
  tradeSlotGridRows,
} from "../src/lib/tradeHelpers";

describe("trade helpers", () => {
  it("formats gold compactly", () => {
    assert.equal(formatTradeGold(1200), "1.2k");
    assert.equal(formatTradeGold(null), "?");
  });

  it("splits trade slots into 4-column rows", () => {
    assert.deepEqual(tradeSlotGridRows(["trade1", "trade2", "trade3"]), [
      ["trade1", "trade2", "trade3"],
    ]);
    assert.deepEqual(
      tradeSlotGridRows(["trade1", "trade2", "trade3", "trade4", "trade5"]),
      [["trade1", "trade2", "trade3", "trade4"], ["trade5"]],
    );
  });

  it("checks trade range from entity positions", () => {
    const near = { id: "a", x: 0, y: 0 };
    const far = { id: "b", x: 500, y: 500 };
    const obs = { id: "me", x: 10, y: 10 };
    assert.equal(isInTradeRange(near, obs), true);
    assert.equal(isInTradeRange(far, obs), false);
    assert.equal(isInTradeRange(obs, obs), true);
  });

  it("finds bag match for buy orders", () => {
    const listing = { name: "hpot0", level: 0, b: true, price: 100 };
    const items = [null, { name: "scroll0" }, { name: "hpot0", q: 5 }];
    const match = findBagMatchForBuyOrder(listing, items);
    assert.deepEqual(match, { slot: 2, q: 5 });
  });

  it("detects giveaways and joined state", () => {
    const slot = { name: "scroll0", giveaway: true, registry: { p1: "Alice" } };
    assert.equal(isGiveawayListing(slot), true);
    assert.equal(isJoinedGiveaway(slot, { id: "p1", name: "Bob" }), true);
    assert.equal(isJoinedGiveaway(slot, { id: "p2", name: "Bob" }), false);
  });
});
