/**
 * Crypt progress click: pick aggroed bat of mtype, not first (lowest) id.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickVisibleCryptMob } from "../src/crypt/pickVisibleMob";
import type { EntityLike } from "../src/host/globals";

function bat(id: string, extra?: Partial<EntityLike>): EntityLike {
  return {
    id,
    type: "monster",
    mtype: "vbat",
    visible: true,
    dead: false,
    ...extra,
  };
}

describe("pickVisibleCryptMob", () => {
  it("prefers aggroed over lower-id idle bat", () => {
    const picked = pickVisibleCryptMob(
      [bat("508"), bat("584", { target: "sarada" })],
      "vbat",
    );
    assert.equal(picked?.id, "584");
  });

  it("prefers the bat on self over another aggroed bat", () => {
    const picked = pickVisibleCryptMob(
      [bat("100", { target: "frikk" }), bat("200", { target: "sarada" })],
      "vbat",
      "sarada",
    );
    assert.equal(picked?.id, "200");
  });

  it("falls back to first visible when none are aggroed", () => {
    const picked = pickVisibleCryptMob([bat("508"), bat("584")], "vbat");
    assert.equal(picked?.id, "508");
  });
});
