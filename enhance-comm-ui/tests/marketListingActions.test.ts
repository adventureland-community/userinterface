import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canActOnListing,
  isOwnMarketListing,
} from "../src/host/market/marketListingActions";
import type { MarketListingRow } from "../src/lib/market/marketTypes";

function row(
  status: MarketListingRow["merchantStatus"],
): MarketListingRow {
  return {
    slot: "trade1",
    name: "hpot0",
    price: 100,
    buyOrder: false,
    merchant: "Bob",
    merchantStatus: status,
    standOpen: true,
    catalogOnly: false,
    fromLive: status === "inRange" || status === "you" || status === "sameMap",
  };
}

describe("canActOnListing", () => {
  it("allows only in-range foreign merchants", () => {
    assert.equal(canActOnListing(row("inRange")), true);
    assert.equal(canActOnListing(row("you")), false);
    assert.equal(canActOnListing(row("sameMap")), false);
    assert.equal(canActOnListing(row("catalogOnly")), false);
  });

  it("flags own listings", () => {
    assert.equal(isOwnMarketListing(row("you")), true);
    assert.equal(isOwnMarketListing(row("inRange")), false);
  });
});
