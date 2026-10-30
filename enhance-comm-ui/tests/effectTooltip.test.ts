/**
 * Buff/debuff hover text — G.conditions stats + live caster (entity.s.*.f).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  effectTooltip,
  formatConditionStatLine,
  resolveCitizenAura,
} from "../src/ui/chrome/effectTooltip";
import {
  effectBadgeText,
  formatCompactBadge,
  type BuiltEffect,
} from "../src/ui/chrome/effectsModel";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function install(
  conditions: Record<string, Record<string, unknown>>,
  extra?: {
    npcs?: Record<string, Record<string, unknown>>;
    monsters?: Record<string, Record<string, unknown>>;
  },
) {
  const g = globalThis as Win;
  g.window = {
    G: {
      conditions,
      ...(extra && extra.npcs ? { npcs: extra.npcs } : {}),
      ...(extra && extra.monsters ? { monsters: extra.monsters } : {}),
    },
  };
}

describe("formatConditionStatLine", () => {
  it("mirrors stock luck / speed / a.speed / intensity labels", () => {
    assert.deepEqual(formatConditionStatLine("luck", 12), {
      label: "Luck",
      value: "+12%",
    });
    assert.deepEqual(formatConditionStatLine("speed", 7), {
      label: "Speed",
      value: "+7",
    });
    assert.deepEqual(formatConditionStatLine("frequency", 10), {
      label: "A.Speed",
      value: "10",
    });
    assert.deepEqual(formatConditionStatLine("intensity", 2400), {
      label: "Intensity",
      value: "2400",
    });
    assert.equal(formatConditionStatLine("explanation", "x"), null);
    assert.equal(formatConditionStatLine("buff", true), null);
  });
});

describe("effectBadgeText", () => {
  it("prefers stacks, then intensity, then hunt charges", () => {
    assert.equal(
      effectBadgeText({
        id: "woven",
        skin: "spidersilk",
        type: "condition",
        stacks: 5,
        intensity: 99,
      }),
      "5",
    );
    assert.equal(
      effectBadgeText({
        id: "burned",
        skin: "fireblade",
        type: "condition",
        intensity: 2400,
      }),
      "2.4k",
    );
    assert.equal(
      effectBadgeText({
        id: "monsterhunt",
        skin: "quest_monsterhunt",
        type: "condition",
        charges: 12,
      }),
      "12",
    );
    assert.equal(formatCompactBadge(999), "999");
    assert.equal(formatCompactBadge(1200), "1.2k");
    assert.equal(formatCompactBadge(12500), "13k");
  });
});

describe("effectTooltip", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("shows mluck From then Strong/locked before stats — no ticking remaining", () => {
    install({
      mluck: {
        name: "Good Luck",
        luck: 12,
        buff: true,
        explanation: "Lucked!",
      },
    });
    const effect: BuiltEffect = {
      id: "mluck",
      skin: "buff_luck",
      type: "condition",
      name: "Good Luck",
      ms: 26 * 60 * 1000,
      debuff: false,
    };
    const entity = {
      id: "1",
      s: { mluck: { ms: 26 * 60 * 1000, f: "Merch", strong: true } },
    } as EntityLike;
    const tip = effectTooltip(effect, entity);
    assert.match(tip, /^Good Luck \(Buff\)/);
    assert.match(tip, /From: Merch/);
    assert.match(tip, /Strong: Yes \(locked\)/);
    assert.match(tip, /Lucked!/);
    assert.match(tip, /Luck: \+12%/);
    // From / Strong lead; explanation and stats follow.
    assert.ok(tip.indexOf("From: Merch") < tip.indexOf("Strong:"));
    assert.ok(tip.indexOf("Strong:") < tip.indexOf("Lucked!"));
    assert.ok(tip.indexOf("Lucked!") < tip.indexOf("Luck:"));
    assert.doesNotMatch(tip, /Remaining:/);
    assert.doesNotMatch(tip, /^id:/m);
  });

  it("mluck Strong is unlocked when local character is the caster", () => {
    install({
      mluck: {
        name: "Good Luck",
        luck: 12,
        buff: true,
        explanation: "Lucked!",
      },
    });
    (globalThis as Win).window.character = { name: "Merch" };
    const tip = effectTooltip(
      {
        id: "mluck",
        skin: "buff_luck",
        type: "condition",
        name: "Good Luck",
      },
      {
        id: "1",
        s: { mluck: { ms: 1000, f: "Merch", strong: true } },
      } as EntityLike,
    );
    assert.match(tip, /Strong: Yes$/m);
    assert.doesNotMatch(tip, /locked/);
  });

  it("lists warcry combat stats from G.conditions", () => {
    install({
      warcry: {
        name: "War Cry",
        frequency: 10,
        speed: 20,
        armor: 160,
        resistance: 160,
        buff: true,
        explanation:
          "Boosts attack speed, movement speed, armor, and resistance.",
      },
    });
    const effect: BuiltEffect = {
      id: "warcry",
      skin: "skill_warcry",
      type: "condition",
      name: "War Cry",
      ms: 8000,
    };
    const tip = effectTooltip(effect, { id: "x", s: {} } as EntityLike);
    assert.match(tip, /War Cry \(Buff\)/);
    assert.match(tip, /Boosts attack speed/);
    assert.match(tip, /A\.Speed: 10/);
    assert.match(tip, /Speed: \+20/);
    assert.match(tip, /Armor: 160/);
    assert.match(tip, /Resistance: 160/);
  });

  it("shows burned intensity from live status", () => {
    install({
      burned: {
        name: "Burned",
        explanation: "Burns the target for damage equal to its intensity per second.",
        debuff: true,
        ui: true,
      },
    });
    const effect: BuiltEffect = {
      id: "burned",
      skin: "fireblade",
      type: "condition",
      name: "Burned",
      intensity: 2400,
      debuff: true,
      ms: 5000,
    };
    const entity = {
      id: "boss",
      s: { burned: { ms: 5000, f: "Mage", intensity: 2400 } },
    } as EntityLike;
    const tip = effectTooltip(effect, entity);
    assert.match(tip, /Burned \(Debuff\)/);
    assert.match(tip, /Intensity: 2400/);
    assert.match(tip, /From: Mage/);
    assert.doesNotMatch(tip, /Remaining:/);
  });

  it("enriches citizen auras from G.npcs + live entity.s", () => {
    install(
      {},
      {
        npcs: {
          citizen0: { name: "Kane", aura: { luck: 200 } },
          citizen4: { name: "Angel", aura: { gold: 200 } },
        },
      },
    );
    const kane: BuiltEffect = {
      id: "citizen0aura",
      skin: "citizens",
      type: "condition",
      ms: 6000,
    };
    const kaneTip = effectTooltip(kane, {
      id: "me",
      s: {
        citizen0aura: {
          ms: 6000,
          name: "Citizen's Aura",
          skin: "citizens",
          citizens: true,
          luck: 200,
        },
      },
    } as EntityLike);
    assert.match(kaneTip, /Kane's Aura \(Aura\)/);
    assert.match(kaneTip, /Kane's town aura/);
    assert.match(kaneTip, /Luck: \+200%/);
    assert.match(kaneTip, /From: Kane/);
    assert.doesNotMatch(kaneTip, /citizens/i);

    const angel: BuiltEffect = {
      id: "citizen4aura",
      skin: "citizens",
      type: "condition",
      name: "Citizen's Aura",
      ms: 6000,
    };
    const angelTip = effectTooltip(angel, {
      id: "me",
      s: {
        citizen4aura: {
          ms: 6000,
          name: "Citizen's Aura",
          citizens: true,
          gold: 200,
        },
      },
    } as EntityLike);
    assert.match(angelTip, /Angel's Aura \(Aura\)/);
    assert.match(angelTip, /Gold: \+200%/);
    assert.match(angelTip, /From: Angel/);

    assert.deepEqual(
      resolveCitizenAura("citizen0aura", { citizens: true }),
      { isCitizen: true, npcKey: "citizen0", npcName: "Kane" },
    );
  });

  it("shows monsterhunt target name from live id + G.monsters", () => {
    install(
      {
        monsterhunt: {
          name: "On The Hunt",
          explanation: "Tracking a target.",
          ui: true,
          persistent: true,
        },
      },
      {
        monsters: {
          goo: { name: "Goo" },
          bee: { name: "Bee" },
        },
      },
    );
    const effect: BuiltEffect = {
      id: "monsterhunt",
      skin: "quest_monsterhunt",
      type: "condition",
      name: "On The Hunt",
      charges: 5,
      ms: 1_800_000,
    };
    const tip = effectTooltip(effect, {
      id: "me",
      s: {
        monsterhunt: {
          sn: "EU I",
          id: "goo",
          c: 5,
          ms: 1_800_000,
          dl: true,
        },
      },
    } as EntityLike);
    assert.match(tip, /On The Hunt \(Buff\)/);
    assert.match(tip, /Defeat 5 Goos and return/);
    assert.match(tip, /Target: Goo/);
    assert.match(tip, /Kills left: 5/);
    assert.doesNotMatch(tip, /Tracking a target/);

    const done = effectTooltip(
      { ...effect, charges: undefined },
      {
        id: "me",
        s: {
          monsterhunt: { id: "goo", c: 0, ms: 600_000 },
        },
      } as EntityLike,
    );
    assert.match(done, /Hunt complete/);
    assert.match(done, /Target: Goo/);
  });

  it("labels attr0 player auras as Aura with live attribute", () => {
    install({
      beekeeper_aura: {
        name: "Beekeeper Aura",
        explanation: "A warm hive glow that shares a little gold luck with nearby allies.",
        attr0: "gold",
        buff: true,
        ui: true,
        aura: true,
      },
    });
    const effect: BuiltEffect = {
      id: "beekeeper_aura",
      skin: "placeholder",
      type: "condition",
      name: "Beekeeper Aura",
      ms: 30000,
    };
    const tip = effectTooltip(effect, {
      id: "ally",
      s: {
        beekeeper_aura: { ms: 30000, f: "Keeper", gold: 1 },
      },
    } as EntityLike);
    assert.match(tip, /Beekeeper Aura \(Aura\)/);
    assert.match(tip, /warm hive glow/);
    assert.match(tip, /Gold: \+1%/);
    assert.match(tip, /From: Keeper/);
  });
});
