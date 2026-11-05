import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowMongodbWorktree,
  assetCacheRel,
  buildClientKit,
  extractFunction,
  isAllowedAssetPath,
  resolveMongodbGitRef,
} from "../scripts/overlay-client-cache.mjs";

describe("overlay client cache paths", () => {
  it("allows images and css, rejects traversal", () => {
    assert.equal(isAllowedAssetPath("/images/tiles/items/skills_20v6.png"), true);
    assert.equal(isAllowedAssetPath("/css/fonts/m5x7.ttf"), true);
    assert.equal(isAllowedAssetPath("/js/html.js"), true);
    assert.equal(isAllowedAssetPath("/js/game.js"), true);
    assert.equal(isAllowedAssetPath("/images/../secrets"), false);
    assert.equal(isAllowedAssetPath("/etc/passwd"), false);
    assert.equal(
      assetCacheRel("/images/tiles/items/skills_20v6.png"),
      "images/tiles/items/skills_20v6.png",
    );
  });
});

describe("overlay stock host source pin", () => {
  it("defaults to upstream/main and refuses worktree unless opted in", () => {
    const prevRef = process.env.ECU_AL_MONGODB_REF;
    const prevWork = process.env.ECU_AL_MONGODB_WORKDIR;
    try {
      delete process.env.ECU_AL_MONGODB_REF;
      delete process.env.ECU_AL_MONGODB_WORKDIR;
      assert.equal(resolveMongodbGitRef(), "upstream/main");
      assert.equal(allowMongodbWorktree(), false);
      process.env.ECU_AL_MONGODB_REF = "origin/main";
      process.env.ECU_AL_MONGODB_WORKDIR = "1";
      assert.equal(resolveMongodbGitRef(), "origin/main");
      assert.equal(allowMongodbWorktree(), true);
    } finally {
      if (prevRef == null) delete process.env.ECU_AL_MONGODB_REF;
      else process.env.ECU_AL_MONGODB_REF = prevRef;
      if (prevWork == null) delete process.env.ECU_AL_MONGODB_WORKDIR;
      else process.env.ECU_AL_MONGODB_WORKDIR = prevWork;
    }
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
