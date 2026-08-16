/**
 * Camera keep-or-close: observer hops near the same fight should keep Current.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideSegmentBoundary,
  type MeterCamera,
} from "../src/meters/meterSegmentBoundary";
import { emptySegment, ensureActor } from "../src/meters/sessionSegment";
import type { CombatSegment } from "../src/meters/meterTypes";

function cam(partial: Partial<MeterCamera> & { observingId: string }): MeterCamera {
  return {
    map: "main",
    mapIn: "",
    serverRegion: "EU",
    serverIdentifier: "I",
    partyKey: "",
    observingName: "",
    observingCtype: "mage",
    ...partial,
  };
}

function liveWithActors(
  actors: Array<{ id: string; partyKey?: string }>,
): CombatSegment {
  const seg = emptySegment("fight-1", 1);
  seg.map = "main";
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    ensureActor(seg, a.id, {
      name: a.id,
      ctype: "mage",
      partyKey: a.partyKey,
    });
  }
  return seg;
}

describe("decideSegmentBoundary observe hops", () => {
  it("keeps Current when hopping party mates on open world (no mapIn)", () => {
    const live = liveWithActors([
      { id: "a", partyKey: "party:rats" },
      { id: "b", partyKey: "party:rats" },
    ]);
    const decision = decideSegmentBoundary({
      prev: cam({
        observingId: "a",
        partyKey: "party:rats",
        map: "main",
        mapIn: "",
      }),
      next: cam({
        observingId: "b",
        partyKey: "party:rats",
        map: "main",
        mapIn: "",
      }),
      live,
    });
    assert.deepEqual(decision, { action: "keep" });
  });

  it("keeps Current when hopping onto a character already on the live tape", () => {
    const live = liveWithActors([{ id: "a" }, { id: "b" }]);
    const decision = decideSegmentBoundary({
      prev: cam({
        observingId: "a",
        partyKey: "solo:a",
        map: "desertland",
      }),
      next: cam({
        observingId: "b",
        partyKey: "solo:b",
        map: "desertland",
      }),
      live,
    });
    assert.deepEqual(decision, { action: "keep" });
  });

  it("keeps Current while observe is briefly cleared mid-switch", () => {
    const live = liveWithActors([{ id: "a" }]);
    const decision = decideSegmentBoundary({
      prev: cam({ observingId: "a", map: "main" }),
      next: cam({ observingId: "", map: "main" }),
      live,
    });
    assert.deepEqual(decision, { action: "keep" });
  });

  it("closes Current when swapping to an unrelated observer on the same map", () => {
    const live = liveWithActors([{ id: "a" }]);
    const decision = decideSegmentBoundary({
      prev: cam({
        observingId: "a",
        partyKey: "solo:a",
        map: "main",
      }),
      next: cam({
        observingId: "z",
        partyKey: "solo:z",
        map: "main",
      }),
      live,
    });
    assert.deepEqual(decision, { action: "close", reason: "observe_swap" });
  });

  it("still keeps party mates inside the same instance mapIn", () => {
    const live = liveWithActors([
      { id: "a", partyKey: "party:rats" },
      { id: "b", partyKey: "party:rats" },
    ]);
    live.map = "crypt";
    const decision = decideSegmentBoundary({
      prev: cam({
        observingId: "a",
        partyKey: "party:rats",
        map: "crypt",
        mapIn: "abc",
      }),
      next: cam({
        observingId: "b",
        partyKey: "party:rats",
        map: "crypt",
        mapIn: "abc",
      }),
      live,
    });
    assert.deepEqual(decision, { action: "keep" });
  });
});
