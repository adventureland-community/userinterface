import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRepriceTradeSlot,
  forgetStandTradeSlot,
  isHiddenStandTradeListing,
  mergeStandTradeSlotsForUi,
  rememberStandTradeSlots,
  shouldSkipLiveTradeSlotGuard,
  standTradeMemoryEpoch,
} from "../src/lib/standTradeSlotMemory";

describe("standTradeSlotMemory", () => {
  it("merges remembered trade5+ when stand is closed", () => {
    const id = "merchant-a";
    const openSlots = {
      trade1: { name: "hpot0", price: 1 },
      trade5: { name: "scroll0", price: 100 },
      trade8: { name: "helmet", price: 500, level: 1 },
    };
    rememberStandTradeSlots(id, openSlots);
    const closedSlots = {
      trade1: { name: "hpot0", price: 1 },
      trade2: null,
    };
    const merged = mergeStandTradeSlotsForUi(id, closedSlots, false);
    assert.equal(merged?.trade5?.name, "scroll0");
    assert.equal(merged?.trade8?.name, "helmet");
    assert.equal(merged?.trade1?.name, "hpot0");
  });

  it("forget drops a cached stand slot", () => {
    const id = "merchant-b";
    const before = standTradeMemoryEpoch();
    rememberStandTradeSlots(id, {
      trade5: { name: "scroll0", price: 50 },
      trade6: { name: "cscroll0", price: 60 },
    });
    forgetStandTradeSlot(id, "trade5");
    assert.ok(standTradeMemoryEpoch() >= before);
    const merged = mergeStandTradeSlotsForUi(
      id,
      { trade1: null },
      false,
    );
    assert.equal(merged?.trade5, undefined);
    assert.equal(merged?.trade6?.name, "cscroll0");
  });

  it("stand open refreshes memory from live slots", () => {
    const id = "merchant-c";
    rememberStandTradeSlots(id, {
      trade5: { name: "old", price: 1 },
    });
    const live = {
      trade5: { name: "new", price: 2 },
      trade7: { name: "extra", price: 3 },
    };
    const out = mergeStandTradeSlotsForUi(id, live, true);
    assert.equal(out, live);
    const merged = mergeStandTradeSlotsForUi(id, { trade1: null }, false);
    assert.equal(merged?.trade5?.name, "new");
    assert.equal(merged?.trade7?.name, "extra");
  });

  it("detects hidden stand listings omitted from live sync", () => {
    const listing = { name: "scroll0", price: 100 };
    const live = { trade1: { name: "hpot0", price: 1 } };
    assert.equal(
      isHiddenStandTradeListing("trade5", listing, live),
      true,
    );
    assert.equal(
      shouldSkipLiveTradeSlotGuard("trade5", listing, live),
      true,
    );
    assert.equal(
      isHiddenStandTradeListing("trade1", { name: "hpot0" }, live),
      false,
    );
    assert.equal(canRepriceTradeSlot("trade5", listing, live, false), false);
    assert.equal(canRepriceTradeSlot("trade5", listing, live, true), true);
  });
});
