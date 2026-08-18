import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABILITY_TIMELINE_FRAME_DEFAULT,
  ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT,
} from "../src/lib/frameSizes";
import {
  abilityTimelineFrameForOrient,
  applyAbilityTimelineOrientFrame,
} from "../src/lib/abilityTimelineFrame";

describe("abilityTimelineFrameForOrient", () => {
  it("swaps the default vertical stick to a wide horizontal rail", () => {
    const next = abilityTimelineFrameForOrient(
      "horizontal",
      ABILITY_TIMELINE_FRAME_DEFAULT,
    );
    assert.deepEqual(next, ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT);
  });

  it("keeps travel length when the vertical rail is taller than default", () => {
    const next = abilityTimelineFrameForOrient("horizontal", {
      frameW: 50,
      frameH: 800,
    });
    assert.deepEqual(next, { frameW: 800, frameH: 80 });
  });

  it("swaps a horizontal rail back to a vertical stick", () => {
    const next = abilityTimelineFrameForOrient(
      "vertical",
      ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT,
    );
    assert.deepEqual(next, { frameW: 80, frameH: 500 });
  });

  it("does not clobber a user-resized mid-size frame", () => {
    const box = { frameW: 240, frameH: 280 };
    assert.equal(abilityTimelineFrameForOrient("horizontal", box), null);
    assert.equal(abilityTimelineFrameForOrient("vertical", box), null);
  });

  it("does not swap when the frame already matches the target orientation", () => {
    assert.equal(
      abilityTimelineFrameForOrient(
        "vertical",
        ABILITY_TIMELINE_FRAME_DEFAULT,
      ),
      null,
    );
    assert.equal(
      abilityTimelineFrameForOrient(
        "horizontal",
        ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT,
      ),
      null,
    );
  });
});

describe("applyAbilityTimelineOrientFrame", () => {
  it("rewrites a vertical stick in a layout map for horizontal orient", () => {
    const layout = {
      abilityTimeline: { ...ABILITY_TIMELINE_FRAME_DEFAULT, x: 10, y: 20 },
    };
    const next = applyAbilityTimelineOrientFrame(layout, "horizontal");
    assert.equal(next.abilityTimeline?.x, 10);
    assert.equal(next.abilityTimeline?.y, 20);
    assert.equal(
      next.abilityTimeline?.frameW,
      ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT.frameW,
    );
    assert.equal(
      next.abilityTimeline?.frameH,
      ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT.frameH,
    );
  });

  it("returns the same map when the box is already the right rail", () => {
    const layout = {
      abilityTimeline: { ...ABILITY_TIMELINE_FRAME_DEFAULT },
    };
    assert.equal(applyAbilityTimelineOrientFrame(layout, "vertical"), layout);
  });
});
