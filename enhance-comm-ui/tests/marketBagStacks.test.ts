import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseMarketBagStacks,
  marketBagStackKey,
} from "../src/lib/market/marketBagStacks";

describe("collapseMarketBagStacks", () => {
  it("keys by name + level + title", () => {
    assert.equal(
      marketBagStackKey({ name: "firestaff", level: 7, p: "shiny" }),
      "firestaff\0" + "7" + "\0" + "shiny",
    );
    assert.notEqual(
      marketBagStackKey({ name: "firestaff", level: 7 }),
      marketBagStackKey({ name: "firestaff", level: 8 }),
    );
  });

  it("sums qty across matching slots and keeps first slot", () => {
    const stacks = collapseMarketBagStacks([
      { slot: 2, name: "hpot1", q: 40 },
      { slot: 5, name: "hpot1", q: 12 },
      { slot: 7, name: "firestaff", level: 7, q: 1 },
      { slot: 9, name: "firestaff", level: 7, p: "shiny", q: 1 },
      null,
      { slot: 11, name: "hpot1", q: 3 },
    ]);
    assert.equal(stacks.length, 3);
    assert.equal(stacks[0].name, "hpot1");
    assert.equal(stacks[0].q, 55);
    assert.equal(stacks[0].slot, 2);
    assert.deepEqual(stacks[0].slots, [2, 5, 11]);
    assert.equal(stacks[0].slotCount, 3);
    assert.equal(stacks[1].name, "firestaff");
    assert.equal(stacks[1].level, 7);
    assert.equal(stacks[1].p, null);
    assert.equal(stacks[2].p, "shiny");
  });
});
