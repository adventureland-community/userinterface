import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { BAG_HOST_FLOAT_Z_INDEX } from "../src/host/inventory";
import { BOTTOM_CHROME_Z_INDEX } from "../src/host/commChrome/chromeCss";

/** #comm-ui inline z from main.ts — keep in sync if that constant moves. */
const COMM_UI_Z_INDEX = 260;

const mainTs = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/main.ts"),
  "utf8",
);

describe("bag host stacking", () => {
  it("floats above #bottom but below #comm-ui (Mail/Market must win)", () => {
    assert.ok(BAG_HOST_FLOAT_Z_INDEX > BOTTOM_CHROME_Z_INDEX);
    assert.ok(BAG_HOST_FLOAT_Z_INDEX < COMM_UI_Z_INDEX);
  });

  it("pins #comm-ui with top/left so fixed does not use static position", () => {
    assert.match(mainTs, /style\.top\s*=\s*"0"/);
    assert.match(mainTs, /style\.left\s*=\s*"0"/);
    assert.match(mainTs, /style\.zIndex\s*=\s*"260"/);
  });
});
