import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GAME_FPS_CAP_OFF,
  detectForeignRafWrapper,
  formatGameFpsReadout,
  gameFpsCapIntervalMs,
  gameFpsCapLabel,
  gameFpsCapNeedsHook,
  isForcedDrawArgs,
  normalizeGameFpsCap,
  resolveGameFpsCapRate,
  resolveGameFpsDrawPolicy,
  shouldRunDrawFrame,
} from "../src/lib/gameFpsCap";

describe("gameFpsCap normalize", () => {
  it("accepts 30 and 60; anything else is Off", () => {
    assert.equal(normalizeGameFpsCap(30), 30);
    assert.equal(normalizeGameFpsCap(60), 60);
    assert.equal(normalizeGameFpsCap("30"), 30);
    assert.equal(normalizeGameFpsCap("60"), 60);
    assert.equal(normalizeGameFpsCap(0), GAME_FPS_CAP_OFF);
    assert.equal(normalizeGameFpsCap(144), GAME_FPS_CAP_OFF);
    assert.equal(normalizeGameFpsCap("auto"), GAME_FPS_CAP_OFF);
  });

  it("labels and intervals", () => {
    assert.equal(gameFpsCapLabel(0), "Off");
    assert.equal(gameFpsCapLabel(30), "30");
    assert.equal(gameFpsCapLabel(60), "60");
    assert.equal(gameFpsCapIntervalMs(0), 0);
    assert.ok(Math.abs(gameFpsCapIntervalMs(60) - 1000 / 60) < 1e-9);
  });

  it("needs hook when any piece is on", () => {
    assert.equal(
      gameFpsCapNeedsHook({
        cap: 0,
        whenHidden: false,
        whenBlurred: false,
        pauseWhenCovered: false,
      }),
      false,
    );
    assert.equal(
      gameFpsCapNeedsHook({
        cap: 0,
        whenHidden: true,
        whenBlurred: false,
        pauseWhenCovered: false,
      }),
      true,
    );
    assert.equal(
      gameFpsCapNeedsHook({
        cap: 30,
        whenHidden: false,
        whenBlurred: false,
        pauseWhenCovered: false,
      }),
      true,
    );
  });

  it("resolves independent toggles", () => {
    const focused = {
      hidden: false,
      blurred: false,
      covered: false,
    };
    assert.deepEqual(
      resolveGameFpsDrawPolicy(
        { cap: 0, whenHidden: true, whenBlurred: true, pauseWhenCovered: true },
        focused,
      ),
      { rate: 0, paused: false, reason: "off" },
    );
    assert.deepEqual(
      resolveGameFpsDrawPolicy(
        { cap: 0, whenHidden: true, whenBlurred: false, pauseWhenCovered: false },
        { ...focused, hidden: true },
      ),
      { rate: 60, paused: false, reason: "hidden" },
    );
    assert.deepEqual(
      resolveGameFpsDrawPolicy(
        { cap: 0, whenHidden: false, whenBlurred: true, pauseWhenCovered: false },
        { ...focused, blurred: true },
      ),
      { rate: 60, paused: false, reason: "blurred" },
    );
    assert.deepEqual(
      resolveGameFpsDrawPolicy(
        { cap: 30, whenHidden: false, whenBlurred: false, pauseWhenCovered: true },
        { ...focused, covered: true },
      ),
      { rate: 0, paused: true, reason: "covered" },
    );
    assert.deepEqual(
      resolveGameFpsDrawPolicy(
        { cap: 30, whenHidden: false, whenBlurred: false, pauseWhenCovered: false },
        { ...focused, covered: true },
      ),
      { rate: 30, paused: false, reason: "cap30" },
    );
  });

  it("resolveGameFpsCapRate covers hidden-only shortcut", () => {
    assert.equal(resolveGameFpsCapRate(0, true), 60);
    assert.equal(resolveGameFpsCapRate(30, false), 30);
  });
});

describe("shouldRunDrawFrame", () => {
  const interval = 1000 / 60;

  it("skips when paused unless forced", () => {
    assert.deepEqual(
      shouldRunDrawFrame({
        nowMs: 10,
        nextDueMs: 5,
        intervalMs: interval,
        forced: false,
        paused: true,
      }),
      { run: false, nextDueMs: 5 },
    );
    assert.deepEqual(
      shouldRunDrawFrame({
        nowMs: 10,
        nextDueMs: 5,
        intervalMs: interval,
        forced: true,
        paused: true,
      }),
      { run: true, nextDueMs: 0 },
    );
  });

  it("skips early frames then advances nextDue", () => {
    const first = shouldRunDrawFrame({
      nowMs: 1000,
      nextDueMs: 0,
      intervalMs: interval,
      forced: false,
    });
    assert.equal(first.run, true);
    const early = shouldRunDrawFrame({
      nowMs: first.nextDueMs - interval * 0.5,
      nextDueMs: first.nextDueMs,
      intervalMs: interval,
      forced: false,
    });
    assert.equal(early.run, false);
  });
});

describe("isForcedDrawArgs", () => {
  it("detects true anywhere in the args list", () => {
    assert.equal(isForcedDrawArgs([]), false);
    assert.equal(isForcedDrawArgs([16, true]), true);
  });
});

describe("foreign raf + readout", () => {
  it("flags plain shims", () => {
    function shim(_cb: FrameRequestCallback) {
      return 1;
    }
    assert.equal(detectForeignRafWrapper(shim), true);
  });

  it("formats a short settings readout", () => {
    assert.equal(
      formatGameFpsReadout({
        fps: 59.6,
        policy: { rate: 60, paused: false, reason: "blurred" },
        foreignRaf: false,
      }),
      "60 FPS · cap 60 (blurred)",
    );
  });
});
