import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampMeterFrame,
  INSPECTOR_FRAME_DEFAULT,
  METER_FRAME_DEFAULT,
  METER_FRAME_MIN,
  REPORT_FRAME_DEFAULT,
} from "../src/lib/frameSizes";

const VP = { w: 1920, h: 1080 };
const OLD_MAX = { w: 960, h: 720 };

describe("clampMeterFrame", () => {
  it("floors at METER_FRAME_MIN", () => {
    const got = clampMeterFrame(100, 50, VP.w, VP.h);
    assert.deepEqual(got, {
      frameW: METER_FRAME_MIN.w,
      frameH: METER_FRAME_MIN.h,
    });
  });

  it("allows sizes past the old 960×720 hard cap", () => {
    const got = clampMeterFrame(1200, 900, VP.w, VP.h);
    assert.deepEqual(got, { frameW: 1200, frameH: 900 });
  });

  it("ceilings at the viewport", () => {
    const got = clampMeterFrame(2000, 1400, VP.w, VP.h);
    assert.deepEqual(got, { frameW: VP.w, frameH: VP.h });
  });

  it("keeps per-type defaults unchanged", () => {
    assert.deepEqual(
      clampMeterFrame(METER_FRAME_DEFAULT.w, METER_FRAME_DEFAULT.h, VP.w, VP.h),
      { frameW: METER_FRAME_DEFAULT.w, frameH: METER_FRAME_DEFAULT.h },
    );
    assert.deepEqual(
      clampMeterFrame(
        INSPECTOR_FRAME_DEFAULT.w,
        INSPECTOR_FRAME_DEFAULT.h,
        VP.w,
        VP.h,
      ),
      {
        frameW: INSPECTOR_FRAME_DEFAULT.w,
        frameH: INSPECTOR_FRAME_DEFAULT.h,
      },
    );
    assert.deepEqual(
      clampMeterFrame(
        REPORT_FRAME_DEFAULT.w,
        REPORT_FRAME_DEFAULT.h,
        VP.w,
        VP.h,
      ),
      { frameW: REPORT_FRAME_DEFAULT.w, frameH: REPORT_FRAME_DEFAULT.h },
    );
  });

  it("is not capped by the retired METER_FRAME_MAX", () => {
    const overOld = clampMeterFrame(OLD_MAX.w + 80, OLD_MAX.h + 80, VP.w, VP.h);
    assert.ok(overOld.frameW > OLD_MAX.w);
    assert.ok(overOld.frameH > OLD_MAX.h);
  });
});
