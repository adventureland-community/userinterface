import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateBankItems,
  flattenBankSlots,
  packDisplayLabel,
  sortBankItems,
} from "../src/lib/bank/bankBrowse";
import { bankQtyFor, buildBankQtyIndex } from "../src/lib/bank/bankStock";
import {
  bankItemMatchesQuery,
  filterBankItems,
  parseBankQuery,
} from "../src/lib/bank/bankQuery";
import {
  analyzeCompoundCombines,
  analyzeCompoundReady,
  analyzeCraftRecipes,
  analyzeCraftReady,
  computeCombineCounts,
  groupCombineSteps,
} from "../src/lib/bank/bankReady";
import { parseLoadBankPayload } from "../src/host/bank/api";
import {
  changeBadgeQuantity,
  changeCaption,
  compareBankSnapshots,
  filterBankChanges,
} from "../src/lib/bank/bankDiff";

describe("bankBrowse", () => {
  it("flattens packs and merges identical stacks", () => {
    const packs = {
      items1: [{ name: "hpot0", q: 200 }],
      items0: [
        { name: "hpot0", q: 100 },
        null,
        { name: "sword", level: 1 },
      ],
    };
    const slots = flattenBankSlots(packs);
    assert.equal(slots.length, 3);
    assert.equal(packDisplayLabel("items0"), "Pack 1");
    const agg = aggregateBankItems(slots);
    const pot = agg.find((a) => a.name === "hpot0");
    assert.ok(pot);
    assert.equal(pot!.q, 300);
    assert.equal(pot!.locs.length, 2);
  });
});

describe("bankQuery", () => {
  const items = aggregateBankItems(
    flattenBankSlots({
      items0: [
        { name: "hpot0", q: 50 },
        { name: "fireblade", level: 7, p: "shiny" },
        { name: "intearring", level: 2 },
      ],
    }),
  );

  it("parses OR groups and field ops", () => {
    const groups = parseBankQuery("item:hpot OR type:weapon");
    assert.ok(groups.length >= 1);
  });

  it("filters by item / level / pack", () => {
    const ctx = { itemType: (n: string) => (n === "fireblade" ? "weapon" : "") };
    assert.equal(filterBankItems(items, "item:hpot", ctx).length, 1);
    assert.equal(filterBankItems(items, "level:>=7", ctx).length, 1);
    assert.equal(filterBankItems(items, "type:weapon", ctx).length, 1);
    assert.equal(
      bankItemMatchesQuery(items[0], "pack:items0", ctx) ||
        bankItemMatchesQuery(items[0], "pack:1", ctx),
      true,
    );
  });

  it("filters is:compound / is:craft via G", () => {
    const G = {
      items: {
        hpot0: { type: "pot" },
        fireblade: { type: "weapon", upgrade: true },
        intearring: { type: "earring", compound: true },
        cake: { type: "material" },
      },
      craft: { cake: { cost: 1, items: [[1, "hpot0"]] } },
    };
    const ctx = {
      itemType: (n: string) => String((G.items as any)[n]?.type || ""),
      G,
    };
    assert.equal(filterBankItems(items, "is:compound", ctx).length, 1);
    assert.equal(filterBankItems(items, "is:upgrade", ctx).length, 1);
    assert.equal(filterBankItems(items, "is:craft", ctx).length, 0);
  });
});

