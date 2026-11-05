import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVendorSellScript,
  canVendorSellItem,
  defaultVendorSellStation,
  itemIsCash,
  itemIsLocked,
} from "../src/host/vendorSellCommands";
import {
  findVendorSellStation,
  isGoldMerchantNpc,
  listVendorSellStations,
} from "../src/lib/stationAccess";

const MERCHANT_G = {
  npcs: {
    basics: {
      role: "merchant",
      name: "Gabriel",
      items: ["helmet", "shoes", "blade"],
    },
    scrolls: {
      role: "merchant",
      name: "Lucas",
      items: ["scroll0", "cscroll0"],
    },
    fancypots: {
      role: "merchant",
      name: "Ernis",
      items: ["hpot0", "mpot0"],
    },
    citizen4: { role: "citizen", name: "Angel" },
    antip2w: {
      role: "premium",
      name: "Mr. Dworf",
      items: ["cosmo0", "cosmo1"],
    },
    armors: { role: "merchant", items: [] },
  },
  maps: {
    main: {
      npcs: [
        { id: "scrolls", position: [-464, -96] },
        { id: "fancypots", position: [-35, -162] },
        { id: "basics", position: [-89, -165] },
        { id: "citizen4", position: [40, -100] },
      ],
    },
    winter_inn: {
      npcs: [{ id: "wbartender", position: [0, 0] }],
    },
    halloween: {
      npcs: [{ id: "fancypots", position: [10, 10] }],
    },
  },
  items: { hpot0: { g: 20 } },
};

// winter bartender is a gold merchant on another map
(MERCHANT_G.npcs as any).wbartender = {
  role: "merchant",
  name: "Warin",
  items: ["hpot0", "mpot0"],
};

describe("vendor sell", () => {
  it("builds sell script with quantity and station travel", () => {
    const prev = (globalThis as any).window;
    (globalThis as any).window = {
      G: MERCHANT_G,
      observing: { items: [{ name: "hpot0", q: 50 }] },
    };
    try {
      const script = buildVendorSellScript(
        { slot: 3, name: "hpot0", q: 50 },
        12,
      );
      assert.match(script, /await sell\(__slot,12\)/);
      assert.match(script, /smart_move/);
      assert.match(script, /basics|scrolls|fancypots/);
      assert.match(script, /vendor-sell ok/);
    } finally {
      if (prev === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prev;
    }
  });

  it("skips all travel when observing bag has a computer", () => {
    const prev = (globalThis as any).window;
    (globalThis as any).window = {
      G: MERCHANT_G,
      observing: {
        items: [{ name: "computer" }, { name: "hpot0", q: 50 }],
      },
    };
    try {
      const script = buildVendorSellScript(
        { slot: 1, name: "hpot0", q: 50 },
        5,
      );
      assert.match(script, /await sell\(__slot,5\)/);
      assert.doesNotMatch(script, /smart_move/);
      assert.match(script, /computer/);
    } finally {
      if (prev === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prev;
    }
  });

  it("omits quantity arg for single-item sell", () => {
    const script = buildVendorSellScript(
      { slot: 0, name: "shield", level: 1 },
      1,
      null,
    );
    assert.match(script, /await sell\(__slot\)/);
    assert.doesNotMatch(script, /await sell\(__slot,/);
  });

  it("rejects non-positive quantity", () => {
    const script = buildVendorSellScript({ slot: 0, name: "hpot0" }, 0);
    assert.match(script, /invalid quantity/);
  });

  it("isGoldMerchantNpc requires role merchant with stock", () => {
    assert.equal(isGoldMerchantNpc(MERCHANT_G.npcs.basics), true);
    assert.equal(isGoldMerchantNpc(MERCHANT_G.npcs.citizen4), false);
    assert.equal(isGoldMerchantNpc(MERCHANT_G.npcs.antip2w), false);
    assert.equal(isGoldMerchantNpc(MERCHANT_G.npcs.armors), false);
  });

  it("lists merchants from map.npcs and skips Angel / cash shops", () => {
    const stations = listVendorSellStations(MERCHANT_G as any);
    const ids = stations.map((s) => s.id).sort();
    assert.ok(ids.includes("basics"));
    assert.ok(ids.includes("scrolls"));
    assert.ok(ids.includes("fancypots"));
    assert.ok(ids.includes("wbartender"));
    assert.ok(!ids.includes("citizen4"));
    assert.ok(!ids.includes("antip2w"));
  });

  it("picks nearest same-map merchant for the observer", () => {
    const st = findVendorSellStation(MERCHANT_G as any, {
      map: "main",
      x: -40,
      y: -160,
    });
    assert.ok(st);
    // Near fancypots (-35,-162) / basics (-89,-165) — fancypots closer.
    assert.equal(st!.id, "fancypots");
    assert.equal(st!.map, "main");
  });

  it("stays on current map instead of hopping to another merchant map", () => {
    const st = findVendorSellStation(MERCHANT_G as any, {
      map: "winter_inn",
      x: 100,
      y: 100,
    });
    assert.ok(st);
    assert.equal(st!.map, "winter_inn");
    assert.equal(st!.id, "wbartender");
  });

  it("defaultVendorSellStation prefers basics when no entity", () => {
    const prev = (globalThis as any).window;
    (globalThis as any).window = { G: MERCHANT_G };
    try {
      const st = defaultVendorSellStation();
      assert.ok(st);
      assert.equal(st!.id, "basics");
    } finally {
      if (prev === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prev;
    }
  });

  it("gates locked / cash / zero-value items", () => {
    const prev = (globalThis as any).window;
    (globalThis as any).window = {
      G: {
        items: {
          hpot0: { g: 20 },
          shell: { g: 1, cash: true },
          worthless: { g: 0 },
        },
      },
    };
    try {
      assert.equal(itemIsLocked({ name: "hpot0", l: "l" }), true);
      assert.equal(itemIsLocked({ name: "hpot0" }), false);
      assert.equal(itemIsCash("shell"), true);
      assert.equal(itemIsCash("hpot0"), false);
      assert.equal(
        canVendorSellItem({ slot: 0, name: "hpot0" }, { name: "hpot0" }),
        true,
      );
      assert.equal(
        canVendorSellItem(
          { slot: 0, name: "hpot0" },
          { name: "hpot0", l: "l" },
        ),
        false,
      );
      assert.equal(
        canVendorSellItem({ slot: 0, name: "shell" }, { name: "shell" }),
        false,
      );
      assert.equal(
        canVendorSellItem(
          { slot: 0, name: "worthless" },
          { name: "worthless" },
        ),
        false,
      );
    } finally {
      if (prev === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prev;
    }
  });
});
