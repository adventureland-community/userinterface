import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slotsFromComposeAttaches } from "../../src/ui/bag/composeBagHighlight";

describe("slotsFromComposeAttaches", () => {
  it("dedupes and drops invalid slots", () => {
    assert.deepEqual(
      slotsFromComposeAttaches([
        { slot: 3 },
        { slot: 1 },
        { slot: 3 },
        { slot: -1 },
        { slot: Number.NaN },
      ]),
      [3, 1],
    );
  });

  it("returns empty for no attaches", () => {
    assert.deepEqual(slotsFromComposeAttaches([]), []);
  });
});
