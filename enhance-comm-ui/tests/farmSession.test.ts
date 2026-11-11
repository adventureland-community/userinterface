import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  getFarmStats,
  ingestFarmLoot,
  resetFarmSession,
  startFarmSession,
  updateFarmContext,
} from "../src/kpi/farmSession";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installWindow(partial: Record<string, unknown>): void {
  (globalThis as Win).window = {
    setInterval: () => 0,
    clearInterval: () => {},
    ...partial,
  };
}

beforeEach(() => {
  installWindow({
    observing: { id: "p1", name: "Farmer", gold: 1000 },
    entities: {},
    character: null,
  });
  resetFarmSession();
});

afterEach(() => {
  resetFarmSession();
  delete (globalThis as Win).window;
});

describe("farmSession", () => {
  it("tracks chest loot items without double-counting loot gold", () => {
    const stop = startFarmSession();
    ingestFarmLoot({
      gold: 250,
      party: true,
      items: [
        { name: "hpots", q: 3 },
        { name: "shadowstone", q: 1, level: 0 },
      ],
      at: Date.now(),
    });
    const stats = getFarmStats();
    assert.equal(stats.goldGained, 0);
    assert.equal(stats.loot.length, 2);
    let hpotsQ = 0;
    for (let i = 0; i < stats.loot.length; i++) {
      if (stats.loot[i].name === "hpots") hpotsQ = stats.loot[i].q;
    }
    assert.equal(hpotsQ, 3);
    stop();
  });

  it("samples observing gold into session gold + series", () => {
    const stop = startFarmSession();
    const realNow = Date.now;
    let t = 1_000_000;
    Date.now = () => t;
    try {
      updateFarmContext({});
      t += 6_000;
      (globalThis as Win).window.observing = {
        id: "p1",
        name: "Farmer",
        gold: 1600,
      };
      updateFarmContext({});
      const stats = getFarmStats();
      assert.equal(stats.goldGained, 600);
      assert.ok(stats.goldSeries.length >= 1);
      assert.ok((stats.goldPerMinute || 0) > 0);
    } finally {
      Date.now = realNow;
    }
    stop();
  });

  it("reset clears loot and gold", () => {
    startFarmSession();
    ingestFarmLoot({
      gold: 0,
      party: false,
      items: [{ name: "gem0", q: 2 }],
      at: Date.now(),
    });
    resetFarmSession();
    const stats = getFarmStats();
    assert.equal(stats.loot.length, 0);
    assert.equal(stats.goldGained, 0);
  });

  it("attributes loot to fromMtype for glance top drops", () => {
    startFarmSession();
    ingestFarmLoot({
      gold: 0,
      party: true,
      at: Date.now(),
      fromMtype: "crab",
      items: [
        { name: "seashell", q: 41 },
        { name: "crabclaw", q: 2 },
      ],
    });
    const stats = getFarmStats();
    const top = stats.topDropByMtype.crab;
    assert.ok(top);
    assert.equal(top.name, "seashell");
    assert.equal(top.q, 41);
  });
});
