/**
 * ui / eval / game_response → Time Line casts for skills without `action`.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  acceptIncomingCast,
  castFromConditionOnset,
  castFromEval,
  castFromGameResponse,
  castFromUi,
  conditionMsRefreshed,
  resetConditionSkillMapCache,
  skillIdForCondition,
  uiTypeIsSkill,
  type CastTwin,
} from "../src/meters/syntheticCast";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function player(
  id: string,
  extra?: Partial<EntityLike>,
): EntityLike {
  return {
    id,
    name: id,
    type: "character",
    player: true,
    ctype: "warrior",
    x: 0,
    y: 0,
    ...extra,
  };
}

function install(opts?: {
  skills?: Record<string, object>;
  entities?: EntityLike[];
  character?: EntityLike | null;
}) {
  const rec: Record<string, EntityLike> = {};
  const list = opts?.entities || [];
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (ent.id != null) rec[String(ent.id)] = ent;
  }
  const g = globalThis as Win;
  g.window = {
    G: { skills: opts?.skills || { stomp: {}, mluck: {}, warcry: {}, absorb: {} } },
    entities: rec,
    character: opts?.character === undefined ? null : opts.character,
  };
}

describe("castFromUi", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
    resetConditionSkillMapCache();
  });

  it("records stomp from name (no action packet)", () => {
    install({ entities: [player("Thmsn")] });
    const cast = castFromUi({
      type: "stomp",
      name: "Thmsn",
      at: 10,
    });
    assert.deepEqual(cast, { actor: "Thmsn", source: "stomp", at: 10 });
  });

  it("records mluck from/to", () => {
    install({
      entities: [player("Merch"), player("Mage", { ctype: "mage" })],
    });
    const cast = castFromUi({
      type: "mluck",
      from: "Merch",
      to: "Mage",
      at: 11,
    });
    assert.equal(cast?.actor, "Merch");
    assert.equal(cast?.source, "mluck");
    assert.equal(cast?.target, "Mage");
  });

  it("skips merchant / FX ui that is not a G.skill", () => {
    install();
    assert.equal(uiTypeIsSkill("level_up"), false);
    assert.equal(
      castFromUi({ type: "level_up", name: "Thmsn", at: 1 }),
      null,
    );
  });

  it("skips warcry when the packet has no caster", () => {
    install({ entities: [player("Pally", { ctype: "paladin" })] });
    assert.equal(castFromUi({ type: "warcry", at: 1 }), null);
  });

  it("uses name as caster when absorb also has from (ally id)", () => {
    install({ entities: [player("Priest", { ctype: "priest" })] });
    const cast = castFromUi({
      type: "absorb",
      name: "Priest",
      from: "Mage",
      at: 12,
    });
    assert.equal(cast?.actor, "Priest");
    assert.equal(cast?.target, "Mage");
  });
});

describe("castFromEval / game_response", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
    resetConditionSkillMapCache();
  });

  it("maps icecrack eval to temporalsurge", () => {
    install({
      entities: [
        player("Mage", {
          ctype: "mage",
          x: 10,
          y: 0,
          real_x: 10,
          real_y: 0,
          slots: { orb: { name: "orboftemporal" } },
        }),
      ],
    });
    const cast = castFromEval({
      code: "assassin_smoke(0,0,'icecrack');",
      at: 5,
    });
    assert.equal(cast?.source, "temporalsurge");
    assert.equal(cast?.actor, "Mage");
  });

  it("maps caster game_response to temporalsurge", () => {
    const self = player("Self", { ctype: "mage" });
    install({ character: self, entities: [self] });
    const cast = castFromGameResponse({
      response: "temporalsurge_none",
      at: 6,
    });
    assert.deepEqual(cast, {
      actor: "Self",
      source: "temporalsurge",
      at: 6,
    });
  });

  it("ignores unrelated game_response", () => {
    install({ character: player("Self") });
    assert.equal(
      castFromGameResponse({ response: "gold_received", at: 1 }),
      null,
    );
  });
});

describe("acceptIncomingCast", () => {
  function apply(casts: CastTwin[], incoming: CastTwin): void {
    if (!acceptIncomingCast(casts, incoming)) return;
    casts.push(incoming);
  }

  it("collapses action then ui (pid-less twin skipped)", () => {
    const casts: CastTwin[] = [];
    apply(casts, { actorId: "W", source: "cleave", at: 100, pid: 1 });
    apply(casts, { actorId: "W", source: "cleave", at: 120 });
    assert.equal(casts.length, 1);
    assert.equal(casts[0].pid, 1);
  });

  it("upgrades ui then action (pid-less row replaced)", () => {
    const casts: CastTwin[] = [];
    apply(casts, { actorId: "W", source: "cleave", at: 100 });
    apply(casts, { actorId: "W", source: "cleave", at: 120, pid: 1 });
    assert.equal(casts.length, 1);
    assert.equal(casts[0].pid, 1);
  });

  it("keeps two pid rows (3shot)", () => {
    const casts: CastTwin[] = [];
    apply(casts, { actorId: "R", source: "3shot", at: 100, pid: 1 });
    apply(casts, { actorId: "R", source: "3shot", at: 110, pid: 2 });
    assert.equal(casts.length, 2);
  });

  it("collapses eval then game_response for the same surge", () => {
    const casts: CastTwin[] = [];
    apply(casts, { actorId: "M", source: "temporalsurge", at: 50 });
    apply(casts, { actorId: "M", source: "temporalsurge", at: 80 });
    assert.equal(casts.length, 1);
  });

  it("records again after the debounce window", () => {
    const casts: CastTwin[] = [];
    apply(casts, { actorId: "W", source: "stomp", at: 0 });
    apply(casts, { actorId: "W", source: "stomp", at: 501 });
    assert.equal(casts.length, 2);
  });
});

describe("castFromConditionOnset", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
    resetConditionSkillMapCache();
  });

  it("maps warcry via status.f to the caster (not each recipient)", () => {
    install({
      skills: {
        warcry: { condition: "warcry" },
        hardshell: { condition: "hardshell" },
        charge: {},
        blink: {},
      },
      entities: [player("Warrior"), player("Priest", { ctype: "priest" })],
    });
    assert.equal(skillIdForCondition("warcry"), "warcry");
    const cast = castFromConditionOnset(
      "Priest",
      "warcry",
      { ms: 8000, f: "Warrior" },
      10,
    );
    assert.deepEqual(cast, {
      actor: "Warrior",
      source: "warcry",
      at: 10,
      target: "Priest",
    });
  });

  it("maps charging → charge on the buffed player", () => {
    install({
      skills: { charge: {}, hardshell: { condition: "hardshell" } },
      entities: [player("Warrior")],
    });
    assert.equal(skillIdForCondition("charging"), "charge");
    const cast = castFromConditionOnset(
      "Warrior",
      "charging",
      { ms: 3200 },
      11,
    );
    assert.deepEqual(cast, {
      actor: "Warrior",
      source: "charge",
      at: 11,
    });
  });

  it("maps blink / hardshell self-buffs without f", () => {
    install({
      skills: { blink: {}, hardshell: { condition: "hardshell" } },
      entities: [player("Mage", { ctype: "mage" })],
    });
    assert.deepEqual(
      castFromConditionOnset("Mage", "blink", { ms: 200 }, 12),
      { actor: "Mage", source: "blink", at: 12 },
    );
    assert.deepEqual(
      castFromConditionOnset("Mage", "hardshell", { ms: 8000 }, 13),
      { actor: "Mage", source: "hardshell", at: 13 },
    );
  });

  it("ignores conditions that are not skills", () => {
    install({ skills: { warcry: { condition: "warcry" } } });
    assert.equal(skillIdForCondition("burned"), undefined);
    assert.equal(
      castFromConditionOnset("Warrior", "burned", { ms: 1000 }, 1),
      null,
    );
  });

  it("does not invent casts from combat debuffs (stunned → stomp)", () => {
    install({
      skills: { stomp: { condition: "stunned" }, poison: { condition: "poisoned" } },
    });
    assert.equal(skillIdForCondition("stunned"), "stomp");
    assert.equal(
      castFromConditionOnset("Warrior", "stunned", { ms: 2000 }, 1),
      null,
    );
    assert.equal(
      castFromConditionOnset("Warrior", "poisoned", { ms: 5000 }, 1),
      null,
    );
  });

  it("leaves named-ui skills to the ui packet (mluck, energize)", () => {
    install({
      skills: {
        mluck: { condition: "mluck" },
        energize: { condition: "energized" },
      },
      entities: [player("Merch"), player("Mage", { ctype: "mage" })],
    });
    assert.equal(
      castFromConditionOnset("Mage", "mluck", { ms: 3600000, f: "Merch" }, 1),
      null,
    );
    assert.equal(
      castFromConditionOnset("Mage", "energized", { ms: 800 }, 1),
      null,
    );
  });

  it("skips warcry without status.f", () => {
    install({ skills: { warcry: { condition: "warcry" } } });
    assert.equal(
      castFromConditionOnset("Priest", "warcry", { ms: 8000 }, 1),
      null,
    );
  });

  it("detects ms refresh jumps", () => {
    assert.equal(conditionMsRefreshed(1000, 8000), true);
    assert.equal(conditionMsRefreshed(8000, 7900), false);
    assert.equal(conditionMsRefreshed(undefined, 8000), false);
  });
});
