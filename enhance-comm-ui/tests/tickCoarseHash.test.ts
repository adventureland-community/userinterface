import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  snapshotUiCoarseHash,
  snapshotUiKey,
  type GameSnapshot,
} from "../src/tick";
import type { EntityLike } from "../src/host/globals";

function snap(ents: EntityLike[], extra?: Partial<GameSnapshot>): GameSnapshot {
  return {
    entities: ents,
    observingId: "me",
    observing: ents[0] || null,
    target: undefined,
    S: undefined,
    serverRegion: "EU",
    serverIdentifier: "I",
    now: 1,
    ...extra,
  };
}

describe("snapshotUiCoarseHash", () => {
  it("stays stable when HUD fields are unchanged", () => {
    const a = snap([{ id: "me", hp: 100, mp: 50, player: true }]);
    const b = snap([{ id: "me", hp: 100, mp: 50, player: true }]);
    assert.equal(snapshotUiCoarseHash(a), snapshotUiCoarseHash(b));
  });

  it("changes when HP moves, matching snapshotUiKey direction", () => {
    const a = snap([{ id: "me", hp: 100, mp: 50, player: true }]);
    const b = snap([{ id: "me", hp: 90, mp: 50, player: true }]);
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(b));
    assert.notEqual(snapshotUiKey(a), snapshotUiKey(b));
  });

  it("changes on same-length observingId swaps", () => {
    const a = snap([{ id: "ab", hp: 100, player: true }], {
      observingId: "ab",
    });
    const b = snap([{ id: "cd", hp: 100, player: true }], {
      observingId: "cd",
    });
    assert.equal("ab".length, "cd".length);
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(b));
    assert.notEqual(snapshotUiKey(a), snapshotUiKey(b));
  });

  it("changes when HUD status keys or stacks change", () => {
    const a = snap([
      {
        id: "me",
        hp: 100,
        player: true,
        s: { mluck: { s: 1, ms: 4000 } },
      },
    ]);
    const b = snap([
      {
        id: "me",
        hp: 100,
        player: true,
        s: { mluck: { s: 2, ms: 4000 } },
      },
    ]);
    const c = snap([
      {
        id: "me",
        hp: 100,
        player: true,
        s: { mcourage: { s: 1, ms: 4000 } },
      },
    ]);
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(b));
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(c));
  });

  it("changes when fear or entity target changes", () => {
    const base = { id: "me", hp: 100, player: true } as EntityLike;
    const a = snap([{ ...base, fear: 0, target: "m1" }]);
    const b = snap([{ ...base, fear: 1, target: "m1" }]);
    const c = snap([{ ...base, fear: 0, target: "m2" }]);
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(b));
    assert.notEqual(snapshotUiCoarseHash(a), snapshotUiCoarseHash(c));
  });
});
