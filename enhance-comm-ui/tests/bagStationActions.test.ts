import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  bestBagSlotQty,
  craftOfferNotReadySuffix,
  dismantleOfferForBagItem,
  dismantleUnavailableHint,
  exchangeOfferForBagItem,
  listCraftOffersForBagItem,
  pickBankSlotsForNeed,
  totalBagQty,
} from "../src/lib/bagStationActions";
import {
  evaluateStationAccess,
  findNpcCoords,
  observingHasComputer,
  STATION_SELL_DIST,
} from "../src/lib/stationAccess";
import type { GLike } from "../src/host/globals";

const prevWindow = (globalThis as { window?: unknown }).window;
before(() => {
  (globalThis as { window?: unknown }).window = {
    observing: null,
    G: null,
    simple_distance: undefined,
  };
});
after(() => {
  if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = prevWindow;
});

const G = {
  items: {
    leather: { name: "Leather", e: 1 },
    qubics: { name: "Qubics", e: 10 },
    helmet: { name: "Helmet", compound: true, type: "helmet" },
    stick: { name: "Stick" },
    bow: { name: "Bow" },
    computer: { name: "Computer", type: "computer" },
  },
  craft: {
    bow: {
      cost: 100,
      items: [
        [3, "stick"],
        [1, "leather"],
      ],
    },
    computers: {
      cost: 0,
      quest: "mcollector",
      items: [[1, "qubics"]],
    },
  },
  dismantle: {
    bow: { cost: 50, items: [[2, "stick"]] },
  },
  maps: {
    main: {
      ref: {
        craftsman: { map: "main", x: 100, y: 200, id: "craftsman" },
        exchange: { map: "main", x: 50, y: 50, id: "exchange" },
        mcollector: { map: "main", x: 10, y: 10, id: "mcollector" },
      },
      exchange: { map: "main", x: 50, y: 50, id: "exchange" },
    },
  },
  quests: {
    mcollector: { map: "main", x: 10, y: 10, id: "mcollector" },
  },
} as unknown as GLike;

describe("bag station qty helpers", () => {
  it("bestBagSlotQty prefers the fullest matching slot", () => {
    const bag = [
      { name: "stick", q: 2 },
      { name: "stick", q: 5 },
      { name: "leather", q: 1 },
    ];
    assert.equal(bestBagSlotQty(bag, "stick"), 5);
    assert.equal(totalBagQty(bag, "stick"), 7);
  });

  it("pickBankSlotsForNeed takes largest packs first", () => {
    const picks = pickBankSlotsForNeed(
      [
        { pack: "items0", index: 0, item: { name: "stick", q: 2 } },
        { pack: "items0", index: 1, item: { name: "stick", q: 8 } },
        { pack: "items1", index: 0, item: { name: "leather", q: 9 } },
      ],
      "stick",
      5,
    );
    assert.equal(picks.length, 1);
    assert.equal(picks[0].index, 1);
  });
});

describe("exchange / dismantle offers", () => {
  it("exchange requires e qty", () => {
    const bag = [{ name: "qubics", q: 3 }];
    const short = exchangeOfferForBagItem({ name: "qubics", q: 3 }, bag, G);
    assert.ok(short);
    assert.equal(short!.enoughQty, false);
    assert.equal(short!.e, 10);
    const ok = exchangeOfferForBagItem({ name: "qubics", q: 10 }, bag, G);
    assert.equal(ok!.enoughQty, true);
  });

  it("dismantle recipe and compound split", () => {
    const bag = [{ name: "bow" }];
    const recipe = dismantleOfferForBagItem({ name: "bow" }, bag, G);
    assert.ok(recipe);
    assert.equal(recipe!.kind, "recipe");
    const split = dismantleOfferForBagItem(
      { name: "helmet", level: 2 },
      bag,
      G,
    );
    assert.ok(split);
    assert.equal(split!.kind, "compound");
    assert.equal(
      dismantleOfferForBagItem({ name: "helmet", level: 0 }, bag, G),
      null,
    );
  });

  it("explains missing dismantle for upgrade / L0 compound", () => {
    const upgradeNa = dismantleUnavailableHint(
      { name: "helmet", level: 3 },
      {
        ...G,
        items: {
          ...G.items,
          helmet: { name: "Helmet", upgrade: true },
        },
        dismantle: {},
      } as unknown as GLike,
    );
    assert.ok(upgradeNa);
    assert.match(upgradeNa!.label, /n\/a/);

    const needPlus = dismantleUnavailableHint(
      { name: "helmet", level: 0 },
      G,
    );
    assert.ok(needPlus);
    assert.match(needPlus!.label, /\+1/);
  });
});

