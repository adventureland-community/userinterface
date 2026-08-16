/**
 * Aggro ignores dead / hp<=0 leftovers (DEAD* corpses, missed disappear).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggroByTarget,
  aggroOn,
  aggroedMonsters,
} from "../src/queries/entities";
import type { EntityLike } from "../src/host/globals";

function mob(
  id: string,
  target: string,
  extra: Partial<EntityLike> = {},
): EntityLike {
  return { id, type: "monster", mtype: "sparkbot", target, ...extra };
}

describe("aggro skips ghost / dead monsters", () => {
  it("does not count dead, hp<=0, or duplicate ids", () => {
    const entities: EntityLike[] = [
      mob("1", "sarada"),
      mob("2", "sarada"),
      mob("3", "sarada", { dead: true }),
      mob("4", "sarada", { hp: 0 }),
      mob("5", "sarada", { dead: "vision" }),
      mob("1", "sarada"),
    ];
    const byTarget = aggroByTarget(entities);
    assert.equal(aggroOn(byTarget, "sarada").length, 2);
    assert.equal(aggroedMonsters(entities).length, 2);
  });

  it("still counts living pack members", () => {
    const entities: EntityLike[] = [];
    for (let i = 1; i <= 8; i++) {
      entities.push(mob(String(i), "sarada", { hp: 400 }));
    }
    assert.equal(aggroOn(aggroByTarget(entities), "sarada").length, 8);
  });
});
