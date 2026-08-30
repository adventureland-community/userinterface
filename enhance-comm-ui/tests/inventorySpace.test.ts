import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFreeInventorySpace,
  formatTradeSlotSpace,
  freeInventorySlots,
} from "../src/lib/inventorySpace";

describe("inventorySpace", () => {
  it("formats free inventory space", () => {
    assert.equal(freeInventorySlots({ esize: 3, isize: 42 }), 3);
    assert.equal(formatFreeInventorySpace({ esize: 3, isize: 42 }), "3/42 free");
    assert.equal(formatFreeInventorySpace({ esize: 0 }), "0 free");
    assert.equal(formatFreeInventorySpace({}), null);
  });

  it("formats trade slot space", () => {
    const slots = {
      trade1: { name: "hpot0" },
      trade2: null,
      trade3: { name: "scroll0" },
      trade4: null,
    };
    assert.equal(
      formatTradeSlotSpace(["trade1", "trade2", "trade3", "trade4"], slots),
      "2 free · 2 listed",
    );
    assert.equal(
      formatTradeSlotSpace(["trade1", "trade2"], {
        trade1: { name: "a" },
        trade2: { name: "b" },
      }),
      "2 listed",
    );
  });
});