describe("craft offers", () => {
  it("lists recipes using the clicked ingredient when bag is ready", () => {
    const bag = [
      { name: "stick", q: 3 },
      { name: "leather", q: 1 },
    ];
    const offers = listCraftOffersForBagItem("stick", bag, {
      G,
      gold: 500,
    });
    assert.equal(offers.length, 1);
    assert.equal(offers[0].output, "bow");
    assert.equal(offers[0].bagReady, true);
    assert.equal(offers[0].withdrawCanReady, false);
  });

  it("marks missing bag reagents and withdraw when bank covers", () => {
    const bag = [{ name: "stick", q: 1 }];
    const offers = listCraftOffersForBagItem("leather", bag, {
      G,
      gold: 500,
      bankAgg: [
        {
          key: "stick",
          name: "stick",
          q: 10,
          locs: [{ pack: "items0", index: 0, q: 10 }],
        },
        {
          key: "leather",
          name: "leather",
          q: 5,
          locs: [{ pack: "items0", index: 1, q: 5 }],
        },
      ],
    });
    assert.equal(offers.length, 1);
    assert.equal(offers[0].bagReady, false);
    assert.equal(offers[0].withdrawCanReady, true);
    assert.match(craftOfferNotReadySuffix(offers[0]), /in bank/);
  });

  it("fails bagReady when gold is short", () => {
    const bag = [
      { name: "stick", q: 3 },
      { name: "leather", q: 1 },
    ];
    const offers = listCraftOffersForBagItem("bow", bag, { G, gold: 50 });
    assert.equal(offers[0].bagReady, false);
    assert.equal(craftOfferNotReadySuffix(offers[0]), " (need gold)");
  });

  it("names missing reagents in the not-ready suffix", () => {
    const bag = [{ name: "throwingstars", q: 1 }];
    const GStars = {
      ...G,
      items: {
        ...G.items,
        throwingstars: { name: "Throwing Stars" },
        essenceoffire: { name: "Fire Essence" },
        firestars: { name: "Fiery Throwing Stars" },
      },
      craft: {
        firestars: {
          cost: 180000,
          items: [
            [1, "throwingstars"],
            [1, "essenceoffire"],
          ],
        },
        snowflakes: {
          cost: 20000,
          items: [
            [1, "throwingstars"],
            [1, "essenceoffrost"],
          ],
        },
      },
    } as unknown as GLike;
    const w = (globalThis as { window?: { G?: unknown | null } }).window;
    const prevG = w ? w.G : null;
    if (w) w.G = GStars;
    try {
      const offers = listCraftOffersForBagItem("throwingstars", bag, {
        G: GStars,
        gold: 1_000_000,
      });
      const fire = offers.find((o) => o.output === "firestars");
      assert.ok(fire);
      assert.equal(fire!.bagReady, false);
      assert.equal(
        craftOfferNotReadySuffix(fire!),
        " (need Fire Essence)",
      );
    } finally {
      if (w) w.G = prevG;
    }
  });
});

describe("station access", () => {
  it("finds craftsman coords", () => {
    const c = findNpcCoords("craftsman", G);
    assert.ok(c);
    assert.equal(c!.x, 100);
    assert.equal(c!.map, "main");
  });

  it("computer unlocks anywhere", () => {
    assert.equal(observingHasComputer([{ name: "computer" }]), true);
    const access = evaluateStationAccess(
      { map: "winterland", x: 0, y: 0 },
      {
        items: [{ name: "supercomputer" }],
        entity: { id: "1", map: "main", x: 0, y: 0 },
      },
    );
    assert.equal(access.ok, true);
    assert.equal(access.hasComputer, true);
  });

  it("range uses sell_dist", () => {
    const station = { map: "main", x: 0, y: 0, id: "craftsman" };
    const near = evaluateStationAccess(station, {
      items: [],
      entity: {
        id: "1",
        map: "main",
        x: STATION_SELL_DIST - 1,
        y: 0,
      },
    });
    assert.equal(near.ok, true);
    const far = evaluateStationAccess(station, {
      items: [],
      entity: {
        id: "1",
        map: "main",
        x: STATION_SELL_DIST + 50,
        y: 0,
      },
    });
    assert.equal(far.ok, false);
  });
});
