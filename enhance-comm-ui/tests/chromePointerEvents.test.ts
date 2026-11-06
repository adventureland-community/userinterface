import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  BOTTOM_CHROME_HIT_TARGETS,
  BOTTOM_CHROME_Z_INDEX,
} from "../src/host/commChrome/chromeCss";

const chromeCssSrc = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../src/host/commChrome/chromeCss.ts",
  ),
  "utf8",
);

describe("bottom chrome pointer-events", () => {
  it("keeps #bottom below #comm-ui so bag/toggles paint above chrome", () => {
    assert.equal(BOTTOM_CHROME_Z_INDEX, 201);
    assert.ok(BOTTOM_CHROME_Z_INDEX < 220);
    // Phone Material dock must stay above the strip.
    assert.ok(BOTTOM_CHROME_Z_INDEX < 240);
  });

  it("lists interactive chrome controls for pointer-events:auto", () => {
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-btn/);
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-char/);
    assert.match(BOTTOM_CHROME_HIT_TARGETS, /\.ecu-server-dd-menu/);
    assert.doesNotMatch(BOTTOM_CHROME_HIT_TARGETS, /\*/);
  });

  it("forces serversui overflow visible so the upward menu is not clipped", () => {
    assert.match(
      chromeCssSrc,
      /#bottom \.serversui[\s\S]*?overflow:\s*visible\s*!important/,
    );
  });
});
