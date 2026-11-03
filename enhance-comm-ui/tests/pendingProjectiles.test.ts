/**
 * In-flight HP-bar ghosts from projectiles.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearPendingProjectiles,
  getPendingHpDelta,
  getHpBarGhosts,
  ingestPendingAction,
  clearPendingByHit,
  isInstantAction,
} from "../src/meters/pendingProjectiles";
import type { ActionEvent, DamageEvent } from "../src/sockets/hub";

afterEach(() => {
  clearPendingProjectiles();
});

function action(partial: Partial<ActionEvent>): ActionEvent {
  return {
    at: partial.at != null ? partial.at : 1_000_000,
    ...partial,
  };
}

describe("pendingProjectiles", () => {
  it("sums pending damage and heal per target from actions", () => {
    ingestPendingAction(
      action({
        pid: "a1",
        target: "boss1",
        damage: 1000,
        eta: 500,
      }),
    );
    ingestPendingAction(
      action({
        pid: "a2",
        target: "boss1",
        damage: 250,
        eta: 500,
      }),
    );
    ingestPendingAction(
      action({
        pid: "h1",
        target: "boss1",
        heal: 400,
        eta: 500,
      }),
    );
    ingestPendingAction(
      action({
        pid: "other",
        target: "boss2",
        damage: 9000,
        eta: 500,
      }),
    );
    assert.deepEqual(getPendingHpDelta("boss1", 1_000_000), {
      damage: 1250,
      heal: 400,
    });
    assert.deepEqual(getHpBarGhosts("boss1", 1_000_000).pendingDamage, 1250);
    assert.deepEqual(getPendingHpDelta("boss2", 1_000_000), {
      damage: 9000,
      heal: 0,
    });
  });

  it("on hit: clears pending — no recent flash (bar HP already moved)", () => {
    ingestPendingAction(
      action({ pid: "p1", target: "t1", damage: 500, eta: 800, at: 1_000_000 }),
    );
    clearPendingByHit({
      pid: "p1",
      target: "t1",
      damage: 520,
      at: 1_000_100,
    } as DamageEvent);
    assert.deepEqual(getHpBarGhosts("t1", 1_000_100), {
      pendingDamage: 0,
      pendingHeal: 0,
    });
  });

  it("miss still clears pending pid", () => {
    ingestPendingAction(
      action({ pid: "m1", target: "t1", damage: 400, eta: 300, at: 1_000_000 }),
    );
    clearPendingByHit({
      pid: "m1",
      target: "t1",
      damage: 400,
      miss: true,
      at: 1_000_100,
    } as DamageEvent);
    assert.equal(getHpBarGhosts("t1", 1_000_100).pendingDamage, 0);
  });

  it("prunes after max(ETA, min-visible) + grace", () => {
    ingestPendingAction(
      action({
        pid: "late",
        target: "t1",
        damage: 100,
        eta: 200,
        at: 1_000_000,
      }),
    );
    assert.equal(getPendingHpDelta("t1", 1_000_650).damage, 100);
    assert.equal(getPendingHpDelta("t1", 1_000_701).damage, 0);
  });

  it("ignores instant / pid-less / zero-amount actions", () => {
    assert.equal(
      isInstantAction(
        action({
          pid: "x",
          target: "t",
          damage: 1,
          raw: { instant: true },
        }),
      ),
      true,
    );
    assert.equal(isInstantAction(action({ target: "t", damage: 1 })), true);
    ingestPendingAction(
      action({ pid: "z", target: "t", damage: 0, heal: 0, eta: 100 }),
    );
    assert.deepEqual(getPendingHpDelta("t"), { damage: 0, heal: 0 });
  });
});
