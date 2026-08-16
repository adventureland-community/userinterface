/**
 * G.skills cooldown lookup (consume_skill share / multiplier + attack_ms).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  attackMsFromFrequency,
  skillCooldownSec,
} from "../src/lib/abilityIds";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(skills: Record<string, any>): void {
  (globalThis as Win).window = { G: { skills } };
}

describe("skillCooldownSec", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("uses G.skills.cooldown in seconds", () => {
    installG({ temporalsurge: { cooldown: 60 * 1000 } });
    assert.equal(skillCooldownSec("temporalsurge"), 60);
  });

  it("follows share + cooldown_multiplier onto a static table CD", () => {
    installG({
      quickpunch: { cooldown: 250 },
      quickstab: { share: "quickpunch" },
    });
    assert.equal(skillCooldownSec("quickstab"), 0.25);
  });

  it("uses attack_ms for attack and share:attack, not G.skills.attack.cooldown", () => {
    installG({
      attack: { name: "Attack", cooldown: 9999 },
      heal: { share: "attack", cooldown_multiplier: 1 },
      piercingshot: { share: "attack", cooldown_multiplier: 1 },
      "3shot": { share: "attack", cooldown_multiplier: 1 },
    });
    assert.equal(skillCooldownSec("attack", 694), 0.694);
    assert.equal(skillCooldownSec("heal", 694), 0.694);
    assert.equal(skillCooldownSec("piercingshot", 694), 0.694);
    assert.equal(skillCooldownSec("3shot", 694), 0.694);
    assert.equal(skillCooldownSec("attack"), 0);
    assert.equal(skillCooldownSec("heal", 1000), 1);
  });

  it("applies cooldown_multiplier on top of attack_ms", () => {
    installG({
      attack: { name: "Attack" },
      slowswing: { share: "attack", cooldown_multiplier: 2 },
    });
    assert.equal(skillCooldownSec("slowswing", 1000), 2);
  });

  it("returns 0 for missing table", () => {
    installG({ attack: { name: "Attack" } });
    assert.equal(skillCooldownSec("unknown_skill"), 0);
  });

  it("matches server round(1000 / frequency)", () => {
    assert.equal(attackMsFromFrequency(1.44), 694);
    assert.equal(attackMsFromFrequency(1), 1000);
    assert.equal(attackMsFromFrequency(0), undefined);
    assert.equal(attackMsFromFrequency(undefined), undefined);
  });
});
