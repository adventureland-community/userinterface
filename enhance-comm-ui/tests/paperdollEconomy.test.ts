/**
 * Paperdoll luck / gold: welcome-snap merge + gear estimate fallback.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  formatMultPct,
  goldDelta,
  goldDisplay,
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

  it("prefers live luckm/gold over the welcome snap", () => {
    install();
    const live = {
      id: "a",
      luckm: 1.1,
      gold: 50,
      goldm: 1.05,
    } as EntityLike;
    const snap = {
      id: "a",
      luckm: 1.9,
      gold: 999,
      goldm: 2,
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live, snap);
    assert.equal(eco.luckm, 1.1);
    assert.equal(eco.gold, 50);
    assert.equal(eco.goldm, 1.05);
    assert.equal(eco.luckEstimated, false);
  });

  it("fills omitted fields from the welcome snap of the same id", () => {
    install();
    const live = { id: "a", type: "character" } as EntityLike;
    const snap = {
      id: "a",
      luckm: 1.32,
      gold: 1_240_000,
      goldm: 1.25,
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live, snap);
    assert.equal(eco.luckm, 1.32);
    assert.equal(eco.gold, 1_240_000);
    assert.equal(eco.goldm, 1.25);
    const gold = goldDisplay(eco);
    assert.equal(gold.value, "1.24M");
    assert.match(gold.title, /gold find 125%/);
    const luck = luckDisplay(eco);
    assert.equal(luck.value, "132%");
  });

  it("does not use another character's welcome snap", () => {
    install();
    const live = { id: "b", type: "character" } as EntityLike;
    const snap = { id: "a", luckm: 1.5, gold: 9 } as EntityLike;
    const eco = resolvePaperdollEconomy(live, snap);
    assert.equal(eco.luckm, undefined);
    assert.equal(eco.gold, undefined);
    assert.equal(luckDisplay(eco).value, "—");
    assert.equal(goldDisplay(eco).value, "—");
  });

  it("falls back to gold-find % when coins are missing", () => {
    const gold = goldDisplay({ goldm: 1.25 });
    assert.equal(gold.value, "125%");
    assert.match(gold.title, /Gold find/);
  });

  it("compares luck as percentage points and gold in a matching mode", () => {
    const luck = luckDelta({ luckm: 1.32 }, { luckm: 1.2 });
    assert.deepEqual(luck, { theirs: 132, ours: 120, pct: true });
    const coins = goldDelta({ gold: 200 }, { gold: 50 });
    assert.deepEqual(coins, { theirs: 200, ours: 50, pct: false });
    const find = goldDelta({ goldm: 1.25 }, { goldm: 1 });
    assert.deepEqual(find, { theirs: 125, ours: 100, pct: true });
    assert.equal(goldDelta({ gold: 200 }, { goldm: 1.25 }), null);
  });

  it("estimates luckm from equipped luck + mluck when the server omits it", () => {
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
    // 8 from ring + 12 mluck; trade slot is not equipped
    assert.equal(eco.luckm, 1.2);
    assert.equal(eco.luckEstimated, true);
    assert.match(luckDisplay(eco).title, /from gear/);
  });

  it("estimates gold-find from gear; never invents wallet gold", () => {
    install({
      calc: (item) => (item.name === "goldring" ? { gold: 10 } : {}),
    });
    const live = {
      id: "d",
      ctype: "mage",
      slots: { ring1: { name: "goldring" } },
    } as EntityLike;
    const eco = resolvePaperdollEconomy(live);
    assert.equal(eco.gold, undefined);
    assert.equal(eco.goldm, 1.1);
    assert.equal(eco.goldmEstimated, true);
    assert.equal(goldDisplay(eco).value, "110%");
  });
});
