/**
 * Crypt card model: glance vs hover; dead-and-unseen cards dim, the panel does not.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCryptCardProps, formatClearedGlance } from "../src/crypt/cryptCardModel";
import type { CryptBossState } from "../src/instance/tracker";

function hoverHas(lines: string[], needle: string): boolean {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(needle) >= 0) return true;
  }
  return false;
}

describe("buildCryptCardProps battle reset", () => {
  it("shows We see! when a killed boss is seen again", () => {
    const boss: CryptBossState = {
      deadCount: 2,
      deathEventTimestamp: Date.now() - 60_000,
      luckm: 1.2,
      lastSeenLevel: 90,
    };
    const props = buildCryptCardProps(
      "a1",
      { entities: [] },
      new Set(["a1"]),
      new Set(),
      { a1: boss },
    );
    assert.equal(props.glance, "We see!");
    assert.equal(props.level, 90);
    assert.equal(props.faded, false);
    assert.equal(hoverHas(props.hoverLines, "luckm"), false);
    assert.equal(hoverHas(props.hoverLines, "Lv 90"), false);
  });

  it("shows Died on glance and luckm/ago on hover", () => {
    const boss: CryptBossState = {
      deadCount: 1,
      deathEventTimestamp: Date.now() - 5_000,
      luckm: 1.1,
    };
    const props = buildCryptCardProps(
      "a2",
      { entities: [] },
      new Set(),
      new Set(),
      { a2: boss },
    );
    assert.equal(props.glance, "Died");
    assert.equal(props.faded, true);
    assert.equal(hoverHas(props.hoverLines, "luckm 1.100"), true);
    assert.equal(hoverHas(props.hoverLines, "ago"), true);
  });

  it("does not report Died for unseen adds with 0 deaths", () => {
    const props = buildCryptCardProps(
      "nerfedbat",
      { entities: [] },
      new Set(),
      new Set(),
      { nerfedbat: { deadCount: 0 } },
    );
    assert.equal(props.glance, "");
    assert.deepEqual(props.hoverLines, ["nerfedbat"]);
  });

  it("counts visible adds on the glance line", () => {
    const bats = [
      { id: "1", type: "monster", mtype: "vbat", visible: true, dead: false },
      { id: "2", type: "monster", mtype: "vbat", visible: true, dead: false },
    ];
    const props = buildCryptCardProps(
      "vbat",
      { entities: bats as any },
      new Set(["vbat"]),
      new Set(),
      { vbat: { deadCount: 0 } },
    );
    assert.equal(props.glance, "We see! · ×2");
  });

  it("keeps add kill count on the card while they are in vision", () => {
    const bats = [
      {
        id: "1",
        type: "monster",
        mtype: "vbat",
        visible: true,
        dead: false,
        level: 9,
      },
    ];
    const props = buildCryptCardProps(
      "vbat",
      { entities: bats as any },
      new Set(["vbat"]),
      new Set(),
      { vbat: { deadCount: 4, lastSeenLevel: 8 } },
    );
    assert.equal(props.glance, "We see!");
    assert.equal(props.kills, 4);
    assert.equal(props.level, 9);
    assert.equal(props.faded, false);
  });

  it("shows unseen add kills without a Died glance line", () => {
    const props = buildCryptCardProps(
      "nerfedbat",
      { entities: [] },
      new Set(),
      new Set(),
      { nerfedbat: { deadCount: 3, lastSeenLevel: 7 } },
    );
    assert.equal(props.glance, "");
    assert.equal(props.kills, 3);
    assert.equal(props.level, 7);
    assert.equal(props.faded, true);
  });
});

describe("formatClearedGlance", () => {
  it("includes relative age when a kill timestamp exists", () => {
    assert.equal(
      formatClearedGlance(Date.now() - 3 * 60 * 1000),
      "Cleared · 3m ago",
    );
  });

  it("stays Cleared without a timestamp", () => {
    assert.equal(formatClearedGlance(), "Cleared");
    assert.equal(formatClearedGlance(0), "Cleared");
  });
});
