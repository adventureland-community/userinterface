/**
 * Paperdoll luck / gold-find: gear estimates only (no wallet gold, no snap).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  formatMultPct,
  goldDelta,
  goldFindDisplay,
  luckDelta,
  luckDisplay,
  resolvePaperdollEconomy,
} from "../src/ui/paperdoll/inspectStats";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function install(opts?: {
  calc?: (item: { name: string }) => Record<string, unknown>;
  conditions?: Record<string, { luck?: number; gold?: number }>;
  items?: Record<string, object>;
}) {
  const g = globalThis as Win;
  g.window = {
    calculate_item_properties: opts?.calc,
    G: {
      conditions: opts?.conditions || {},
      items: opts?.items || { ringofluck: {}, goldring: {} },
    },
  };
}

describe("paperdoll luck / gold", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("formats multipliers like the character sheet", () => {
    assert.equal(formatMultPct(1.32), "132%");
    assert.equal(formatMultPct(1), "100%");
    assert.equal(formatMultPct(1.25), "125%");
  });

  it("ignores entity and welcome-snap luckm/goldm; estimates from gear", () => {
    install({
      calc: (item) => (item.name === "ringofluck" ? { luck: 8 } : {}),
      conditions: { mluck: { luck: 12 } },
    });
    const live = {
      id: "a",
      ctype: "mage",
      luckm: 1.9,
      goldm: 2,
      gold: 999,
      slots: { ring1: { name: "ringofluck" } },
      s: { mluck: { ms: 1000 } },
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live);
    assert.equal(eco.luckm, 1.2);
    assert.equal(eco.goldm, 1);
    assert.equal(luckDisplay(eco).value, "~120%");
    assert.equal(goldFindDisplay(eco).value, "~100%");
    assert.match(luckDisplay(eco).title, /Estimated from equipped gear/);
  });

  it("never surfaces wallet gold", () => {
    install({
      calc: () => ({}),
    });
    const live = {
      id: "a",
      ctype: "mage",
      gold: 1_240_000,
      slots: {},
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live);
    assert.equal((eco as { gold?: number }).gold, undefined);
    // Empty gear → baseline ~100% when the walker can run.
    assert.equal(goldFindDisplay(eco).value, "~100%");
  });

  it("compares luck and goldm as percentage points", () => {
    const luck = luckDelta({ luckm: 1.32 }, { luckm: 1.2 });
    assert.deepEqual(luck, { theirs: 132, ours: 120, pct: true });
    const find = goldDelta({ goldm: 1.25 }, { goldm: 1 });
    assert.deepEqual(find, { theirs: 125, ours: 100, pct: true });
    assert.equal(goldDelta({ luckm: 1 }, { goldm: 1.25 }), null);
  });

  it("estimates luckm from equipped luck + mluck", () => {
    install({
      calc: (item) => (item.name === "ringofluck" ? { luck: 8 } : {}),
      conditions: { mluck: { luck: 12 } },
    });
    const live = {
      id: "c",
      ctype: "mage",
      slots: {
        ring1: { name: "ringofluck" },
        trade1: { name: "ringofluck" },
      },
      s: { mluck: { ms: 1000 } },
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live);
    assert.equal(eco.luckm, 1.2);
    assert.equal(luckDisplay(eco).value, "~120%");
  });

  it("estimates gold-find from gear", () => {
    install({
      calc: (item) => (item.name === "goldring" ? { gold: 10 } : {}),
    });
    const live = {
      id: "d",
      ctype: "mage",
      slots: { ring1: { name: "goldring" } },
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live);
    assert.equal(eco.goldm, 1.1);
    assert.equal(goldFindDisplay(eco).value, "~110%");
  });
});
