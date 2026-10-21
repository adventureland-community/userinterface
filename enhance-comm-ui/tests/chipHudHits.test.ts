/**
 * Red-capable: chip HUD panels (serverInfo / mapInfo) must opt interactive
 * children into hits — idle PositionedPanel shells are pointer-events:none.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("chip HUD pointer hits", () => {
  it("allowlists ecu-server-info / ecu-map-info controls like ecu-chip", () => {
    const css = readFileSync(
      join(root, "src/host/commChrome/chromeCss.ts"),
      "utf8",
    );
    assert.match(css, /\.ecu-server-info/);
    assert.match(css, /\.ecu-map-info/);
    assert.match(
      css,
      /#comm-ui \.comm-pos-panel \.ecu-server-info[\s\S]*pointer-events:\s*auto/,
    );
  });

  it("ServerInfo / MapInfo roots use those hit classes", () => {
    const server = readFileSync(
      join(root, "src/ui/frames/ServerInfo.ts"),
      "utf8",
    );
    const map = readFileSync(join(root, "src/ui/frames/MapInfo.ts"), "utf8");
    assert.match(server, /className:\s*"ecu-server-info"/);
    assert.match(map, /className:\s*"ecu-map-info"/);
  });
});
