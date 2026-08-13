/**
 * Local self is outside stock `entities` and lacks `player:true` (only `me`).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getEntitiesList, findEntityById } from "../src/host/al";
import { isFocusablePlayer, playersList } from "../src/queries/entities";
import type { EntityLike } from "../src/host/globals";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function install(opts: {
  character?: EntityLike | null;
  entities?: Record<string, EntityLike>;
}) {
  const g = globalThis as Win;
  g.window = {
    character: opts.character === undefined ? null : opts.character,
    entities: opts.entities || {},
  };
}

describe("local character entity merge", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("isFocusablePlayer accepts me without player:true", () => {
    const self = {
      id: "test",
      type: "character",
      me: true,
      ctype: "rogue",
    } as EntityLike;
    assert.equal(isFocusablePlayer(self), true);
    assert.equal(
      isFocusablePlayer({
        id: "other",
        type: "character",
        player: true,
      } as EntityLike),
      true,
    );
    assert.equal(
      isFocusablePlayer({ id: "m", type: "monster" } as EntityLike),
      false,
    );
  });

  it("getEntitiesList / findEntityById include local character", () => {
    const self = {
      id: "test",
      type: "character",
      me: true,
      name: "test",
    } as EntityLike;
    install({
      character: self,
      entities: {
        "38": { id: "38", type: "monster", mtype: "goo", target: "test" },
      },
    });
    const list = getEntitiesList();
    assert.equal(list[0].id, "test");
    assert.equal(findEntityById("test"), self);
    assert.equal(playersList(list).length, 1);
    assert.equal(playersList(list)[0].id, "test");
  });
});
