import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPhoneEdgeStart,
  classifyPhoneEdgeSwipe,
  PHONE_EDGE_INSET_PX,
  PHONE_EDGE_MIN_DIST_PX,
} from "../src/ui/chrome/phoneEdgeGestures";

const VW = 390;
const VH = 844;
const BAND_TOP = VH - 100;

describe("phoneEdgeGestures", () => {
  it("detects starts in the four edge bands", () => {
    assert.equal(
      classifyPhoneEdgeStart(4, 400, VW, VH, BAND_TOP),
      "left",
    );
    assert.equal(
      classifyPhoneEdgeStart(VW - 4, 400, VW, VH, BAND_TOP),
      "right",
    );
    assert.equal(
      classifyPhoneEdgeStart(200, 4, VW, VH, BAND_TOP),
      "top",
    );
    assert.equal(
      classifyPhoneEdgeStart(200, BAND_TOP + 8, VW, VH, BAND_TOP),
      "bottom",
    );
    assert.equal(
      classifyPhoneEdgeStart(200, 400, VW, VH, BAND_TOP),
      null,
    );
    assert.equal(
      classifyPhoneEdgeStart(PHONE_EDGE_INSET_PX + 1, 400, VW, VH, BAND_TOP),
      null,
    );
  });

  it("requires inward travel past the min distance", () => {
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 4,
        startY: 400,
        endX: 4 + PHONE_EDGE_MIN_DIST_PX - 10,
        endY: 400,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      null,
    );
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 4,
        startY: 400,
        endX: 4 + PHONE_EDGE_MIN_DIST_PX + 10,
        endY: 410,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      "left",
    );
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: VW - 4,
        startY: 400,
        endX: VW - 4 - PHONE_EDGE_MIN_DIST_PX - 10,
        endY: 405,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      "right",
    );
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 200,
        startY: 4,
        endX: 205,
        endY: 4 + PHONE_EDGE_MIN_DIST_PX + 10,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      "top",
    );
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 200,
        startY: BAND_TOP + 10,
        endX: 200,
        endY: BAND_TOP + 10 - PHONE_EDGE_MIN_DIST_PX - 10,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      "bottom",
    );
  });

  it("rejects diagonal / outward strokes", () => {
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 4,
        startY: 400,
        endX: 120,
        endY: 520,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      null,
    );
    assert.equal(
      classifyPhoneEdgeSwipe({
        startX: 4,
        startY: 400,
        endX: 4 - 80,
        endY: 400,
        viewportW: VW,
        viewportH: VH,
        bottomBandTop: BAND_TOP,
      }),
      null,
    );
  });
});
