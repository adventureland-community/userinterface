import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTradeGold,
  formatGiveawayTimeLeft,
  findBagMatchForBuyOrder,
  isGiveawayListing,
  isInTradeRange,
  isJoinedGiveaway,
  tradeSlotGridRows,
} from "../src/lib/tradeHelpers";

describe("trade helpers", () => {
  it("formats gold compactly", () => {
    assert.equal(formatTradeGold(1200), "1.2k");
    assert.equal(formatTradeGold(60_000_000), "60.00M");
    assert.equal(formatTradeGold(38_400_000_000), "38.40B");
    assert.equal(formatTradeGold(999_999), "1.00M");
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
    assert.equal(isGiveawayListing({ name: "jacko", giveaway: 12 }), true);
  });

  it("formats giveaway time left", () => {
    assert.equal(formatGiveawayTimeLeft(17), "17m");
    assert.equal(formatGiveawayTimeLeft(65), "1h 5m");
    assert.equal(formatGiveawayTimeLeft(120), "2h");
    assert.equal(formatGiveawayTimeLeft(null), "");
    const now = 1_000_000;
    assert.equal(
      formatGiveawayTimeLeft(10, now - 3 * 60_000, now),
      "7m",
    );
    assert.equal(
      formatGiveawayTimeLeft(2, now - 5 * 60_000, now),
      "<1m",
    );
  });
});
