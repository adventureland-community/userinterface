import assert from "node:assert/strict";
import { describe, it, beforeEach, after } from "node:test";
import {
  getLuckyUpgradePref,
  normalizeLuckySlot,
  normalizeLuckyUpgradePref,
  resolveLuckySlotForShrine,
  setLuckyUpgradePref,
} from "../src/lib/luckyUpgradePrefs";

const STORE_KEY = "al-comm-ui-lucky-upgrade-v1";

const store: Record<string, string> = {};
const prevLs = (globalThis as { localStorage?: Storage }).localStorage;
const prevWin = (globalThis as { window?: unknown }).window;

(globalThis as { localStorage: Storage }).localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: () => null,
  get length() {
    return Object.keys(store).length;
  },
} as Storage;

(globalThis as { window: unknown }).window = {
  observing: { name: "TestHero" },
  character: null,
};

after(() => {
  (globalThis as { localStorage?: Storage }).localStorage = prevLs;
  (globalThis as { window?: unknown }).window = prevWin;
});

describe("luckyUpgradePrefs", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("normalizes slot into bag bounds", () => {
    assert.equal(normalizeLuckySlot(-3), 0);
    assert.equal(normalizeLuckySlot(99, 41), 41);
    assert.equal(normalizeLuckySlot(7.9), 7);
    assert.equal(normalizeLuckySlot("12"), 12);
  });

  it("defaults disabled with slot 0", () => {
    assert.deepEqual(normalizeLuckyUpgradePref(null), {
      enabled: false,
      slot: 0,
    });
    assert.deepEqual(getLuckyUpgradePref("Hero"), {
      enabled: false,
      slot: 0,
    });
  });

  it("persists per character", () => {
    setLuckyUpgradePref({ enabled: true, slot: 9 }, "Alice");
    setLuckyUpgradePref({ enabled: false, slot: 3 }, "Bob");
    assert.deepEqual(getLuckyUpgradePref("Alice"), {
      enabled: true,
      slot: 9,
    });
    assert.deepEqual(getLuckyUpgradePref("Bob"), {
      enabled: false,
      slot: 3,
    });
    assert.equal(resolveLuckySlotForShrine("Alice"), 9);
    assert.equal(resolveLuckySlotForShrine("Bob"), null);
    assert.ok(store[STORE_KEY]);
  });

  it("patches partial updates", () => {
    setLuckyUpgradePref({ enabled: true, slot: 4 }, "Pat");
    setLuckyUpgradePref({ slot: 11 }, "Pat");
    assert.deepEqual(getLuckyUpgradePref("Pat"), {
      enabled: true,
      slot: 11,
    });
    setLuckyUpgradePref({ enabled: false }, "Pat");
    assert.equal(resolveLuckySlotForShrine("Pat"), null);
  });
});
