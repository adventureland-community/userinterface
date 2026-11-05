import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  calculateItemGrade,
  compoundOfferForBagItem,
  defaultCompoundPartners,
  findCompoundPartners,
  formatShrineBatchSummary,
  listCompatibleScrollsInBag,
  listOfferingsInBag,
  listScrollsForShrine,
  planShrineBatch,
  upgradeOfferForBagItem,
} from "../src/lib/bagUpgradeCompound";
import type { GLike } from "../src/host/globals";
import {
  buildCompoundScript,
  buildUpgradeScript,
} from "../src/host/stationCommands";

const prevWindow = (globalThis as { window?: unknown }).window;
before(() => {
  (globalThis as { window?: unknown }).window = {
    observing: null,
    G: null,
  };
});
after(() => {
  if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = prevWindow;
});

const G = {
  items: {
    helmet: {
      name: "Helmet",
      upgrade: true,
      grades: [7, 8, 9, 10],
    },
    ringsj: {
      name: "Skull Ring",
      compound: true,
      grades: [3, 4, 5, 6],
    },
    scroll0: {
      name: "Upgrade Scroll",
      type: "uscroll",
      grade: 0,
      buy: true,
      g: 1000,
    },
    scroll1: {
      name: "High Upgrade Scroll",
      type: "uscroll",
      grade: 1,
      buy: true,
      g: 40000,
    },
    cscroll0: {
      name: "Compound Scroll",
      type: "cscroll",
      grade: 0,
      buy: true,
      g: 6400,
    },
    cscroll1: {
      name: "High Compound Scroll",
      type: "cscroll",
      grade: 1,
      buy: true,
      g: 240000,
    },
    offering: {
      name: "Offering",
      type: "offering",
      grade: 0,
      buy: true,
      g: 999999,
    },
    offeringp: { name: "Primordial Essence", type: "offering", grade: 1 },
  },
  maps: {
    main: {
      upgrade: { map: "main", x: 10, y: 20, id: "newupgrade" },
      compound: { map: "main", x: 30, y: 40, id: "newupgrade" },
      items: {
        scroll0: [{ map: "main", x: -465, y: -71, id: "scrolls" }],
        scroll1: [{ map: "main", x: -465, y: -71, id: "scrolls" }],
        cscroll0: [{ map: "main", x: -465, y: -71, id: "scrolls" }],
      },
    },
  },
  npcs: {
    scrolls: { items: ["scroll0", "scroll1", "cscroll0", "cscroll1"] },
  },
} as unknown as GLike;

describe("calculateItemGrade", () => {
  it("uses grades thresholds", () => {
    const def = { upgrade: true, grades: [7, 8, 9, 10] };
    assert.equal(calculateItemGrade(def, 0), 0);
    assert.equal(calculateItemGrade(def, 6), 0);
    assert.equal(calculateItemGrade(def, 7), 1);
    assert.equal(calculateItemGrade(def, 8), 2);
    assert.equal(calculateItemGrade(def, 9), 3);
    assert.equal(calculateItemGrade(def, 10), 4);
  });
});

describe("scroll / offering listing", () => {
  it("lists compatible upgrade scrolls and marks recommended", () => {
    const bag = [
      { name: "helmet", level: 7 },
      { name: "scroll0", q: 5 },
      { name: "scroll1", q: 2 },
      { name: "cscroll0", q: 9 },
      { name: "offering", q: 1 },
    ];
    const scrolls = listCompatibleScrollsInBag(
      bag,
      G.items!.helmet as any,
      1,
      "upgrade",
      G,
    );
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].name, "scroll1");
    assert.equal(scrolls[0].recommended, true);
    const offerings = listOfferingsInBag(bag, G);
    assert.equal(offerings.length, 1);
    assert.equal(offerings[0].name, "offering");
  });

  it("lists cscrolls for compound", () => {
    const bag = [
      { name: "ringsj", level: 0 },
      { name: "cscroll0", q: 3 },
      { name: "scroll0", q: 3 },
    ];
    const scrolls = listCompatibleScrollsInBag(
      bag,
      G.items!.ringsj as any,
      0,
      "compound",
      G,
    );
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].name, "cscroll0");
  });

  it("adds vendor-buy scrolls when bag has none", () => {
    const bag = [{ name: "helmet", level: 2 }];
    const scrolls = listScrollsForShrine(
      bag,
      G.items!.helmet as any,
      0,
      "upgrade",
      G,
    );
    assert.ok(scrolls.length >= 1);
    const buy = scrolls.find((s) => s.buy && s.name === "scroll0");
    assert.ok(buy);
    assert.equal(buy!.slot, -1);
    assert.equal(buy!.buyPrice, 1000);
    assert.equal(buy!.recommended, true);
  });

  it("does not duplicate vendor scroll when already in bag", () => {
    const bag = [
      { name: "helmet", level: 2 },
      { name: "scroll0", q: 2 },
    ];
    const scrolls = listScrollsForShrine(
      bag,
      G.items!.helmet as any,
      0,
      "upgrade",
      G,
    );
    const scroll0 = scrolls.filter((s) => s.name === "scroll0");
    assert.equal(scroll0.length, 1);
    assert.equal(scroll0[0].buy, undefined);
    assert.equal(scroll0[0].slot, 1);
  });
});

