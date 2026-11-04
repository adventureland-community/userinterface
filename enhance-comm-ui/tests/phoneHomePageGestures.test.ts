import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPhoneHomePageStart,
  classifyPhoneHomePageSwipe,
  PHONE_HOME_SWIPE_MIN_PX,
} from "../src/ui/chrome/phoneHomePageGestures";

const VW = 390;
const VH = 844;
const BOTTOM = VH - 180;

describe("phoneHomePageGestures", () => {
  it("accepts center starts and rejects edge / dock bands", () => {
    assert.equal(
      classifyPhoneHomePageStart(200, 300, VW, VH, BOTTOM),
      true,
    );
    assert.equal(classifyPhoneHomePageStart(4, 300, VW, VH, BOTTOM), false);
    assert.equal(classifyPhoneHomePageStart(200, 4, VW, VH, BOTTOM), false);
    assert.equal(
      classifyPhoneHomePageStart(200, BOTTOM + 4, VW, VH, BOTTOM),
      false,
    );
  });

  it("maps horizontal swipes to next/prev pages", () => {
    assert.equal(
      classifyPhoneHomePageSwipe({
        startX: 200,
        startY: 300,
        endX: 200 - PHONE_HOME_SWIPE_MIN_PX - 10,
        endY: 305,
        viewportW: VW,
        viewportH: VH,
        bottomExcludeTop: BOTTOM,
      }),
      1,
    );
    assert.equal(
      classifyPhoneHomePageSwipe({
        startX: 200,
        startY: 300,
        endX: 200 + PHONE_HOME_SWIPE_MIN_PX + 10,
        endY: 305,
        viewportW: VW,
        viewportH: VH,
        bottomExcludeTop: BOTTOM,
      }),
      -1,
    );
    assert.equal(
      classifyPhoneHomePageSwipe({
        startX: 200,
        startY: 300,
        endX: 200 - 20,
        endY: 305,
        viewportW: VW,
        viewportH: VH,
        bottomExcludeTop: BOTTOM,
      }),
      null,
    );
  });
});
