import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAutoSizeMaxWidth,
  autoSizeMaxWidthPx,
  clampMeterFrame,
  INSPECTOR_FRAME_DEFAULT,
  METER_FRAME_DEFAULT,
  METER_FRAME_MIN,
  PARTY_CHIP_GAP,
  PARTY_CHIP_WIDTH,
  PARTY_MAX_COLS,
  PARTY_ROSTER_PAD,
  partyChipRowWidth,
  partyRosterMaxWidth,
  PLAYERS_FRAME_DEFAULT,
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

describe("party auto-size width cap", () => {
  it("is three chip columns plus gaps and roster padding", () => {
    assert.equal(PARTY_MAX_COLS, 3);
    assert.equal(
      partyChipRowWidth(3),
      PARTY_CHIP_WIDTH * 3 + PARTY_CHIP_GAP * 2,
    );
    assert.equal(
      partyRosterMaxWidth(3),
      PARTY_ROSTER_PAD * 2 + partyChipRowWidth(3),
    );
    assert.equal(PLAYERS_FRAME_DEFAULT.frameW, partyRosterMaxWidth(3));
  });

  it("keeps a fourth chip from widening the auto-sized roster", () => {
    assert.ok(partyRosterMaxWidth(4) > partyRosterMaxWidth(3));
    assert.equal(autoSizeMaxWidthPx("players"), partyRosterMaxWidth(3));
    assert.equal(autoSizeMaxWidthPx("mail"), undefined);
    assert.equal(autoSizeMaxWidthPx("command"), 720);
  });

  it("applies the cap only while auto-resize is on", () => {
    const on: Record<string, any> = { maxWidth: "100vw" };
    applyAutoSizeMaxWidth(on, "players", true);
    assert.equal(on.maxWidth, `min(${partyRosterMaxWidth(3)}px, 100vw)`);

    const off: Record<string, any> = { maxWidth: "100vw" };
    applyAutoSizeMaxWidth(off, "players", false);
    assert.equal(off.maxWidth, "100vw");

    const other: Record<string, any> = { maxWidth: "100vw" };
    applyAutoSizeMaxWidth(other, "buffInfo", true);
    assert.equal(other.maxWidth, "100vw");

    const command: Record<string, any> = { maxWidth: "100vw" };
    applyAutoSizeMaxWidth(command, "command", true);
    assert.equal(command.maxWidth, "min(720px, 100vw)");
  });
});
