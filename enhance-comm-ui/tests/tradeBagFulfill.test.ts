import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buyOrderItemKey,
  indexNearbyBuyOrders,
  nearbyBuyOrdersRevision,
  scanBuyOrdersForBagItem,
} from "../src/lib/tradeHelpers";
import { PAPERDOLL_BODY, PAPERDOLL_SHELL } from "../src/ui/paperdoll/PaperdollDummy";
import { TRADE_PANEL_STYLE } from "../src/lib/frameSizes";

describe("scanBuyOrdersForBagItem", () => {
  const observer = {
    id: "me",
    name: "Me",
    x: 0,
    y: 0,
    items: [{ name: "hpot0", q: 5 }],
  };

  it("finds matching buy orders in range", () => {
    const merchant = {
      id: "m1",
      name: "Shop",
      x: 10,
      y: 10,
      slots: {
        trade1: {
          name: "hpot0",
          b: true,
          price: 100,
          rid: "r1",
          q: 3,
        },
      },
    };
    const matches = scanBuyOrdersForBagItem(
      { slot: 2, name: "hpot0", q: 5 },
      [observer, merchant],
      observer,
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].entityId, "m1");
    assert.equal(matches[0].listing.price, 100);
  });

  it("skips out-of-range and self listings", () => {
    const far = {
      id: "m2",
      name: "Far",
      x: 500,
      y: 500,
      slots: {
        trade1: { name: "hpot0", b: true, price: 50, rid: "r2" },
      },
    };
    const matches = scanBuyOrdersForBagItem(
      { slot: 2, name: "hpot0" },
      [observer, far, observer],
      observer,
    );
    assert.equal(matches.length, 0);
  });
});

describe("buy order index", () => {
  it("keys items by name level and prefix", () => {
    assert.equal(buyOrderItemKey("hpot0", 0, undefined), "hpot0|0|");
    assert.equal(buyOrderItemKey("scroll0", 5, "lucky"), "scroll0|5|lucky");
  });

  it("indexes nearby buy orders by fingerprint", () => {
    const observer = { id: "me", x: 0, y: 0 };
    const merchant = {
      id: "m1",
      name: "Shop",
      x: 10,
      y: 10,
      slots: {
        trade1: { name: "hpot0", b: true, price: 100, rid: "r1" },
      },
    };
    const index = indexNearbyBuyOrders([observer, merchant], observer);
    assert.equal(index.get("hpot0||")?.length, 1);
    assert.equal(nearbyBuyOrdersRevision([observer, merchant], observer), 1);
  });
});

describe("panel shell pointer-events", () => {
  it("paperdoll shell is click-through with interactive body", () => {
    assert.equal(PAPERDOLL_SHELL.pointerEvents, "none");
    assert.equal(PAPERDOLL_BODY.pointerEvents, "auto");
  });

  it("trade panel uses fixed opaque footprint", () => {
    assert.equal(typeof TRADE_PANEL_STYLE.width, "string");
    assert.match(String(TRADE_PANEL_STYLE.width), /^\d+px$/);
    assert.equal(TRADE_PANEL_STYLE.minWidth, TRADE_PANEL_STYLE.width);
    assert.match(String(TRADE_PANEL_STYLE.background), /rgba/);
  });
});
