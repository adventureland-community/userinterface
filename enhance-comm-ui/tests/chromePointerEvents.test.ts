import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOTTOM_CHROME_HIT_TARGETS,
  BOTTOM_CHROME_Z_INDEX,
} from "../src/host/commChrome/chromeCss";

describe("bottom chrome pointer-events", () => {
  it("keeps #bottom below #comm-ui for hit testing", () => {
    assert.equal(BOTTOM_CHROME_Z_INDEX, 201);
    assert.ok(BOTTOM_CHROME_Z_INDEX < 220);
  });

  it("lists interactive chrome controls for pointer-events:auto", () => {
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-btn/);
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-char/);
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-server-dd-menu/);
    assert.doesNotMatch(BOTTOM_CHROME_HIT_TARGETS, /\*/);
  });
});
