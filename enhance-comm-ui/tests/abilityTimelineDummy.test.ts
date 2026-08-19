/**
 * Settings dummy rail: looping CDs + mtype filter.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_ABILITY_TIMELINE_PREFS } from "../src/instance/abilityTimelinePrefs";
import {
  PREVIEW_READY_HOLD_MS,
  dummyAbilityTimelineModel,
  listAbilityPreviewCasters,
  loopPreviewRemaining,
} from "../src/instance/abilityTimelineDummy";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

afterEach(() => {
  const g = globalThis as Win;
  if (g.window && "G" in g.window) delete g.window.G;
});

describe("loopPreviewRemaining", () => {
  it("starts at full CD, sits ready, then recasts", () => {
    const cd = 8000;
    const epoch = 1_000_000;
    const start = loopPreviewRemaining(cd, 0, epoch, epoch);
    assert.equal(start.ms, cd);
    assert.equal(start.cycle, 0);

    const mid = loopPreviewRemaining(cd, 0, epoch + 3000, epoch);
    assert.equal(mid.ms, 5000);
    assert.equal(mid.cycle, 0);

    const ready = loopPreviewRemaining(cd, 0, epoch + cd, epoch);
    assert.equal(ready.ms, 0);
    assert.equal(ready.cycle, 0);

    const stillReady = loopPreviewRemaining(
      cd,
      0,
      epoch + cd + PREVIEW_READY_HOLD_MS - 1,
      epoch,
    );
    assert.equal(stillReady.ms, 0);

    const recast = loopPreviewRemaining(
      cd,
      0,
      epoch + cd + PREVIEW_READY_HOLD_MS,
      epoch,
    );
    assert.equal(recast.ms, cd);
    assert.equal(recast.cycle, 1);
  });
});

describe("dummyAbilityTimelineModel", () => {
  it("filters to picked mtypes from G.monsters", () => {
    const g = globalThis as Win;
    if (!g.window) g.window = {};
    g.window.G = {
      monsters: {
        gpurplepro: {
          name: "Protector of Darkness",
          abilities: { anger: { cooldown: 12000 } },
        },
        a2: {
          name: "Bill",
          abilities: { anger: { cooldown: 8000 } },
        },
      },
    };
    const model = dummyAbilityTimelineModel(
      DEFAULT_ABILITY_TIMELINE_PREFS,
      1_000_000,
      1_000_000,
      ["gpurplepro"],
    );
    assert.equal(model.sections.length, 1);
    assert.equal(model.sections[0].targetMtype, "gpurplepro");
    assert.equal(model.sections[0].targetId, "dummy-gpurplepro");
  });

  it("treats an empty pick list as empty, not the defaults", () => {
    const g = globalThis as Win;
    if (!g.window) g.window = {};
    g.window.G = {
      monsters: {
        gpurplepro: {
          name: "Protector of Darkness",
          abilities: { anger: { cooldown: 12000 } },
        },
      },
    };
    const empty = dummyAbilityTimelineModel(
      DEFAULT_ABILITY_TIMELINE_PREFS,
      1_000_000,
      1_000_000,
      [],
    );
    assert.equal(empty.sections.length, 0);

    const fallback = dummyAbilityTimelineModel(
      DEFAULT_ABILITY_TIMELINE_PREFS,
      1_000_000,
      1_000_000,
    );
    assert.ok(fallback.sections.length >= 1);
    assert.equal(fallback.sections[0].targetMtype, "gpurplepro");
  });

  it("bumps castGen when a looping CD wraps", () => {
    const g = globalThis as Win;
    if (!g.window) g.window = {};
    g.window.G = {
      monsters: {
        gpurplepro: {
          name: "Protector of Darkness",
          abilities: { anger: { cooldown: 12000 } },
        },
      },
    };
    const epoch = 2_000_000;
    const cd = 12000;
    const period = cd + PREVIEW_READY_HOLD_MS;
    const before = dummyAbilityTimelineModel(
      DEFAULT_ABILITY_TIMELINE_PREFS,
      epoch,
      epoch,
      ["gpurplepro"],
    );
    const after = dummyAbilityTimelineModel(
      DEFAULT_ABILITY_TIMELINE_PREFS,
      epoch + period,
      epoch,
      ["gpurplepro"],
    );
    assert.equal(before.sections[0].rows[0].id, "anger");
    assert.equal(before.sections[0].rows[0].castGen, 0);
    assert.equal(before.sections[0].rows[0].ms, cd);
    assert.equal(after.sections[0].rows[0].castGen, 1);
    assert.equal(after.sections[0].rows[0].ms, cd);
  });

  it("lists all G.monsters with trackable abilities", () => {
    const g = globalThis as Win;
    if (!g.window) g.window = {};
    g.window.G = {
      monsters: {
        oneeye: {
          name: "One Eye",
          abilities: { curse: { cooldown: 4000 } },
        },
        a2: {
          name: "Bill",
          abilities: { anger: { cooldown: 8000 } },
        },
      },
    };
    const casters = listAbilityPreviewCasters();
    const mtypes: string[] = [];
    for (let i = 0; i < casters.length; i++) mtypes.push(casters[i].mtype);
    assert.equal(casters.length, 2);
    assert.ok(mtypes.indexOf("oneeye") >= 0);
    assert.ok(mtypes.indexOf("a2") >= 0);
  });
});
