/**
 * Condition-onset cast watch — first sight, onset, refresh; state off the tape.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  castsFromConditionSample,
  clearConditionCastWatch,
} from "../src/meters/conditionCastWatch";
import { resetConditionSkillMapCache } from "../src/meters/syntheticCast";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installSkills(skills: Record<string, object>): void {
  (globalThis as Win).window = { G: { skills } };
}

describe("castsFromConditionSample", () => {
  afterEach(() => {
    clearConditionCastWatch();
    resetConditionSkillMapCache();
    delete (globalThis as Win).window;
  });

  it("snapshots first sight without casting", () => {
    installSkills({ warcry: { condition: "warcry" }, hardshell: {} });
    const first = castsFromConditionSample(
      "Warrior",
      { warcry: { ms: 8000, f: "Warrior" }, hardshell: { ms: 4000 } },
      10,
    );
    assert.equal(first.length, 0);
  });

  it("emits one warcry cast on later onset (uses f)", () => {
    installSkills({ warcry: { condition: "warcry" } });
    castsFromConditionSample("Priest", {}, 1);
    const next = castsFromConditionSample(
      "Priest",
      { warcry: { ms: 8000, f: "Warrior" } },
      20,
    );
    assert.equal(next.length, 1);
    assert.equal(next[0].actor, "Warrior");
    assert.equal(next[0].source, "warcry");
    assert.equal(next[0].target, "Priest");
  });

  it("emits charge on charging onset after first sight", () => {
    installSkills({ charge: {} });
    castsFromConditionSample("Warrior", {}, 1);
    const next = castsFromConditionSample(
      "Warrior",
      { charging: { ms: 3200 } },
      30,
    );
    assert.deepEqual(next, [
      { actor: "Warrior", source: "charge", at: 30 },
    ]);
  });

  it("emits on ms refresh while the buff stays open", () => {
    installSkills({ hardshell: { condition: "hardshell" } });
    castsFromConditionSample("Warrior", {}, 1);
    castsFromConditionSample("Warrior", { hardshell: { ms: 8000 } }, 10);
    // tick down
    castsFromConditionSample("Warrior", { hardshell: { ms: 1000 } }, 20);
    const refreshed = castsFromConditionSample(
      "Warrior",
      { hardshell: { ms: 8000 } },
      30,
    );
    assert.equal(refreshed.length, 1);
    assert.equal(refreshed[0].source, "hardshell");
  });

  it("does not permanently cache an empty G.skills map", () => {
    (globalThis as Win).window = { G: {} };
    assert.equal(
      castsFromConditionSample("W", { warcry: { ms: 1, f: "W" } }, 1).length,
      0,
    );
    // skills appear later
    (globalThis as Win).window = {
      G: { skills: { warcry: { condition: "warcry" } } },
    };
    castsFromConditionSample("Priest", {}, 2);
    const later = castsFromConditionSample(
      "Priest",
      { warcry: { ms: 8000, f: "Warrior" } },
      3,
    );
    assert.equal(later.length, 1);
    assert.equal(later[0].source, "warcry");
  });

  it("does not emit for stunned / energized (ui or debuff owns those)", () => {
    installSkills({
      stomp: { condition: "stunned" },
      energize: { condition: "energized" },
      hardshell: { condition: "hardshell" },
    });
    castsFromConditionSample("Warrior", {}, 1);
    const next = castsFromConditionSample(
      "Warrior",
      {
        stunned: { ms: 2000 },
        energized: { ms: 800 },
        hardshell: { ms: 8000 },
      },
      20,
    );
    assert.equal(next.length, 1);
    assert.equal(next[0].source, "hardshell");
  });
});
