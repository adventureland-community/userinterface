/**
 * Unit-frame aggro binding: spark/fear list comes only from mobs on the framed entity.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggroOn,
  aggroByTarget,
  aggroMobsForFramedEntity,
} from "../src/queries/entities";
import type { EntityLike } from "../src/host/globals";

function mob(id: string, target: string): EntityLike {
  return { id, type: "monster", mtype: "goo", target };
}

describe("aggro binding per framed entity", () => {
  it("player frame list is mobs on the player id, not on the goo", () => {
    const entities: EntityLike[] = [
      mob("1", "test"),
      mob("2", "test"),
      mob("3", "test"),
      { id: "40", type: "monster", mtype: "goo", target: "test" },
    ];
    const byTarget = aggroByTarget(entities);
    assert.equal(aggroOn(byTarget, "test").length, 4);
    assert.equal(aggroOn(byTarget, "40").length, 0);
  });

  it("monster framed entity gets empty aggroMobs (no observer bleed)", () => {
    const entities: EntityLike[] = [
      mob("1", "test"),
      mob("2", "test"),
      { id: "40", type: "monster", mtype: "goo", target: "test" },
      {
        id: "test",
        type: "character",
        player: true,
        ctype: "priest",
      },
    ];
    const byTarget = aggroByTarget(entities);
    const player = entities[3];
    const goo = entities[2];
    assert.equal(aggroMobsForFramedEntity(byTarget, player).length, 3);
    assert.equal(aggroMobsForFramedEntity(byTarget, goo).length, 0);
  });
});
