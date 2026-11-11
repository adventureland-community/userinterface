import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countNameLevel,
  evaluateShrineBagWatch,
  isBagPlaceholder,
  itemTitleKey,
  listBagSlotsAtNameLevel,
  listBagSlotsAtNameLevelTitle,
} from "../src/lib/shrineOutcomeWatch";

describe("shrineOutcomeWatch", () => {
  it("detects placeholders", () => {
    assert.equal(isBagPlaceholder({ name: "placeholder" }), true);
    assert.equal(isBagPlaceholder({ name: "shield", level: 5 }), false);
    assert.equal(isBagPlaceholder(null), false);
  });

  it("counts name+level stacks", () => {
    const bag = [
      { name: "shield", level: 5 },
      { name: "placeholder" },
      { name: "shield", level: 6 },
      { name: "shield", level: 5 },
    ];
    assert.equal(countNameLevel(bag, "shield", 5), 2);
    assert.equal(countNameLevel(bag, "shield", 6), 1);
    assert.deepEqual(listBagSlotsAtNameLevel(bag, "shield", 5), [0, 3]);
    assert.deepEqual(listBagSlotsAtNameLevel(bag, "shield", 6), [2]);
  });

  it("batch peers match name + level + title (p)", () => {
    assert.equal(itemTitleKey(null), "");
    assert.equal(itemTitleKey("shiny"), "shiny");
    const bag = [
      { name: "carrot", level: 6 },
      { name: "carrot", level: 6, p: "shiny" },
      { name: "carrot", level: 6, p: "shiny" },
      { name: "carrot", level: 6, p: "glitched" },
      { name: "carrot", level: 7, p: "shiny" },
    ];
    assert.deepEqual(
      listBagSlotsAtNameLevelTitle(bag, "carrot", 6, null),
      [0],
    );
    assert.deepEqual(
      listBagSlotsAtNameLevelTitle(bag, "carrot", 6, "shiny"),
      [1, 2],
    );
    assert.deepEqual(
      listBagSlotsAtNameLevelTitle(bag, "carrot", 6, "glitched"),
      [3],
    );
  });

  it("treats placeholder as in-progress, not failure", () => {
    const bag = [
      { name: "placeholder" },
      { name: "scroll0", q: 40 },
    ];
    assert.equal(
      evaluateShrineBagWatch({
        items: bag,
        name: "shield",
        fromLevel: 5,
        beforeNext: 0,
        watchedSlots: [0],
        elapsedMs: 5000,
      }),
      "progress",
    );
  });

  it("succeeds when next level appears", () => {
    const bag = [
      { name: "shield", level: 6 },
      { name: "scroll0", q: 39 },
    ];
    assert.equal(
      evaluateShrineBagWatch({
        items: bag,
        name: "shield",
        fromLevel: 5,
        beforeNext: 0,
        watchedSlots: [0],
        elapsedMs: 2000,
      }),
      "success",
    );
  });

  it("fails only when watched slot is empty after debounce", () => {
    const bag = [null, { name: "scroll0", q: 39 }];
    assert.equal(
      evaluateShrineBagWatch({
        items: bag,
        name: "shield",
        fromLevel: 5,
        beforeNext: 0,
        watchedSlots: [0],
        elapsedMs: 800,
      }),
      "pending",
    );
    assert.equal(
      evaluateShrineBagWatch({
        items: bag,
        name: "shield",
        fromLevel: 5,
        beforeNext: 0,
        watchedSlots: [0],
        elapsedMs: 3000,
      }),
      "failure",
    );
  });

  it("does not fail while count dropped if placeholder still held", () => {
    // Old bug: atLevel drop after 1.6s → "item gone" during roll.
    const bag = [
      { name: "placeholder" },
      { name: "helmet", level: 3 },
    ];
    assert.equal(
      evaluateShrineBagWatch({
        items: bag,
        name: "helmet",
        fromLevel: 3,
        beforeNext: 0,
        watchedSlots: [0],
        elapsedMs: 4000,
      }),
      "progress",
    );
  });

  it("does not treat empty bag as fail while observe refresh is in flight", () => {
    assert.equal(
      evaluateShrineBagWatch({
        items: null,
        name: "ringsj",
        fromLevel: 2,
        beforeNext: 0,
        watchedSlots: [0, 1, 2],
        elapsedMs: 5000,
        snapshotUnreliable: true,
      }),
      "pending",
    );
    assert.equal(
      evaluateShrineBagWatch({
        items: [null, null, null],
        name: "ringsj",
        fromLevel: 2,
        beforeNext: 0,
        watchedSlots: [0, 1, 2],
        elapsedMs: 5000,
        snapshotUnreliable: true,
      }),
      "pending",
    );
  });
});
