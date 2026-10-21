import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  coerceItemLevel,
  resolveItemLevelBadge,
} from "../src/lib/itemLevelBadge";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(g: Record<string, unknown>): void {
  (globalThis as Win).window = { G: g };
}

afterEach(() => {
  delete (globalThis as Win).window;
});

describe("resolveItemLevelBadge", () => {
  it("coerces string levels", () => {
    assert.equal(coerceItemLevel("9"), 9);
    assert.equal(coerceItemLevel(""), undefined);
  });

  it("uses stock upgrade letters and colors", () => {
    installG({
      items: { dagger: { name: "Dagger", upgrade: true } },
    });
    assert.deepEqual(resolveItemLevelBadge("dagger", 9), {
      text: "9",
      color: "#E64D31",
    });
    assert.deepEqual(resolveItemLevelBadge("dagger", 10), {
      text: "X",
      color: "#B753C7",
    });
    assert.deepEqual(resolveItemLevelBadge("dagger", "12"), {
      text: "Z",
      color: "#B753C7",
    });
  });

  it("uses stock compound letters and colors", () => {
    installG({
      items: { wbook0: { name: "Book", compound: true } },
    });
    assert.deepEqual(resolveItemLevelBadge("wbook0", 5), {
      text: "V",
      color: "#B753C7",
    });
    assert.deepEqual(resolveItemLevelBadge("wbook0", 7), {
      text: "R",
      color: "#D71D41",
    });
  });

  it("maps booster grades to A–E / W", () => {
    installG({
      items: { xpbooster: { name: "XP Booster", type: "booster" } },
    });
    assert.deepEqual(resolveItemLevelBadge("xpbooster", 1), {
      text: "A",
      color: "#FFC949",
    });
    assert.deepEqual(resolveItemLevelBadge("xpbooster", 6), {
      text: "W",
      color: "#5BAD59",
    });
  });

  it("returns null for missing or zero level", () => {
    assert.equal(resolveItemLevelBadge("candy1", undefined), null);
    assert.equal(resolveItemLevelBadge("candy1", 0), null);
  });
});
