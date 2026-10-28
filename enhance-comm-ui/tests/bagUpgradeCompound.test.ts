import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  calculateItemGrade,
  compoundOfferForBagItem,
  defaultCompoundPartners,
  findCompoundPartners,
  listCompatibleScrollsInBag,
  listOfferingsInBag,
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
    scroll0: { name: "Upgrade Scroll", type: "uscroll", grade: 0 },
    scroll1: { name: "High Upgrade Scroll", type: "uscroll", grade: 1 },
    cscroll0: { name: "Compound Scroll", type: "cscroll", grade: 0 },
    cscroll1: { name: "High Compound Scroll", type: "cscroll", grade: 1 },
    offering: { name: "Offering", type: "offering", grade: 0 },
    offeringp: { name: "Primordial Essence", type: "offering", grade: 1 },
  },
  maps: {
    main: {
      upgrade: { map: "main", x: 10, y: 20, id: "newupgrade" },
      compound: { map: "main", x: 30, y: 40, id: "newupgrade" },
    },
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
    assert.equal(offer!.scrolls.length, 1);
    assert.equal(offer!.offerings.length, 1);
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
