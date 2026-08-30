import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSplitScript,
  maxSplitQuantity,
} from "../src/host/bagSplitCommands";

describe("bag split", () => {
  it("builds split script with quantity", () => {
    const script = buildSplitScript({ slot: 3, name: "hpot0", q: 200 }, 50);
    assert.match(script, /await split\(__slot,50\)/);
    assert.match(script, /not a stack/);
  });

  it("rejects non-positive quantity", () => {
    const script = buildSplitScript({ slot: 0, name: "hpot0", q: 5 }, 0);
    assert.match(script, /invalid quantity/);
  });

  it("max split respects stack and leaves at least one", () => {
    const prevG = (globalThis as any).window;
    (globalThis as any).window = {
      G: { items: { hpot0: { s: 9999 } } },
    };
    try {
      assert.equal(maxSplitQuantity({ slot: 0, name: "hpot0", q: 1 }), 0);
      assert.equal(maxSplitQuantity({ slot: 0, name: "hpot0", q: 2 }), 1);
      assert.equal(maxSplitQuantity({ slot: 0, name: "hpot0", q: 200 }), 199);
    } finally {
      if (prevG === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prevG;
    }
  });

  it("max split caps at item stack size", () => {
    const prevG = (globalThis as any).window;
    (globalThis as any).window = {
      G: { items: { scroll0: { s: 40 } } },
    };
    try {
      assert.equal(maxSplitQuantity({ slot: 1, name: "scroll0", q: 100 }), 40);
    } finally {
      if (prevG === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prevG;
    }
  });
});
