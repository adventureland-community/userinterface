/**
 * Crypt card model: alive after battle reset, fade only while dead out of vision.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCryptCardProps } from "../src/crypt/cryptCardModel";
import type { CryptBossState } from "../src/crypt/tracker";

describe("buildCryptCardProps battle reset", () => {
  it("shows Alive (not faded) when a killed boss is seen again", () => {
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
    assert.equal(props.status, "Alive");
    assert.equal(props.faded, false);
    assert.equal(props.luckmComponent, null);
    assert.equal(props.lastSeenComponent, "We see!");
  });

  it("fades Died cards that are not in vision", () => {
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
    assert.match(props.status, /^Died/);
    assert.equal(props.faded, true);
    assert.equal(props.luckmComponent, "luckm: 1.100");
  });
});
