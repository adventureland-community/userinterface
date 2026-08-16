/**
 * Temporal Surge: /comm sees eval icecrack fx, not action / game_response.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  gameResponseIsTemporalSurge,
  parseIcecrackSmoke,
  resolveTemporalSurgeCaster,
  TEMPORAL_SURGE_RANGE,
} from "../src/meters/temporalSurge";

function mage(
  id: string,
  x: number,
  y: number,
  orb?: string,
): EntityLike {
  return {
    id,
    type: "character",
    player: true,
    ctype: "mage",
    x,
    y,
    real_x: x,
    real_y: y,
    slots: orb ? { orb: { name: orb } } : {},
  };
}

describe("parseIcecrackSmoke", () => {
  it("reads spawn xy from the observer eval snippet", () => {
    const xy = parseIcecrackSmoke("assassin_smoke(120.5,-40,'icecrack');");
    assert.deepEqual(xy, { x: 120.5, y: -40 });
  });

  it("ignores assassin_smoke without icecrack", () => {
    assert.equal(parseIcecrackSmoke("assassin_smoke(1,2);"), null);
  });

  it("ignores empty / unrelated eval", () => {
    assert.equal(parseIcecrackSmoke(""), null);
    assert.equal(parseIcecrackSmoke("pot_timeout(400)"), null);
  });
});

describe("gameResponseIsTemporalSurge", () => {
  it("accepts both success and none (skill still CDs)", () => {
    assert.equal(gameResponseIsTemporalSurge("temporalsurge"), true);
    assert.equal(gameResponseIsTemporalSurge("temporalsurge_none"), true);
    assert.equal(gameResponseIsTemporalSurge("gold_received"), false);
  });
});

describe("resolveTemporalSurgeCaster", () => {
  it("prefers the orb wearer inside 160", () => {
    const entities: EntityLike[] = [
      mage("near", 0, 0),
      mage("caster", 40, 0, "orboftemporal"),
      mage("far", 400, 0, "orboftemporal"),
    ];
    const got = resolveTemporalSurgeCaster(0, 0, entities);
    assert.equal(got?.id, "caster");
  });

  it("falls back to nearest player when no orb is visible", () => {
    const entities: EntityLike[] = [
      mage("a", 80, 0),
      mage("b", 20, 0),
    ];
    const got = resolveTemporalSurgeCaster(0, 0, entities, TEMPORAL_SURGE_RANGE);
    assert.equal(got?.id, "b");
  });

  it("ignores players outside range", () => {
    const entities: EntityLike[] = [mage("far", 400, 0, "orboftemporal")];
    assert.equal(resolveTemporalSurgeCaster(0, 0, entities), undefined);
  });
});
