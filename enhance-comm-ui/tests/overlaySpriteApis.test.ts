import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSpriteIndex,
  cdnUrl,
  installSpriteApis,
} from "../dev/overlay/spriteApis";

describe("overlay sprite index", () => {
  it("cdnUrl prefixes adventure.land", () => {
    assert.equal(
      cdnUrl("/images/tiles/items/skills_20v6.png"),
      "https://adventure.land/images/tiles/items/skills_20v6.png",
    );
    assert.equal(
      cdnUrl("https://adventure.land/x.png"),
      "https://adventure.land/x.png",
    );
  });

  it("indexes a sprite matrix cell", () => {
    const G = {
      sprites: {
        adversaries: {
          file: "/images/tiles/characters/adversaries.png",
          rows: 2,
          columns: 4,
          matrix: [
            ["a1", "a2", "a3", "a4"],
            ["a5", "a6", "a7", "a8"],
          ],
        },
      },
      images: {
        "/images/tiles/characters/adversaries.png": { width: 312, height: 288 },
      },
      dimensions: {},
    };
    (globalThis as any).window = { G };
    buildSpriteIndex(G);
    installSpriteApis();
    const out = (globalThis as any).window.sprite("a1", {
      width: 22,
      height: 22,
      scale: 0.55,
      overflow: true,
    });
    assert.match(out, /adversaries\.png/);
    assert.match(out, /adventure\.land/);
  });
});