describe("upgrade / compound offers", () => {
  it("builds upgrade offer with scrolls", () => {
    const bag = [
      { name: "helmet", level: 2 },
      { name: "scroll0", q: 4 },
      { name: "offeringp", q: 1 },
    ];
    const offer = upgradeOfferForBagItem(
      bag[0],
      0,
      bag,
      G,
    );
    assert.ok(offer);
    assert.equal(offer!.grade, 0);
    assert.ok(offer!.scrolls.some((s) => s.name === "scroll0" && !s.buy));
    assert.ok(offer!.offerings.some((o) => o.name === "offeringp"));
    assert.ok(offer!.station);
    assert.equal(offer!.station!.id, "newupgrade");
  });

  it("finds compound partners and defaults first two", () => {
    const bag = [
      { name: "ringsj", level: 1 },
      { name: "ringsj", level: 1 },
      { name: "ringsj", level: 1 },
      { name: "ringsj", level: 2 },
      { name: "cscroll0", q: 2 },
    ];
    const partners = findCompoundPartners(bag, 0, "ringsj", 1);
    assert.equal(partners.length, 2);
    assert.deepEqual(
      partners.map((p) => p.slot),
      [1, 2],
    );
    const mixedTitleBag = [
      { name: "ringsj", level: 1 },
      { name: "ringsj", level: 1, p: "shiny" },
      { name: "ringsj", level: 1, p: "shiny" },
      { name: "ringsj", level: 1 },
    ];
    assert.deepEqual(
      findCompoundPartners(mixedTitleBag, 1, "ringsj", 1, "shiny").map(
        (p) => p.slot,
      ),
      [2],
    );
    assert.deepEqual(
      findCompoundPartners(mixedTitleBag, 0, "ringsj", 1, null).map(
        (p) => p.slot,
      ),
      [3],
    );
    const pair = defaultCompoundPartners(partners);
    assert.ok(pair);
    assert.equal(pair![0].slot, 1);
    assert.equal(pair![1].slot, 2);

    const titled = [
      { slot: 1, name: "ringsj", level: 1 },
      { slot: 2, name: "ringsj", level: 1, p: "shiny" },
      { slot: 3, name: "ringsj", level: 1, p: "shiny" },
    ];
    const preferTitle = defaultCompoundPartners(titled, {
      slot: 0,
      name: "ringsj",
      level: 1,
      p: "shiny",
    });
    assert.ok(preferTitle);
    assert.equal(preferTitle![0].slot, 2);
    assert.equal(preferTitle![1].slot, 3);

    const offer = compoundOfferForBagItem(bag[0], 0, bag, G);
    assert.ok(offer);
    assert.equal(offer!.partners.length, 2);
    assert.equal(offer!.scrolls[0].name, "cscroll0");
  });
});

