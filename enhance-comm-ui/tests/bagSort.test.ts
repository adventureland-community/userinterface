import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bagAlreadySorted,
  compareBagItems,
  isBagSlotBlocked,
  normalizeObservedBagItems,
  observedBagSlotCount,
  planBagSortSwaps,
  wouldStackOnMove,
} from "../src/lib/bagSort";
import {
  applyBagSortPreset,
  describeBagSortRules,
  normalizeBagSortPrefs,
} from "../src/lib/bagSortPrefs";
import { buildBagSortScript, sortBatchDelayMs, unwrapBagSortScript } from "../src/host/bagSortCommands";

const G = {
  items: {
    hpot0: { type: "pot", g: 20, s: 1, name: "HP Potion" },
    scroll0: { type: "scroll", g: 40, s: 1, name: "scroll0" },
    sword: { type: "weapon", g: 60, s: 0, name: "sword" },
    hpot1: { type: "pot", g: 20, s: 1, name: "hpot1" },
  },
} as any;

describe("bagSort", () => {
  it("pads bag to isize for planning", () => {
    const items = normalizeObservedBagItems({
      isize: 8,
      items: [{ name: "scroll0" }, null, { name: "hpot0" }],
    });
    assert.equal(items.length, 8);
    assert.equal(observedBagSlotCount({ isize: 8, items: [] }), 8);
  });

  it("sorts by category with empty slots last", () => {
    const items = normalizeObservedBagItems({
      isize: 4,
      items: [{ name: "scroll0" }, null, { name: "hpot0" }, { name: "sword" }],
    });
    const prefs = applyBagSortPreset("byType");
    const swaps = planBagSortSwaps(items, prefs, G);
    assert.ok(swaps.length >= 1);

    const copy = items.slice();
    for (let i = 0; i < swaps.length; i++) {
      const a = swaps[i][0];
      const b = swaps[i][1];
      const tmp = copy[a];
      copy[a] = copy[b];
      copy[b] = tmp;
    }
    assert.equal(copy[0]?.name, "hpot0");
    assert.equal(copy[1]?.name, "scroll0");
    assert.equal(copy[2]?.name, "sword");
    assert.equal(copy[3], null);
    assert.equal(bagAlreadySorted(copy, prefs, G), true);
  });

  it("compareBagItems uses grade when only grade rule enabled", () => {
    const prefs = normalizeBagSortPrefs({
      preset: "custom",
      rules: [{ id: "r1", key: "grade", dir: "desc", enabled: true }],
    });
    const cmp = compareBagItems({ name: "sword" }, { name: "scroll0" }, prefs, G);
    assert.ok(cmp < 0);
  });

  it("avoids direct swap that would stack merge", () => {
    const a = { name: "hpot0", q: 5 };
    const b = { name: "hpot0", q: 3 };
    assert.equal(wouldStackOnMove(a, b, G), true);
    const items = normalizeObservedBagItems({
      isize: 3,
      items: [a, b, null],
    });
    const prefs = applyBagSortPreset("default");
    const swaps = planBagSortSwaps(items, prefs, G);
    for (let i = 0; i < swaps.length; i++) {
      assert.notDeepEqual(swaps[i], [0, 1]);
    }
  });

  it("buildBagSortScript uses isize bounds, placeholder guard, and sleep", () => {
    const script = buildBagSortScript([[0, 2]], { intro: "go", done: true });
    assert.match(script, /var __n=Math.max\(character.isize/);
    assert.match(script, /await swap\(0,2\)/);
    assert.match(script, /await sleep\(100\)/);
    assert.match(script, /placeholder slot/);
    assert.match(script, /Bag sorted/);
    assert.match(script, /__ecuBagSortLock/);
    assert.doesNotMatch(script, /return;\}\}await/);
  });

  it("buildBagSortScript body is valid JavaScript", () => {
    const script = buildBagSortScript(
      [
        [0, 2],
        [1, 3],
      ],
      { done: true },
    );
    const body = unwrapBagSortScript(script);
    assert.doesNotThrow(() => {
      new Function(`async function sortProbe(){${body}}`);
    });
  });

  it("sortBatchDelayMs scales with batch size", () => {
    assert.ok(sortBatchDelayMs(5) > sortBatchDelayMs(1));
    assert.ok(sortBatchDelayMs(5) >= 5 * 190);
  });

  it("treats placeholder slots as blocked during planning", () => {
    const items = normalizeObservedBagItems({
      isize: 4,
      items: [{ name: "hpot0" }, { name: "placeholder", p: { name: "placeholder_m" } }, null, { name: "scroll0" }],
    });
    assert.equal(isBagSlotBlocked(items[1]), true);
    const prefs = applyBagSortPreset("byName");
    const swaps = planBagSortSwaps(items, prefs, G);
    for (let i = 0; i < swaps.length; i++) {
      assert.notEqual(swaps[i][0], 1);
      assert.notEqual(swaps[i][1], 1);
    }
  });

  it("describeBagSortRules summarizes enabled chain", () => {
    const prefs = applyBagSortPreset("byName");
    assert.match(describeBagSortRules(prefs), /Item name/);
  });
});

describe("bagSortPrefs", () => {
  it("loads presets with stable rule ids", () => {
    const byQuality = applyBagSortPreset("byQuality");
    assert.equal(byQuality.preset, "byQuality");
    assert.ok(byQuality.rules.length >= 3);
    assert.ok(byQuality.rules.every((r) => r.id && r.enabled));
  });
});
