import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  itemMatchesQueueIdentity,
  listBagFingerprintsMatchingIdentity,
} from "../../src/host/mail/itemFingerprint";
import type { MailItem } from "../../src/host/mail/types";

describe("itemMatchesQueueIdentity", () => {
  it("matches name + title + level and ignores qty", () => {
    const a: MailItem = { name: "helmet", level: 5, p: "festive", q: 1 };
    assert.equal(
      itemMatchesQueueIdentity(a, { name: "helmet", level: 5, p: "festive" }),
      true,
    );
    assert.equal(
      itemMatchesQueueIdentity(
        { ...a, q: 9 },
        { name: "helmet", level: 5, p: "festive" },
      ),
      true,
    );
    assert.equal(
      itemMatchesQueueIdentity(a, { name: "helmet", level: 5, p: "gooped" }),
      false,
    );
    assert.equal(
      itemMatchesQueueIdentity(a, { name: "helmet", level: 4, p: "festive" }),
      false,
    );
    assert.equal(
      itemMatchesQueueIdentity(a, { name: "pants", level: 5, p: "festive" }),
      false,
    );
  });

  it("treats missing title as untitled on both sides", () => {
    assert.equal(
      itemMatchesQueueIdentity(
        { name: "cape", level: 2 },
        { name: "cape", level: 2 },
      ),
      true,
    );
    assert.equal(
      itemMatchesQueueIdentity(
        { name: "cape", level: 2, p: "festive" },
        { name: "cape", level: 2 },
      ),
      false,
    );
  });

  it("lists every matching bag slot in order", () => {
    const items: Array<MailItem | null> = [
      { name: "helmet", level: 5, p: "festive", q: 1 },
      { name: "helmet", level: 5, p: "gooped", q: 1 },
      null,
      { name: "helmet", level: 5, p: "festive", q: 3 },
      { name: "helmet", level: 4, p: "festive", q: 1 },
    ];
    const fps = listBagFingerprintsMatchingIdentity(items, {
      name: "helmet",
      level: 5,
      p: "festive",
    });
    assert.deepEqual(
      fps.map((f) => f.slot),
      [0, 3],
    );
    assert.equal(fps[0].q, 1);
    assert.equal(fps[1].q, 3);
  });
});
