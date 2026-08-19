import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  abilityInStatic,
  abilityScrollPos,
  abilityTimelinePanelTitle,
  buildAbilityTimelineModel,
  buildAbilityTimelinePanelModel,
  decorateAbilityRow,
  peekAbilityRemainingMs,
  peekAbilityCastGen,
  syncAbilityRemainingMs,
} from "../src/instance/abilityTimelineModel";
import {
  DEFAULT_ABILITY_TIMELINE_PREFS,
  normalizeAbilityTimelineOrient,
  normalizeAbilityTimelinePrefs,
  normalizeAbilityTimelineScope,
  legacyShowBigIconHidden,
} from "../src/instance/abilityTimelinePrefs";
import { syncEndsAt } from "../src/lib/format";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

describe("abilityTimeline scroll math", () => {
  it("pins long CDs above the static window", () => {
    assert.equal(abilityInStatic(12000, 12000, false), true);
    assert.equal(abilityInStatic(9000, 12000, false), false);
    assert.equal(abilityScrollPos(12000, 12000, false), 1);
    assert.equal(abilityScrollPos(5000, 12000, false), 0.5);
    assert.equal(abilityScrollPos(0, 12000, true), 0);
  });

  it("scales short CDs relative to the window, not the cooldown", () => {
    assert.equal(abilityScrollPos(4000, 8000, false), 0.4);
    assert.equal(abilityInStatic(4000, 8000, false), false);
  });

  it("normalizes panel settings", () => {
    assert.equal(normalizeAbilityTimelineOrient("horizontal"), "horizontal");
    assert.equal(normalizeAbilityTimelineOrient("nope"), "vertical");
    assert.equal(normalizeAbilityTimelineScope("target"), "target");
    assert.equal(normalizeAbilityTimelineScope("nope"), "all");
  });

  it("uses windowMs for pin and scroll axis", () => {
    assert.equal(abilityInStatic(12000, 12000, false, 15000), false);
    assert.equal(abilityScrollPos(7500, 20000, false, 15000), 0.5);
  });

  it("lifts legacy orient scalar into the prefs blob", () => {
    const prefs = normalizeAbilityTimelinePrefs(undefined, {
      abilityTimelineOrient: "horizontal",
      abilityTimelineDisplay: "bars",
    });
    assert.equal(prefs.orient, "horizontal");
    assert.equal("display" in prefs, false);
    assert.equal(prefs.windowMs, 10000);
    assert.equal(prefs.iconSize, 44);
    assert.equal(prefs.scope, "all");
    assert.equal(prefs.textAnchor, "bottom");
    assert.equal(prefs.iconMargin, 4);
    assert.equal(prefs.railTint, "transparent");
    assert.equal(prefs.bigIconGrow, "right");
  });

  it("drops the shipped rail tint so the lane stays clear by default", () => {
    const prefs = normalizeAbilityTimelinePrefs({
      railTint: "rgba(0,0,0,0.42)",
    });
    assert.equal(prefs.railTint, "transparent");
    const custom = normalizeAbilityTimelinePrefs({
      railTint: "rgba(0,0,0,0.2)",
    });
    assert.equal(custom.railTint, "rgba(0,0,0,0.2)");
  });

  it("coerces text anchor to the current orientation", () => {
    const vert = normalizeAbilityTimelinePrefs({
      orient: "vertical",
      textAnchor: "top",
    });
    assert.equal(vert.textAnchor, "left");
    const horz = normalizeAbilityTimelinePrefs({
      orient: "horizontal",
      textAnchor: "left",
    });
    assert.equal(horz.textAnchor, "bottom");
  });

  it("treats saved showBigIcon false as a BigIcon hide migration signal", () => {
    assert.equal(legacyShowBigIconHidden({ showBigIcon: false }), true);
    assert.equal(legacyShowBigIconHidden({ showBigIcon: true }), false);
    assert.equal(legacyShowBigIconHidden({}), false);
  });

  it("decorateAbilityRow pins and slots from windowMs", () => {
    const tight = decorateAbilityRow(
      "anger",
      "Anger",
      6600,
      12000,
      { ...DEFAULT_ABILITY_TIMELINE_PREFS, windowMs: 5000 },
      0,
      9_001_000,
    );
    assert.ok(tight);
    assert.equal(tight?.pinned, true);
    assert.equal(tight?.scrollPos, 1);
    assert.equal(tight?.endsAt, 9_001_000);
    const wide = decorateAbilityRow("anger", "Anger", 6600, 12000, {
      ...DEFAULT_ABILITY_TIMELINE_PREFS,
      windowMs: 15000,
    });
    assert.ok(wide);
    assert.equal(wide?.pinned, false);
    assert.ok((wide?.scrollPos || 0) < 1);
  });

  it("formats multi-boss panel title", () => {
    assert.equal(
      abilityTimelinePanelTitle([
        { targetId: "1", targetName: "Bill", rows: [] },
      ]),
      "Bill",
    );
    assert.equal(
      abilityTimelinePanelTitle([
        { targetId: "1", targetName: "Bill", rows: [] },
        { targetId: "2", targetName: "Lestat", rows: [] },
      ]),
      "Bill · Lestat",
    );
    assert.equal(
      abilityTimelinePanelTitle([
        { targetId: "1", targetName: "A", rows: [] },
        { targetId: "2", targetName: "B", rows: [] },
        { targetId: "3", targetName: "C", rows: [] },
      ]),
      "3 casters",
    );
  });
});