describe("bankReady", () => {
  it("sorts like explorer: category / quantity / stack", () => {
    const G = {
      items: {
        a: { type: "pot" },
        b: { type: "weapon" },
        c: { type: "pot" },
      },
    };
    const items = aggregateBankItems(
      flattenBankSlots({
        items0: [
          { name: "a", q: 10 },
          { name: "b", q: 50 },
          { name: "c", q: 5 },
          { name: "a", q: 5 },
        ],
      }),
    );
    // a is two stacks (15), b one (50), c one (5)
    const byQty = sortBankItems(items, "quantity", G);
    assert.equal(byQty[0].name, "b");
    const byStack = sortBankItems(items, "stack", G);
    assert.equal(byStack[0].name, "a");
    assert.equal(byStack[0].locs.length, 2);
    const byCat = sortBankItems(items, "category", G);
    // weapon before pot in BANK_TYPE_CATEGORIES
    assert.ok(
      byCat.findIndex((x) => x.name === "b") <
        byCat.findIndex((x) => x.name === "a"),
    );
  });

  it("computes combine ready / almost counts", () => {
    assert.deepEqual(computeCombineCounts(8), {
      readyCount: 2,
      potentialCount: 3,
      missing: 1,
    });
    assert.deepEqual(computeCombineCounts(2), {
      readyCount: 0,
      potentialCount: 1,
      missing: 1,
    });
    assert.deepEqual(computeCombineCounts(9), {
      readyCount: 3,
      potentialCount: 3,
      missing: 0,
    });
  });

  it("finds compound combines with cascade and almost", () => {
    const items = aggregateBankItems(
      flattenBankSlots({
        items0: [
          { name: "intearring", level: 0, q: 5 },
          { name: "intearring", level: 1, q: 2 },
        ],
      }),
    );
    const G = { items: { intearring: { compound: true, name: "Int Earring" } } };
    const analysis = analyzeCompoundCombines(items, G);
    assert.ok(analysis.ready.some((r) => r.level === 0 && r.combineReadyCount === 1));
    const l1 = analysis.ready.find((r) => r.level === 1);
    assert.ok(l1);
    assert.equal(l1!.have, 2);
    assert.equal(l1!.cascadeIn, 1);
    assert.equal(l1!.effectiveHave, 3);
    assert.equal(l1!.combineReadyCount, 1);

    const chains = groupCombineSteps(analysis.ready);
    assert.ok(chains.some((c) => c.length >= 2));

    // 2 at +0 → almost (missing 1)
    const almostOnly = analyzeCompoundCombines(
      aggregateBankItems(
        flattenBankSlots({ items0: [{ name: "intearring", level: 0, q: 2 }] }),
      ),
      G,
    );
    assert.equal(almostOnly.ready.length, 0);
    assert.equal(almostOnly.potential.length, 1);
    assert.equal(almostOnly.potential[0].missing, 1);

    const legacy = analyzeCompoundReady(items, G);
    assert.equal(legacy[0].readyCount, legacy[0].combineReadyCount);
  });

  it("finds craftable + almost recipes from bank stock", () => {
    const items = aggregateBankItems(
      flattenBankSlots({
        items0: [
          { name: "flour", q: 10 },
          { name: "egg", q: 4 },
        ],
      }),
    );
    const G = {
      items: { cake: { name: "Cake" }, flour: {}, egg: {} },
      craft: {
        cake: { cost: 100, items: [[2, "flour"], [1, "egg"]] },
      },
    };
    const analysis = analyzeCraftRecipes(items, G);
    assert.equal(analysis.ready.length, 1);
    assert.equal(analysis.ready[0].craftableCount, 4);
    assert.equal(analysis.ready[0].cost, 100);

    const almost = analyzeCraftRecipes(
      aggregateBankItems(
        flattenBankSlots({
          items0: [
            { name: "flour", q: 10 },
            { name: "egg", q: 1 },
          ],
        }),
      ),
      G,
    );
    // flour supports 5, egg supports 1 → ready 1; potential higher via flour
    assert.equal(almost.ready[0].craftableCount, 1);
    assert.ok((almost.potential[0]?.potentialCraftCount ?? 0) > 1);
    assert.equal(analyzeCraftReady(items, G).length, 1);
  });
});

describe("parseLoadBankPayload", () => {
  it("reads packs + gold from stock shape", () => {
    const got = parseLoadBankPayload({
      packs: { items0: [{ name: "a" }] },
      gold: 12345,
    });
    assert.ok(got);
    assert.equal(got!.gold, 12345);
    assert.equal(got!.packs.items0![0]!.name, "a");
  });

  it("rejects failed payloads", () => {
    assert.equal(parseLoadBankPayload({ failed: true }), null);
  });
});

