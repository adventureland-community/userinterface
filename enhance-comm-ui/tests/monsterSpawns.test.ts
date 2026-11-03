/**
 * G.monsters spawn parse + HP threshold marks for unit frames.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildHpThresholdMarks,
  listAbilityHpThresholds,
  listMonsterSpawns,
  parseSpawnCondition,
} from "../src/instance/monsterSpawns";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(partial: Record<string, unknown>): void {
  const g = globalThis as Win;
  if (!g.window) g.window = {};
  g.window.G = partial;
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
    installG({
      monsters: {
        a1: { name: "Spike", spawns: [[200, "nerfedbat"]] },
        mrpumpkin: {
          name: "Mr. Pumpkin",
          spawns: [
            ["hp:0.75", "jr", 5],
            ["hp:0.50", "jr", 5],
            ["hp:0.25", "jr", 5],
          ],
        },
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

  it("reads rimedjinn rimeshell ability threshold from G data", () => {
    installG({
      monsters: {
        rimedjinn: {
          name: "Rime Djinn",
          abilities: {
            rimeshell: {
              threshold: 0.5,
              duration: 3000,
              break_fraction: 0.05,
              targets: 3,
              range: 260,
              exposed_duration: 5000,
            },
          },
        },
      },
      skills: {
        rimeshell: {
          name: "Rime Shell",
          explanation:
            "At half health, the Djinn casts for 3 seconds. Deal damage equal to 5% of its maximum HP, or stun it, to break the shell.",
        },
      },
    });
    const abs = listAbilityHpThresholds("rimedjinn");
    assert.equal(abs.length, 1);
    assert.equal(abs[0].abilityId, "rimeshell");
    assert.equal(abs[0].ratio, 0.5);
    assert.equal(abs[0].title, "Rime Shell");
    assert.match(abs[0].detail, /half health/i);

    const marks = buildHpThresholdMarks("rimedjinn", 0.62);
    assert.equal(marks.length, 1);
    assert.equal(marks[0].leftPct, 50);
    assert.equal(marks[0].fired, false);
    assert.equal(marks[0].abilityId, "rimeshell");
    assert.equal(marks[0].title, "Rime Shell");
    assert.match(marks[0].detail, /half health/i);

    const fired = buildHpThresholdMarks("rimedjinn", 0.4);
    assert.equal(fired[0].fired, true);
  });

  it("spawn phase marks carry cooltip title + detail", () => {
    installG({
      monsters: {
        mrpumpkin: {
          name: "Mr. Pumpkin",
          explanation: "Halloween cooperative boss.",
          spawns: [["hp:0.50", "jr", 5]],
        },
        jr: {
          name: "Junior",
          explanation: "A small pumpkin minion.",
        },
      },
    });
    const marks = buildHpThresholdMarks("mrpumpkin", 0.8);
    assert.equal(marks.length, 1);
    assert.equal(marks[0].title, "Spawn · Junior");
    assert.match(marks[0].detail, /5× Junior/);
    assert.match(marks[0].detail, /small pumpkin/i);
  });
});
