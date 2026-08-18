/**
 * Instance section live counts / pack labels.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  countVisibleOfMtypes,
  formatSectionLabel,
  mapDesignPackCount,
} from "../src/instance/sectionCounts";
import type { EntityLike } from "../src/host/globals";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

afterEach(() => {
  const g = globalThis as Win;
  if (g.window && "G" in g.window) delete g.window.G;
});

describe("sectionCounts", () => {
  it("counts visible mtypes", () => {
    const entities: EntityLike[] = [
      { id: "1", type: "monster", mtype: "vbat", visible: true },
      { id: "2", type: "monster", mtype: "vbat", visible: true },
      { id: "3", type: "monster", mtype: "nerfedbat", visible: true },
      { id: "4", type: "monster", mtype: "vbat", visible: false },
      { id: "5", type: "monster", mtype: "a1", visible: true },
    ];
    assert.equal(countVisibleOfMtypes(entities, ["vbat", "nerfedbat"]), 3);
  });

  it("reads design pack counts from G.maps", () => {
    const g = globalThis as Win;
    if (!g.window) g.window = {};
    g.window.G = {
      maps: {
        crypt: {
          monsters: [
            { type: "vbat", count: 7, boundary: [0, 0, 1, 1] },
            { type: "a1", count: 1 },
          ],
        },
      },
    };
    assert.equal(mapDesignPackCount("crypt", ["vbat", "nerfedbat"]), 7);
    assert.equal(mapDesignPackCount("crypt", ["missing"]), null);
  });

  it("formats section labels", () => {
    assert.equal(
      formatSectionLabel("Bats", 3, 7),
      "Bats · 3 visible · 7 in pack",
    );
    assert.equal(formatSectionLabel("Bats", 2, null), "Bats · 2 visible");
    assert.equal(formatSectionLabel("Bats", 0, null), "Bats");
  });
});
