import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateUnitFrame } from "../src/lib/layoutFrameMigrations";
import { DEFAULT_LAYOUT_PHONE } from "../src/lib/layoutDefaults";

describe("migrateUnitFrame phone Players stack", () => {
  it("moves mid-band side-by-side frames onto the stacked phone defaults", () => {
    const playerDef = DEFAULT_LAYOUT_PHONE.playerFrame;
    const targetDef = DEFAULT_LAYOUT_PHONE.targetFrame;
    const player = migrateUnitFrame(
      { x: 28, y: 48, anchor: "bc", frameW: 300, frameH: 112 },
      playerDef,
    );
    const target = migrateUnitFrame(
      { x: 72, y: 48, anchor: "bc", frameW: 300, frameH: 112 },
      targetDef,
    );
    assert.equal(player.x, playerDef.x);
    assert.equal(player.y, playerDef.y);
    assert.equal(player.frameW, playerDef.frameW);
    assert.equal(target.x, targetDef.x);
    assert.equal(target.y, targetDef.y);
    assert.ok((target.y as number) < (player.y as number));
  });

  it("leaves user-moved frames alone", () => {
    const def = DEFAULT_LAYOUT_PHONE.playerFrame;
    const kept = migrateUnitFrame(
      { x: 40, y: 70, anchor: "bc", frameW: 300, frameH: 112 },
      def,
    );
    assert.equal(kept.x, 40);
    assert.equal(kept.y, 70);
  });
});
