import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSendItemScript,
  listNearbySendTargets,
  sendItemQuantity,
  SEND_ITEM_RANGE,
} from "../src/host/sendItem";
import type { EntityLike } from "../src/host/globals";
import type { ItemFingerprint } from "../src/host/mail/types";

describe("sendItem", () => {
  it("sendItemQuantity uses stack size when present", () => {
    assert.equal(sendItemQuantity({ slot: 2, name: "hpots", q: 40 }), 40);
    assert.equal(sendItemQuantity({ slot: 0, name: "sword" }), 1);
  });

  it("buildSendItemScript calls send_item with receiver and slot", () => {
    const fp: ItemFingerprint = {
      slot: 3,
      name: "hpots",
      q: 10,
      level: 0,
    };
    const script = buildSendItemScript(fp, "Merchant", 10);
    assert.match(script, /send_item\("Merchant",__slot,__q\)/);
    assert.match(script, /var __slot=3/);
    assert.match(script, /hpots/);
    assert.match(script, /await send_item/);
  });

  it("buildSendItemScript aborts without recipient", () => {
    const script = buildSendItemScript({ slot: 0, name: "x" }, "  ");
    assert.match(script, /no recipient/);
    assert.doesNotMatch(script, /send_item\(/);
  });

  it("listNearbySendTargets excludes self and out-of-range", () => {
    const self = {
      id: "self1",
      name: "Hero",
      type: "character",
      player: true,
      map: "main",
      x: 0,
      y: 0,
    } as EntityLike;
    (globalThis as any).window = {
      observing: self,
      entities: {},
    };
    const entities: EntityLike[] = [
      self,
      {
        id: "p2",
        name: "Buddy",
        type: "character",
        player: true,
        map: "main",
        x: 100,
        y: 0,
      },
      {
        id: "p3",
        name: "FarAway",
        type: "character",
        player: true,
        map: "main",
        x: SEND_ITEM_RANGE + 50,
        y: 0,
      },
      {
        id: "m1",
        name: "goo",
        type: "monster",
        x: 10,
        y: 0,
      },
      {
        id: "p4",
        name: "Dead",
        type: "character",
        player: true,
        map: "main",
        x: 20,
        y: 0,
        dead: true,
      },
    ];
    const targets = listNearbySendTargets(entities);
    assert.deepEqual(
      targets.map((t) => t.name),
      ["Buddy"],
    );
    assert.ok(targets[0].dist != null && targets[0].dist < SEND_ITEM_RANGE);
  });
});
