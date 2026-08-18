import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLayout } from "../src/lib/layout";
import {
  applyWindowFramePersist,
  canAutoSizeWindow,
  filterPersistedFrameSize,
  panelUsesAutoSize,
  windowFramePersist,
} from "../src/lib/panelCatalog";

describe("windowFramePersist", () => {
  it("maps chips/bag to none, party to width-only, others to box", () => {
    assert.equal(windowFramePersist("bag"), "none");
    assert.equal(windowFramePersist("serverInfo"), "none");
    assert.equal(windowFramePersist("players"), "w");
    assert.equal(windowFramePersist("mail"), "wh");
  });

  it("defaults party to auto-size and keeps a saved off flag", () => {
    assert.equal(canAutoSizeWindow("players"), true);
    assert.equal(canAutoSizeWindow("buffInfo"), true);
    assert.equal(canAutoSizeWindow("itemInfo"), true);
    assert.equal(canAutoSizeWindow("mail"), false);
    assert.equal(panelUsesAutoSize(undefined, "players"), true);
    assert.equal(panelUsesAutoSize(undefined, "buffInfo"), true);
    assert.equal(panelUsesAutoSize(undefined, "itemInfo"), true);
    assert.equal(panelUsesAutoSize({ autoSize: false }, "players"), false);
    assert.equal(panelUsesAutoSize({ autoSize: false }, "buffInfo"), false);
    const seeded = mergeLayout(undefined, "desktop");
    assert.equal(seeded.players.autoSize, true);
    assert.equal(seeded.buffInfo.autoSize, true);
    assert.equal(seeded.itemInfo.autoSize, true);
    const legacy = mergeLayout(
      {
        players: {
          x: 0.4,
          y: 0.4,
          anchor: "tl",
          frameW: 440,
        },
      },
      "desktop",
    );
    assert.equal(legacy.players.autoSize, true);
    const kept = mergeLayout(
      {
        players: {
          x: 0.4,
          y: 0.4,
          anchor: "tl",
          frameW: 440,
          autoSize: false,
        },
      },
      "desktop",
    );
    assert.equal(kept.players.autoSize, false);
    assert.equal(kept.players.frameW, 440);
  });

  it("strips height for width-only persist", () => {
    const out = applyWindowFramePersist(
      { x: 0, y: 0, anchor: "tl" as const, frameW: 520, frameH: 80 },
      "players",
    );
    assert.equal(out.frameW, 520);
    assert.equal(out.frameH, undefined);
  });

  it("drops height from party resize writes", () => {
    const size = filterPersistedFrameSize("players", {
      frameW: 480,
      frameH: 200,
    });
    assert.equal(size.frameW, 480);
    assert.equal(size.frameH, undefined);
  });

  it("mergeLayout does not persist party height", () => {
    const layout = mergeLayout(
      {
        players: {
          x: 0.4,
          y: 0.4,
          anchor: "tl",
          frameW: 440,
          frameH: 90,
        },
      },
      "desktop",
    );
    assert.equal(layout.players.frameW, 440);
    assert.equal(layout.players.frameH, undefined);
  });
});
