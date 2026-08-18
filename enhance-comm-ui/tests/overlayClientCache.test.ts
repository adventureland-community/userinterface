import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assetCacheRel,
  buildClientKit,
  extractFunction,
  isAllowedAssetPath,
} from "../scripts/overlay-client-cache.mjs";

describe("overlay client cache paths", () => {
  it("allows images and css, rejects traversal", () => {
    assert.equal(isAllowedAssetPath("/images/tiles/items/skills_20v6.png"), true);
    assert.equal(isAllowedAssetPath("/css/fonts/m5x7.ttf"), true);
    assert.equal(isAllowedAssetPath("/js/html.js"), false);
    assert.equal(isAllowedAssetPath("/images/../secrets"), false);
    assert.equal(isAllowedAssetPath("/etc/passwd"), false);
    assert.equal(
      assetCacheRel("/images/tiles/items/skills_20v6.png"),
      "images/tiles/items/skills_20v6.png",
    );
  });
});

describe("overlay client kit extract", () => {
  it("pulls a brace-balanced function", () => {
    const src =
      "function skip(){ return 1; }\n" +
      "function sprite(name,args){\n" +
      "  var s = '{not a brace';\n" +
      "  if (name) { return s; }\n" +
      "  return '';\n" +
      "}\n" +
      "function after(){ return 2; }\n";
    const fn = extractFunction(src, "sprite");
    assert.match(fn, /^function sprite\(name,args\)\{/);
    assert.match(fn, /return '';/);
    assert.equal(fn.includes("function after"), false);
    assert.equal(fn.includes("function skip"), false);
  });

  it("refuses the website common_functions.js that resets G", () => {
    const src = "var G = {};\nfunction process_game_data(){}\n";
    assert.throws(
      () => buildClientKit(src, "function sprite(){}"),
      /resets window\.G/,
    );
  });
});
