import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOSABLE_PANEL_IDS,
  PANEL_LABELS,
} from "../src/lib/panelCatalog";

describe("phone windows sheet catalog", () => {
  it("every closable panel has a label for the switch list", () => {
    for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
      const id = CLOSABLE_PANEL_IDS[i];
      assert.ok(PANEL_LABELS[id], "missing label for " + id);
    }
  });
});