describe("abilityTimeline sticky ms", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("holds sticky end across near-identical rebroadcasts", () => {
    const t0 = 1_000_000;
    const first = syncAbilityRemainingMs("boss1", "anger", 8000, t0);
    assert.ok(Math.abs(first - 8000) < 2);
    const second = syncAbilityRemainingMs("boss1", "anger", 7900, t0 + 50);
    // sticky should not jump to a fresh 7900 from now
    const peeked = peekAbilityRemainingMs("boss1", "anger", t0 + 50);
    assert.ok(peeked != null);
    assert.ok(Math.abs((peeked as number) - (8000 - 50)) < 30);
    assert.ok(second > 7800);
    // sanity: syncEndsAt itself is the same primitive
    const sticky = syncEndsAt(t0 + 8000, 7900, t0 + 50, 8000);
    assert.equal(sticky, t0 + 8000);
  });

  it("ignores a brief 0 while sticky remaining is still live", () => {
    const t0 = 2_000_000;
    syncAbilityRemainingMs("boss1", "anger", 8000, t0);
    const held = syncAbilityRemainingMs("boss1", "anger", 0, t0 + 80);
    assert.ok(held > 7800, "must not snap to NOW on a single 0");
    const later = syncAbilityRemainingMs("boss1", "anger", 0, t0 + 8000);
    assert.equal(later, 0);
  });

  it("keeps sticky remaining when another boss appears", () => {
    (globalThis as Win).window = {
      G: {
        monsters: {
          a2: { name: "Bill", abilities: { anger: { cooldown: 8000 } } },
          a1: { name: "Spike", abilities: { anger: { cooldown: 8000 } } },
        },
        skills: { anger: { name: "Anger" } },
      },
    };
    const t0 = 3_000_000;
    const bill = {
      id: "a2",
      type: "monster",
      mtype: "a2",
      name: "Bill",
      visible: true,
      dead: false,
      cooperative: true,
      s: { anger: { ms: 8000 } },
    };
    const spike = {
      id: "a1",
      type: "monster",
      mtype: "a1",
      name: "Spike",
      visible: true,
      dead: false,
      cooperative: true,
      s: { anger: { ms: 4000 } },
    };
    buildAbilityTimelinePanelModel([bill], undefined, null, t0);
    const before = peekAbilityRemainingMs("a2", "anger", t0 + 200);
    buildAbilityTimelinePanelModel([bill, spike], undefined, null, t0 + 200);
    const after = peekAbilityRemainingMs("a2", "anger", t0 + 200);
    assert.ok(before != null && after != null);
    assert.ok(Math.abs((after as number) - (before as number)) < 30);
  });

  it("does not yank remaining up by less than a recast", () => {
    const t0 = 4_000_000;
    syncAbilityRemainingMs("boss2", "anger", 5000, t0);
    assert.equal(peekAbilityCastGen("boss2", "anger"), 0);
    const held = syncAbilityRemainingMs("boss2", "anger", 5900, t0 + 100);
    assert.ok(held < 5000, "small remaining increase must not rewind the rail");
    assert.ok(held > 4700);
    assert.equal(peekAbilityCastGen("boss2", "anger"), 0);
    const recast = syncAbilityRemainingMs("boss2", "anger", 8000, t0 + 150);
    assert.ok(recast > 7800, "a full recast must still jump to the new CD");
    assert.equal(peekAbilityCastGen("boss2", "anger"), 1);
  });

  it("bumps castGen when a CD wraps from ready to full", () => {
    const t0 = 5_000_000;
    syncAbilityRemainingMs("boss3", "anger", 2000, t0);
    assert.equal(peekAbilityCastGen("boss3", "anger"), 0);
    const ready = syncAbilityRemainingMs("boss3", "anger", 0, t0 + 2000);
    assert.equal(ready, 0);
    assert.equal(peekAbilityCastGen("boss3", "anger"), 0);
    const recast = syncAbilityRemainingMs("boss3", "anger", 8000, t0 + 2100);
    assert.ok(recast > 7800);
    assert.equal(peekAbilityCastGen("boss3", "anger"), 1);
  });

  it("builds rows from G.monsters abilities and entity.s ms", () => {
    (globalThis as Win).window = {
      G: {
        monsters: {
          gpurplepro: {
            name: "Protector of Darkness",
            abilities: {
              anger: { cooldown: 12000 },
              warpstomp: { cooldown: 8000 },
            },
          },
        },
        skills: { anger: { name: "Anger" }, warpstomp: { name: "Warpstomp" } },
      },
    };
    const model = buildAbilityTimelineModel({
      id: "boss1",
      type: "monster",
      mtype: "gpurplepro",
      visible: true,
      dead: false,
      s: {
        anger: { ms: 6000 },
        warpstomp: { ms: 2500 },
      },
    });
    assert.ok(model);
    assert.deepEqual(
      model?.rows.map((r) => r.id),
      ["warpstomp", "anger"],
    );
  });

  it("ignores entity.s keys that are not in G.monsters abilities", () => {
    (globalThis as Win).window = {
      G: {
        monsters: { a4: { name: "Orlok" } },
      },
    };
    const model = buildAbilityTimelineModel({
      id: "boss1",
      type: "monster",
      mtype: "a4",
      visible: true,
      dead: false,
      s: {
        anger: { ms: 6000 },
        warpstomp: { ms: 2500 },
      },
    });
    assert.equal(model, null);
  });

  it("builds a section per boss with trackable abilities", () => {
    (globalThis as Win).window = {
      G: {
        monsters: {
          a2: {
            name: "Bill",
            abilities: { anger: { cooldown: 8000 } },
          },
          a3: {
            name: "Lestat",
            abilities: { anger: { cooldown: 8000 } },
          },
          a4: { name: "Orlok" },
        },
        skills: { anger: { name: "Anger" } },
      },
    };
    const panel = buildAbilityTimelinePanelModel(
      [
        {
          id: "b2",
          type: "monster",
          mtype: "a2",
          name: "Bill",
          visible: true,
          dead: false,
          cooperative: true,
          s: { anger: { ms: 3000 } },
        },
        {
          id: "b3",
          type: "monster",
          mtype: "a3",
          name: "Lestat",
          visible: true,
          dead: false,
          cooperative: true,
          s: { anger: { ms: 5000 } },
        },
        {
          id: "b4",
          type: "monster",
          mtype: "a4",
          visible: true,
          dead: false,
          cooperative: true,
        },
      ],
      undefined,
      null,
    );
    assert.ok(panel);
    assert.equal(panel?.sections.length, 2);
    assert.deepEqual(
      panel?.sections.map((s) => s.targetName),
      ["Bill", "Lestat"],
    );
  });

  it("includes non-coop casters and can filter to the current target", () => {
    (globalThis as Win).window = {
      G: {
        monsters: {
          gpurplepro: {
            name: "Protector of Darkness",
            abilities: { anger: { cooldown: 12000 } },
          },
          zapper0: {
            name: "Zapper",
            abilities: { zap: { cooldown: 4000 } },
          },
          a4: { name: "Orlok" },
        },
        skills: { anger: { name: "Anger" }, zap: { name: "Zap" } },
      },
    };
    const tomb = {
      id: "p1",
      type: "monster",
      mtype: "gpurplepro",
      name: "Protector of Darkness",
      visible: true,
      dead: false,
      s: { anger: { ms: 4000 } },
    };
    const zapper = {
      id: "z1",
      type: "monster",
      mtype: "zapper0",
      name: "Zapper",
      visible: true,
      dead: false,
      s: { zap: { ms: 500 } },
    };
    const orlok = {
      id: "o1",
      type: "monster",
      mtype: "a4",
      name: "Orlok",
      visible: true,
      dead: false,
    };
    const mixed = buildAbilityTimelinePanelModel(
      [tomb, zapper, orlok] as any,
      undefined,
      null,
    );
    assert.ok(mixed);
    assert.deepEqual(
      mixed?.sections.map((s) => s.targetName),
      ["Protector of Darkness", "Zapper"],
    );
    const focused = buildAbilityTimelinePanelModel(
      [tomb, zapper, orlok] as any,
      "z1",
      null,
      Date.now(),
      { ...DEFAULT_ABILITY_TIMELINE_PREFS, scope: "target" },
    );
    assert.ok(focused);
    assert.deepEqual(
      focused?.sections.map((s) => s.targetName),
      ["Zapper"],
    );
  });
});
