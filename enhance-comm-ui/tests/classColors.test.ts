import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classColors,
  isPlayerClass,
  resolveClassColor,
} from "../src/lib/colors";

describe("classColors", () => {
  it("resolveClassColor matches bar palette and defaults to white", () => {
    assert.equal(resolveClassColor("mage"), classColors.mage);
    assert.equal(resolveClassColor("RANGER"), classColors.ranger);
    assert.equal(resolveClassColor(""), "#ffffff");
    assert.equal(resolveClassColor("fullstatic"), "#ffffff");
    assert.equal(resolveClassColor("goo", "#fff"), "#fff");
  });

  it("isPlayerClass only accepts known class keys", () => {
    assert.equal(isPlayerClass("merchant"), true);
    assert.equal(isPlayerClass("Paladin"), true);
    assert.equal(isPlayerClass("fullstatic"), false);
    assert.equal(isPlayerClass("citizen"), false);
    assert.equal(isPlayerClass(""), false);
  });
});
