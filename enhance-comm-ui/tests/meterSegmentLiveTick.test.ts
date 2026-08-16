/**
 * segmentWantsLiveTick + partsForRun include live for Overall / run overall.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partsForRun } from "../src/meters/meterSegmentCatalog";
import { segmentWantsLiveTick } from "../src/meters/meterSegmentRef";
import { emptySegment, ensureActor } from "../src/meters/sessionSegment";
import type { CombatSegment } from "../src/meters/meterTypes";

function liveSeg(partial: Partial<CombatSegment> & { id?: string }): CombatSegment {
  const seg = emptySegment(partial.id || "live-1", 1000);
  seg.map = partial.map || "crypt";
  seg.mapIn = partial.mapIn;
  seg.event = partial.event;
  ensureActor(seg, "a", { name: "A", ctype: "mage" });
  return seg;
}

describe("segmentWantsLiveTick", () => {
  const live = liveSeg({ mapIn: "abc", event: "goo" });

  it("always ticks Current", () => {
    assert.equal(segmentWantsLiveTick("current", null), true);
    assert.equal(segmentWantsLiveTick(undefined, null), true);
    assert.equal(segmentWantsLiveTick("current", live), true);
  });

  it("ticks Overall only while a live fight exists", () => {
    assert.equal(segmentWantsLiveTick("total", live), true);
    assert.equal(segmentWantsLiveTick("total", null), false);
  });

  it("ticks run overall only when live matches mapIn / event", () => {
    assert.equal(
      segmentWantsLiveTick({ mapIn: "abc" }, live),
      true,
    );
    assert.equal(
      segmentWantsLiveTick({ mapIn: "other" }, live),
      false,
    );
    assert.equal(
      segmentWantsLiveTick({ event: "goo" }, live),
      true,
    );
    assert.equal(
      segmentWantsLiveTick({ event: "snowman" }, live),
      false,
    );
  });

  it("never ticks sealed past fights", () => {
    assert.equal(
      segmentWantsLiveTick({ pastId: "fight-1" }, live),
      false,
    );
  });
});

describe("partsForRun includes live", () => {
  it("merges live into Overall and matching Crypt overall", () => {
    const live = liveSeg({ mapIn: "abc" });
    const past = [emptySegment("past-1", 500)];
    past[0].mapIn = "abc";
    const overall = partsForRun("total", live, past);
    assert.equal(overall.length, 2);
    assert.equal(overall[0].id, live.id);
    const run = partsForRun({ mapIn: "abc" }, live, past);
    assert.equal(run.length, 2);
    const other = partsForRun({ mapIn: "zzz" }, live, past);
    assert.equal(other.length, 0);
  });
});
