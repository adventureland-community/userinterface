/**
 * Open buff/debuff bars: predicted `expectedEndAt` past the playhead when
 * known; otherwise stretch to playhead (not Date.now() remount jumps).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildLanes,
  laneDataSig,
  timelineHorizonSec,
} from "../src/ui/meter/views/timeline/timelineLanes";
import {
  visualDurationSec,
  type TimelineBlock,
} from "../src/ui/meter/views/timeline/timelineModel";
import type { CastMarker, ConditionInterval } from "../src/meters/meterTypes";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG() {
  const g = globalThis as Win;
  g.window = {
    G: {
      conditions: {
        mluck: { buff: true },
        stunned: { debuff: true },
      },
      skills: {
        mluck: { cooldown: 0 },
        warcry: { cooldown: 30_000 },
      },
    },
  };
}

describe("timeline open aura duration", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  const start = 1_000_000;
  const cond = (
    endedAt?: number,
    expectedEndAt?: number,
  ): ConditionInterval => ({
    actorId: "p1",
    key: "mluck",
    startedAt: start,
    endedAt,
    expectedEndAt,
  });

  it("open aura without prediction follows playhead nowMs", () => {
    installG();
    const lanes = buildLanes(
      [],
      [cond()],
      [],
      [],
      start,
      "buffs",
      { p1: "Ada" },
      { p1: "mage" },
      null,
      undefined,
      start + 12_000,
    );
    const b = lanes[0].blocks[0];
    assert.equal(b.isOpen, true);
    assert.equal(b.durationSec, 12);
    assert.equal(visualDurationSec(b), 12);
  });

  it("open aura with expectedEndAt draws past the playhead", () => {
    installG();
    const lanes = buildLanes(
      [],
      [cond(undefined, start + 40_000)],
      [],
      [],
      start,
      "buffs",
      { p1: "Ada" },
      { p1: "mage" },
      null,
      undefined,
      start + 5_000,
    );
    const b = lanes[0].blocks[0];
    assert.equal(b.isOpen, true);
    assert.equal(b.durationSec, 40);
    assert.equal(visualDurationSec(b), 40);
  });

  it("ended aura uses endedAt, not playhead or prediction", () => {
    installG();
    const lanes = buildLanes(
      [],
      [cond(start + 5_000, start + 40_000)],
      [],
      [],
      start,
      "buffs",
      { p1: "Ada" },
      { p1: "mage" },
      null,
      undefined,
      start + 60_000,
    );
    const b = lanes[0].blocks[0];
    assert.equal(b.isOpen, false);
    assert.equal(b.durationSec, 5);
    assert.equal(visualDurationSec(b), 5);
  });

  it("laneDataSig ticks only for unknown-end open auras", () => {
    const openUnk: ConditionInterval[] = [cond()];
    const a = laneDataSig([], openUnk, [], "all", start, "r", 0, start + 1_000);
    const b = laneDataSig([], openUnk, [], "all", start, "r", 0, start + 1_000);
    const c = laneDataSig([], openUnk, [], "all", start, "r", 0, start + 1_300);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(c, /\|o\d+/);

    const predicted: ConditionInterval[] = [cond(undefined, start + 30_000)];
    const p0 = laneDataSig(
      [],
      predicted,
      [],
      "all",
      start,
      "r",
      0,
      start + 1_000,
    );
    const p1 = laneDataSig(
      [],
      predicted,
      [],
      "all",
      start,
      "r",
      0,
      start + 5_000,
    );
    assert.equal(p0, p1);
    assert.doesNotMatch(p0, /\|o\d+/);
    assert.match(p0, /\|e\d+/);
  });

  it("timelineHorizonSec includes cast CD and predicted condition ends", () => {
    installG();
    const casts: CastMarker[] = [
      { at: start, actorId: "p1", source: "warcry" },
    ];
    const conditions: ConditionInterval[] = [cond(undefined, start + 50_000)];
    const now = start + 2_000;
    const h = timelineHorizonSec(start, now, casts, conditions);
    assert.ok(h >= 30, `horizon ${h} should cover warcry CD`);
    assert.ok(h >= 50, `horizon ${h} should cover predicted buff end`);
  });

  it("visualDurationSec does not call Date.now for open conditions", () => {
    const block: TimelineBlock = {
      kind: "condition",
      domKey: "x",
      key: "mluck",
      label: "Mluck",
      atSec: 0,
      durationSec: 7.5,
      isOpen: true,
      startedAtMs: Date.now() - 60_000,
      condKind: "buff",
    };
    assert.equal(visualDurationSec(block), 7.5);
  });
});
