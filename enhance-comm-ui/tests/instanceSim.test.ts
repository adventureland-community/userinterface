import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyInstanceSim,
  getInstanceSimMapOverride,
  setInstanceSimEnabled,
  setInstanceSimScenario,
} from "../src/debug/instanceSim";
import { simCooldownMs, SIM_ABILITY_READY_HOLD_MS } from "../src/debug/instanceSimScenarios";
import type { GameSnapshot } from "../src/tick";

describe("instanceSim", () => {
  it("simCooldownMs loops remaining time", () => {
    const start = 1_000_000;
    const a = simCooldownMs(8000, 0, start + 2000, start);
    assert.ok(a <= 8000 && a >= 6000);
    assert.equal(simCooldownMs(8000, 0, start, start), 8000);
    const beforeWrap = simCooldownMs(8000, 0, start + 7999, start);
    const atWrap = simCooldownMs(8000, 0, start + 8000, start);
    assert.ok(beforeWrap > 0 && beforeWrap < 10);
    assert.equal(atWrap, 0);
    assert.equal(
      simCooldownMs(8000, 0, start + 8000 + 2000, start),
      0,
    );
    assert.equal(
      simCooldownMs(8000, 0, start + 8000 + SIM_ABILITY_READY_HOLD_MS, start),
      8000,
    );
  });

  it("applyInstanceSim injects crypt mobs and map override", () => {
    setInstanceSimScenario("crypt-pull");
    setInstanceSimEnabled(true);
    try {
      assert.equal(getInstanceSimMapOverride(), "crypt");
      const snap: GameSnapshot = {
        entities: [
          {
            id: "live-a1",
            type: "monster",
            mtype: "a1",
            visible: true,
            dead: false,
          },
          { id: "p1", type: "character", player: true, visible: true },
        ],
        observingId: "p1",
        observing: { id: "p1", type: "character", player: true },
        target: undefined,
        now: Date.now(),
      };
      const merged = applyInstanceSim(snap);
      assert.ok(merged.entities.some((e) => e.id === "ecu-sim-a2"));
      assert.ok(merged.entities.some((e) => e.id === "ecu-sim-a4"));
      assert.equal(
        merged.entities.some((e) => e.id === "live-a1"),
        false,
        "live tracked mtypes are replaced",
      );
      assert.ok(merged.entities.some((e) => e.id === "p1"));
    } finally {
      setInstanceSimEnabled(false);
    }
  });

  it("open-world scenarios respect G.maps spawn counts", () => {
    const snap: GameSnapshot = {
      entities: [{ id: "p1", type: "character", player: true, visible: true }],
      observingId: "p1",
      observing: { id: "p1", type: "character", player: true },
      target: undefined,
      now: Date.now(),
    };
    setInstanceSimEnabled(true);
    try {
      setInstanceSimScenario("main-crabs");
      assert.equal(getInstanceSimMapOverride(), "main");
      const crabs = applyInstanceSim(snap).entities.filter(
        (e) => e.mtype === "crab",
      );
      assert.equal(crabs.length, 8);

      setInstanceSimScenario("cave-bats");
      assert.equal(getInstanceSimMapOverride(), "cave");
      const bats = applyInstanceSim(snap).entities.filter(
        (e) => e.mtype === "bat",
      );
      assert.equal(bats.length, 6);

      setInstanceSimScenario("main-goos");
      assert.equal(getInstanceSimMapOverride(), "main");
      const goos = applyInstanceSim(snap).entities.filter(
        (e) => e.mtype === "goo",
      );
      assert.equal(goos.length, 9);
    } finally {
      setInstanceSimEnabled(false);
    }
  });
});
