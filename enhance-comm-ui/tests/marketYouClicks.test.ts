/**
 * Market You column click routing — stand cells must focus the item, not open
 * stock item tip (TradeSlotCell default when gearEditable).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marketBagStackKey } from "../src/lib/market/marketBagStacks";

type SlotClickPlan = {
  action: "focus" | "tip" | "noop";
  focusKey?: string;
  queryItem?: string;
};

/** Mirrors MarketPanel stand onSlotClick (pure for harness / unit check). */
function planMarketStandClick(opts: {
  shiftKey: boolean;
  slot: { name?: string; level?: number; p?: string | null } | null;
}): SlotClickPlan {
  const slot = opts.slot;
  if (opts.shiftKey && slot && slot.name) {
    return { action: "tip" };
  }
  if (!slot || !slot.name) return { action: "noop" };
  const focusKey = marketBagStackKey({
    name: String(slot.name),
    level: typeof slot.level === "number" ? slot.level : undefined,
    p: slot.p != null && String(slot.p) !== "" ? String(slot.p) : null,
  });
  return {
    action: "focus",
    focusKey,
    queryItem: String(slot.name),
  };
}

describe("market You stand / bag click routing", () => {
  it("primary stand click focuses item identity (not tip)", () => {
    const plan = planMarketStandClick({
      shiftKey: false,
      slot: { name: "staff", level: 7, p: "shiny" },
    });
    assert.equal(plan.action, "focus");
    assert.equal(
      plan.focusKey,
      marketBagStackKey({ name: "staff", level: 7, p: "shiny" }),
    );
    assert.equal(plan.queryItem, "staff");
  });

  it("shift+click stand opens tip path", () => {
    const plan = planMarketStandClick({
      shiftKey: true,
      slot: { name: "hpamulet" },
    });
    assert.equal(plan.action, "tip");
  });

  it("empty stand is a no-op (Want button lists wishlist)", () => {
    const plan = planMarketStandClick({
      shiftKey: false,
      slot: null,
    });
    assert.equal(plan.action, "noop");
  });

  it("bag stack key matches market group key shape", () => {
    const key = marketBagStackKey({ name: "wbook0", level: 2 });
    assert.equal(key, "wbook0\x002\x00");
  });
});
