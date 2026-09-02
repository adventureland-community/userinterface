import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { panelStyle } from "../src/lib/layout";
import { PAPERDOLL_SHELL } from "../src/ui/paperdoll/PaperdollDummy";

const chromeCssPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/host/commChrome/chromeCss.ts",
);

describe("panel pointer-events", () => {
  it("panelStyle keeps idle shells click-through", () => {
    const style = panelStyle({ x: 10, y: 10, anchor: "bc" }, false);
    assert.equal(style.pointerEvents, "none");
  });

  it("paperdoll content shell captures hits", () => {
    assert.equal(PAPERDOLL_SHELL.pointerEvents, "none");
  });

  it("party Buffs mode chip receives clicks through click-through shells", () => {
    const css = readFileSync(chromeCssPath, "utf8");
    assert.match(
      css,
      /#comm-ui \.comm-pos-panel \.ecu-roster-buffs[\s\S]*?pointer-events:\s*auto/,
    );
  });
});