describe("planShrineBatch", () => {
  it("caps upgrade attempts by bag scroll qty", () => {
    const plan = planShrineBatch({
      mode: "upgrade",
      peerCount: 5,
      scroll: { name: "scroll0", displayName: "Upgrade Scroll", q: 2 },
      gold: 0,
    });
    assert.equal(plan.wantAttempts, 5);
    assert.equal(plan.attempts, 2);
    assert.equal(plan.scrollUse, 2);
    assert.equal(plan.scrollHave, 2);
    assert.equal(plan.limitedBy, "scroll");
    assert.match(
      formatShrineBatchSummary(plan, {
        mode: "upgrade",
        scroll: { name: "scroll0", displayName: "Upgrade Scroll", q: 2 },
      }),
      /2 of 5 upgrades/,
    );
    assert.match(
      formatShrineBatchSummary(plan, {
        mode: "upgrade",
        scroll: { name: "scroll0", displayName: "Upgrade Scroll", q: 2 },
      }),
      /use 2× Upgrade Scroll \(have 2\)/,
    );
  });

  it("caps compound sets by peers then offerings", () => {
    const byPeers = planShrineBatch({
      mode: "compound",
      peerCount: 8,
      scroll: { name: "cscroll0", q: 10 },
    });
    assert.equal(byPeers.wantAttempts, 2);
    assert.equal(byPeers.attempts, 2);
    assert.equal(byPeers.limitedBy, "peers");

    const byOffer = planShrineBatch({
      mode: "compound",
      peerCount: 9,
      scroll: { name: "cscroll0", q: 10 },
      offering: { name: "offering", displayName: "Offering", q: 1 },
    });
    assert.equal(byOffer.wantAttempts, 3);
    assert.equal(byOffer.attempts, 1);
    assert.equal(byOffer.offeringUse, 1);
    assert.equal(byOffer.limitedBy, "offering");
  });

  it("caps buy materials by gold", () => {
    const plan = planShrineBatch({
      mode: "upgrade",
      peerCount: 4,
      scroll: {
        name: "scroll0",
        displayName: "Upgrade Scroll",
        q: 0,
        buy: true,
        buyPrice: 1000,
      },
      gold: 2500,
    });
    assert.equal(plan.attempts, 2);
    assert.equal(plan.goldNeed, 2000);
    assert.equal(plan.limitedBy, "gold");
    assert.match(
      formatShrineBatchSummary(plan, {
        mode: "upgrade",
        scroll: {
          name: "scroll0",
          displayName: "Upgrade Scroll",
          q: 0,
          buy: true,
          buyPrice: 1000,
        },
      }),
      /buy 2× Upgrade Scroll/,
    );
  });

  it("returns zero attempts when materials are empty", () => {
    const plan = planShrineBatch({
      mode: "upgrade",
      peerCount: 3,
      scroll: { name: "scroll0", q: 0 },
    });
    assert.equal(plan.attempts, 0);
    assert.equal(plan.wantAttempts, 3);
    assert.equal(plan.limitedBy, "scroll");
  });

  it("buyExtras tops up bag scrolls until peers or gold run out", () => {
    const plan = planShrineBatch({
      mode: "upgrade",
      peerCount: 5,
      scroll: {
        name: "scroll0",
        displayName: "Upgrade Scroll",
        q: 2,
        canBuy: true,
        buyPrice: 1000,
      },
      gold: 3500,
      buyExtras: true,
    });
    assert.equal(plan.wantAttempts, 5);
    assert.equal(plan.attempts, 5);
    assert.equal(plan.scrollBuy, 3);
    assert.equal(plan.goldNeed, 3000);
    assert.equal(plan.limitedBy, "peers");
    assert.match(
      formatShrineBatchSummary(plan, {
        mode: "upgrade",
        scroll: {
          name: "scroll0",
          displayName: "Upgrade Scroll",
          q: 2,
          canBuy: true,
          buyPrice: 1000,
        },
      }),
      /use 2 \+ buy 3× Upgrade Scroll/,
    );

    const goldLimited = planShrineBatch({
      mode: "upgrade",
      peerCount: 5,
      scroll: {
        name: "scroll0",
        q: 1,
        canBuy: true,
        buyPrice: 1000,
      },
      gold: 2500,
      buyExtras: true,
    });
    assert.equal(goldLimited.attempts, 3);
    assert.equal(goldLimited.scrollBuy, 2);
    assert.equal(goldLimited.limitedBy, "gold");
  });
});

describe("upgrade / compound scripts", () => {
  it("emits upgrade with optional null offering", () => {
    const script = buildUpgradeScript(
      { slot: 0, name: "helmet", level: 2 },
      { slot: 3, name: "scroll0", q: 4 },
      null,
      { map: "main", x: 10, y: 20, id: "upgrade" },
    );
    assert.match(script, /await upgrade\(__uItem,__uScroll,__uOffering,true\)/);
    assert.match(script, /await upgrade\(__uItem,__uScroll,__uOffering\);/);
    assert.match(script, /upgrade chance/);
    assert.match(script, /__uOffering=null/);
    assert.match(script, /smart_move/);
  });

  it("buys vendor scroll before upgrade when buyScroll is set", () => {
    const script = buildUpgradeScript(
      { slot: 0, name: "helmet", level: 2 },
      { slot: -1, name: "scroll0" },
      null,
      { map: "main", x: 10, y: 20, id: "upgrade" },
      { buyScroll: "scroll0" },
    );
    assert.match(script, /await buy\(\"scroll0\",1\)/);
    assert.match(script, /buy ok/);
    assert.match(script, /await upgrade\(__uItem,__uScroll,__uOffering\)/);
  });

  it("casts checked merchant skills before upgrade", () => {
    const script = buildUpgradeScript(
      { slot: 0, name: "helmet", level: 2 },
      { slot: 3, name: "scroll0", q: 4 },
      null,
      null,
      { massproduction: true, massproductionpp: true },
    );
    assert.match(script, /use_skill\(\"massproduction\"\)/);
    assert.match(script, /use_skill\(\"massproductionpp\"\)/);
    assert.doesNotMatch(script, /smart_move/);
  });

  it("emits compound with three items", () => {
    const script = buildCompoundScript(
      [
        { slot: 0, name: "ringsj", level: 1 },
        { slot: 1, name: "ringsj", level: 1 },
        { slot: 2, name: "ringsj", level: 1 },
      ],
      { slot: 5, name: "cscroll0", q: 2 },
      { slot: 6, name: "offering", q: 1 },
      { map: "main", x: 30, y: 40, id: "compound" },
    );
    assert.match(
      script,
      /await compound\(__c0,__c1,__c2,__cScroll,__cOffering,true\)/,
    );
    assert.match(
      script,
      /await compound\(__c0,__c1,__c2,__cScroll,__cOffering\);/,
    );
    assert.match(script, /compound chance/);
    assert.match(script, /duplicate slots/);
  });
});
