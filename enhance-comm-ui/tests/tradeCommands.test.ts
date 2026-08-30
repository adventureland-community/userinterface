import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGiveawayScript,
  buildJoinGiveawayScript,
  buildMerchantCloseScript,
  buildMerchantOpenScript,
  buildTradeFulfillScript,
  buildTradeHideScript,
  buildTradeListScript,
  buildTradePurchaseScript,
  buildTradeRepriceScript,
  buildTradeShowScript,
  buildWishlistScript,
  merchantStandInvSlot,
} from "../src/host/tradeCommands";
import {
  compactTradeSlotNames,
  formatTradeSlotLabel,
  isTradeSlot,
  merchantStandCapacity,
  merchantStandSlotNames,
  observingTradeSlotNames,
  personalTradeRowOpen,
  personalTradeSlotNames,
  standTradeSlotCount,
  standTradeSlotNames,
  tradeRowVisible,
  tradeSlotNames,
} from "../src/lib/tradeSlots";

describe("trade command scripts", () => {
  it("builds trade list script with slot guard and price", () => {
    const script = buildTradeListScript(
      { slot: 2, name: "hpot0", q: 5 },
      "trade1",
      1200,
      5,
    );
    assert.match(script, /await trade\("trade1",__slot,1200,5\)/);
    assert.match(script, /slot not empty/);
    assert.match(script, /hpot0/);
  });

  it("builds trade row show/hide scripts", () => {
    assert.match(buildTradeShowScript(), /event:"show"/);
    assert.match(buildTradeHideScript(), /event:"hide"/);
  });

  it("builds merchant close script", () => {
    assert.match(buildMerchantCloseScript(), /await close_merchant\(\)/);
  });

  it("builds merchant open script", () => {
    assert.match(buildMerchantOpenScript(4), /await open_merchant\(4\)/);
    assert.match(buildMerchantOpenScript(), /open_merchant\(__num\)/);
    assert.match(buildMerchantOpenScript(), /No merchant stand in bag/);
  });

  it("builds wishlist script", () => {
    const script = buildWishlistScript("trade2", "hpot0", 500, 1, 0);
    assert.match(script, /await wishlist\("trade2","hpot0",500,1,0\)/);
  });

  it("builds trade reprice script", () => {
    const script = buildTradeRepriceScript("trade1", 9999);
    assert.match(script, /await unequip\(__slot\)/);
    assert.match(script, /await trade\(__slot,/);
    assert.match(script, /await wishlist\(__slot,/);
    assert.match(script, /\(__it\.level\|\|0\)!==__level/);
    assert.match(script, /__it\.p!==__p/);
  });

  it("builds trade reprice script from listing snapshot", () => {
    const script = buildTradeRepriceScript("trade5", 5000, {
      name: "scroll0",
      q: 2,
      level: 0,
      price: 100,
    });
    assert.match(script, /var __listed=\{"name":"scroll0","q":2,"level":0\}/);
    assert.doesNotMatch(script, /character\.slots\[__slot\]/);
  });

  it("builds join giveaway script", () => {
    const script = buildJoinGiveawayScript("abc", "trade3", "rid5");
    assert.match(script, /join_giveaway/);
    assert.match(script, /"trade3"/);
    assert.match(script, /"rid5"/);
  });

  it("builds create giveaway script", () => {
    const script = buildGiveawayScript(
      "trade2",
      { slot: 1, name: "scroll0", q: 12 },
      30,
      12,
    );
    assert.match(script, /await giveaway\("trade2",__slot,12,30\)/);
    assert.match(script, /slot not empty/);
  });

  it("builds trade purchase script", () => {
    const script = buildTradePurchaseScript("abc", "trade1", "rid1", 2);
    assert.match(script, /socket\.emit\("trade_buy"/);
    assert.match(script, /slot is a buy order/);
  });

  it("builds trade fulfill script", () => {
    const script = buildTradeFulfillScript("abc", "trade1", "rid1", 2);
    assert.match(script, /socket\.emit\("trade_sell"/);
    assert.match(script, /not a buy order/);
    assert.match(script, /no matching item in bag/);
  });
});

describe("trade slot helpers", () => {
  it("detects trade slots", () => {
    assert.equal(isTradeSlot("trade1"), true);
    assert.equal(isTradeSlot("helmet"), false);
    assert.equal(formatTradeSlotLabel("trade3"), "Trade 3");
  });

  it("lists empty trade row when trade1 key exists", () => {
    const slots = { trade1: null, trade2: null };
    assert.equal(tradeRowVisible(slots), true);
    assert.deepEqual(tradeSlotNames(slots), [
      "trade1",
      "trade2",
      "trade3",
      "trade4",
    ]);
    assert.deepEqual(tradeSlotNames(slots, null, { editPersonalRow: true }), [
      "trade1",
      "trade2",
      "trade3",
      "trade4",
    ]);
    assert.equal(personalTradeRowOpen(slots), true);
    assert.equal(personalTradeRowOpen(slots, { stand: "x" }), false);
  });

  it("shows personal trade slots for editing when row is hidden", () => {
    const slots = { helmet: { name: "helmet" } };
    assert.equal(tradeRowVisible(slots), false);
    assert.deepEqual(tradeSlotNames(slots, null, { editPersonalRow: true }), [
      "trade1",
      "trade2",
      "trade3",
      "trade4",
    ]);
    assert.deepEqual(tradeSlotNames(slots), []);
  });

  it("lists filled merchant trade keys", () => {
    const slots = { trade1: { name: "hpot0" }, trade17: { name: "scroll0" } };
    const entity = { stand: "merchant" };
    assert.equal(tradeRowVisible(slots, entity), true);
    assert.deepEqual(tradeSlotNames(slots, entity), ["trade1", "trade17"]);
  });

  it("stand slot count mirrors server tiers", () => {
    assert.equal(standTradeSlotCount({ stand: "x" }), 16);
    assert.equal(
      standTradeSlotCount({ stand: "cstand", type: "merchant", level: 65 }),
      24,
    );
    assert.equal(
      standTradeSlotCount({ stand: "x", type: "merchant", level: 80 }),
      30,
    );
  });

  it("personal row always trade1-4 while editing", () => {
    const slots = { trade1: { name: "hpot0" }, trade5: { name: "scroll0" } };
    const entity = { stand: "merchant" };
    assert.deepEqual(personalTradeSlotNames(slots, entity, true), [
      "trade1",
      "trade2",
      "trade3",
      "trade4",
    ]);
  });

  it("default trade1-4 shown for other merchants with stand open", () => {
    const slots = { trade1: { name: "hpot0" }, trade5: { name: "scroll0" } };
    const entity = { stand: "merchant" };
    assert.deepEqual(personalTradeSlotNames(slots, entity, false), [
      "trade1",
      "trade2",
      "trade3",
      "trade4",
    ]);
    assert.deepEqual(merchantStandSlotNames(slots, entity, true, true), [
      "trade5",
      "trade6",
    ]);
  });

  it("merchant stand capacity does not require stand open", () => {
    assert.equal(merchantStandCapacity({ type: "merchant", level: 50 }), 16);
    assert.equal(
      merchantStandCapacity({ type: "merchant", level: 80 }),
      30,
    );
  });

  it("merchant stand slots render when stand is closed", () => {
    const slots = { trade1: { name: "hpot0", price: 100 } };
    const entity = { type: "merchant", level: 50 };
    assert.deepEqual(
      merchantStandSlotNames(slots, entity, true, true),
      ["trade5"],
    );
    assert.deepEqual(
      merchantStandSlotNames(slots, entity, false, true),
      [
        "trade5",
        "trade6",
        "trade7",
        "trade8",
        "trade9",
        "trade10",
        "trade11",
        "trade12",
        "trade13",
        "trade14",
        "trade15",
        "trade16",
      ],
    );
  });

  it("compact keeps filled plus one empty", () => {
    const slots = {
      trade5: { name: "a" },
      trade7: { name: "b" },
      trade6: null,
      trade8: null,
    };
    const entity = { stand: "merchant" };
    assert.deepEqual(standTradeSlotNames(slots, entity, true, true), [
      "trade5",
      "trade7",
      "trade6",
    ]);
    assert.deepEqual(standTradeSlotNames(slots, entity, false, true).length, 12);
  });

  it("compact applies to personal row candidates", () => {
    const slots = {
      trade1: { name: "a" },
      trade2: null,
      trade3: null,
      trade4: null,
    };
    assert.deepEqual(
      compactTradeSlotNames(["trade1", "trade2", "trade3", "trade4"], slots, true),
      ["trade1", "trade2"],
    );
    assert.deepEqual(
      compactTradeSlotNames(["trade1", "trade2", "trade3", "trade4"], slots, false),
      ["trade1", "trade2", "trade3", "trade4"],
    );
  });

  it("observing stand lists all stand slots", () => {
    if (typeof window === "undefined") return;
    (globalThis as any).window = {
      observing: { stand: "x", slots: { trade1: { name: "a" } } },
    };
    assert.deepEqual(observingTradeSlotNames().length, 16);
  });

  it("finds merchant stand in bag", () => {
    if (typeof window === "undefined") return;
    (globalThis as any).window = {
      G: {
        items: {
          merchantstand: { type: "stand", stand: "stand0" },
          ancientcomputer: { type: "computer", stand: "cstand" },
        },
      },
    };
    assert.equal(
      merchantStandInvSlot([
        null,
        { name: "hpot0" },
        { name: "merchantstand" },
        { name: "ancientcomputer" },
      ]),
      2,
    );
  });
});