describe("bankStock", () => {
  it("indexes vault qty by name/level/title key", () => {
    const snap = {
      packs: {
        items0: [
          { name: "hpot0", q: 100 },
          { name: "fireblade", level: 7, q: 1 },
          { name: "hpot0", q: 50 },
        ],
      },
      gold: 0,
      loadedAt: 1,
    };
    const idx = buildBankQtyIndex(snap);
    assert.equal(bankQtyFor(idx, { name: "hpot0" }), 150);
    assert.equal(bankQtyFor(idx, { name: "fireblade", level: 7 }), 1);
    assert.equal(bankQtyFor(idx, { name: "fireblade", level: 0 }), 0);
  });
});

describe("bankDiff", () => {
  it("reports added, removed, qty/stack, gold, and slot deltas", () => {
    const prev = {
      packs: {
        items0: [
          { name: "hpot0", q: 100 },
          { name: "sword", level: 1 },
        ],
      },
      gold: 1000,
      loadedAt: 1,
    };
    const next = {
      packs: {
        items0: [
          { name: "hpot0", q: 250 },
          { name: "hpot0", q: 50 },
          { name: "shield", level: 0 },
        ],
      },
      gold: 1500,
      loadedAt: 2,
    };
    const summary = compareBankSnapshots(prev, next);
    assert.equal(summary.hasChanges, true);
    assert.equal(summary.goldDelta, 500);
    assert.equal(summary.usedSlotsDelta, 1);
    const kinds = summary.changes.map((c) => c.kind).sort();
    assert.deepEqual(kinds, ["added", "changed", "removed"]);
    const added = summary.changes.find((c) => c.kind === "added");
    assert.ok(added);
    assert.equal(added!.item.name, "shield");
    const removed = summary.changes.find((c) => c.kind === "removed");
    assert.ok(removed);
    assert.equal(removed!.item.name, "sword");
    const changed = summary.changes.find((c) => c.kind === "changed");
    assert.ok(changed);
    assert.equal(changed!.item.name, "hpot0");
    assert.equal(changed!.deltaQ, 200);
    assert.equal(changed!.deltaStacks, 1);
    assert.equal(changeCaption(added!), "Added");
    assert.equal(changeCaption(removed!), "Removed");
    assert.match(changeCaption(changed!), /\+200 qty/);
    assert.equal(changeBadgeQuantity(changed!), 200);
  });

  it("filters gear and quantity like explorer", () => {
    const changes = [
      {
        kind: "added" as const,
        item: {
          key: "a",
          name: "hpot0",
          q: 10,
          locs: [{ pack: "items0", index: 0, q: 10 }],
        },
      },
      {
        kind: "changed" as const,
        item: {
          key: "b",
          name: "fireblade",
          level: 7,
          q: 2,
          locs: [{ pack: "items0", index: 1, q: 1 }],
        },
        deltaQ: 1,
        deltaStacks: 0,
      },
      {
        kind: "added" as const,
        item: {
          key: "c",
          name: "intearring",
          level: 2,
          q: 1,
          locs: [{ pack: "items0", index: 2, q: 1 }],
        },
      },
    ];
    const G = {
      items: {
        fireblade: { upgrade: true },
        intearring: { compound: true },
        hpot0: { type: "pot" },
      },
    };
    assert.equal(filterBankChanges(changes, "all", G).length, 3);
    assert.equal(filterBankChanges(changes, "gear", G).length, 2);
    assert.equal(filterBankChanges(changes, "quantity", G).length, 1);
  });

  it("returns empty when either snapshot is missing", () => {
    const empty = compareBankSnapshots(null, {
      packs: {},
      gold: 0,
      loadedAt: 1,
    });
    assert.equal(empty.hasChanges, false);
    assert.equal(empty.changes.length, 0);
  });
});
