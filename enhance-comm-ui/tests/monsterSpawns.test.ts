/**
 * G.monsters spawn parse + HP threshold marks for unit frames.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildHpThresholdMarks,
  listMonsterSpawns,
  parseSpawnCondition,
} from "../src/instance/monsterSpawns";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installMonsters(monsters: Record<string, any>): void {
  const g = globalThis as Win;
  if (!g.window) g.window = {};
  g.window.G = { monsters };
}

afterEach(() => {
  const g = globalThis as Win;
  if (g.window && "G" in g.window) delete g.window.G;
});

describe("parseSpawnCondition", () => {
  it("parses timed intervals and hp thresholds", () => {
    assert.deepEqual(parseSpawnCondition(200), {
      kind: "timed",
      intervalMs: 200,
    });
    assert.deepEqual(parseSpawnCondition("hp:0.75"), {
      kind: "hp",
      ratio: 0.75,
    });
    assert.equal(parseSpawnCondition("nope"), null);
  });
});

describe("listMonsterSpawns / buildHpThresholdMarks", () => {
  it("reads timed + hp packs from G.monsters", () => {
    installMonsters({
      a1: { name: "Spike", spawns: [[200, "nerfedbat"]] },
      mrpumpkin: {
        name: "Mr. Pumpkin",
        spawns: [
          ["hp:0.75", "jr", 5],
          ["hp:0.50", "jr", 5],
          ["hp:0.25", "jr", 5],
        ],
      },
    });
    assert.deepEqual(listMonsterSpawns("a1"), [
      { kind: "timed", intervalMs: 200, mtype: "nerfedbat", count: 1 },
    ]);
    const marks = buildHpThresholdMarks("mrpumpkin", 0.41);
    assert.equal(marks.length, 3);
    assert.equal(marks[0].leftPct, 25);
    assert.equal(marks[0].fired, true);
    assert.equal(marks[1].fired, true);
    assert.equal(marks[2].fired, false);
    assert.equal(marks[2].leftPct, 75);
  });
});
