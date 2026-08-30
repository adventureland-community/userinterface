import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { itemInstanceLabel } from "../src/lib/gameIcon";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(g: Record<string, unknown>): void {
  (globalThis as Win).window = { G: g };
}

afterEach(() => {
  delete (globalThis as Win).window;
});

describe("itemInstanceLabel", () => {
  it("uses G.titles prefix when present", () => {
    installG({
      items: { pants1: { name: "Pants", upgrade: true } },
      titles: { gooped: { title: "Gooped" } },
    });
    assert.equal(
      itemInstanceLabel("pants1", { p: "gooped", level: 9 }),
      "Gooped Pants +9",
    );
  });

  it("title-cases unknown p keys", () => {
    installG({
      items: { bcape: { name: "Cape", compound: true } },
      titles: {},
    });
    assert.equal(
      itemInstanceLabel("bcape", { p: "festive", level: 7 }),
      "Festive Cape +R",
    );
  });

  it("adds upgrade letter suffixes at max level", () => {
    installG({
      items: { dagger: { name: "Dagger", upgrade: true } },
      titles: {},
    });
    assert.equal(itemInstanceLabel("dagger", { level: 12 }), "Dagger +Z");
  });
});
