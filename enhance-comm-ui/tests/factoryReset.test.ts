import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearEcuKeysFromStorage,
  isEcuStorageKey,
  ECU_INDEXED_DB_NAMES,
} from "../src/lib/factoryReset";

function fakeStorage(initial: Record<string, string>): Storage {
  const map: Record<string, string> = { ...initial };
  const api: Storage = {
    get length() {
      return Object.keys(map).length;
    },
    key(i: number) {
      return Object.keys(map)[i] || null;
    },
    getItem(k: string) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem(k: string, v: string) {
      map[k] = String(v);
    },
    removeItem(k: string) {
      delete map[k];
    },
    clear() {
      const keys = Object.keys(map);
      for (let i = 0; i < keys.length; i++) delete map[keys[i]];
    },
  };
  return api;
}

describe("factoryReset", () => {
  it("recognizes ECU storage key prefixes", () => {
    assert.equal(isEcuStorageKey("ecu-viz-settings"), true);
    assert.equal(isEcuStorageKey("al-comm-ui-settings-v1"), true);
    assert.equal(isEcuStorageKey("ecu-trade-price-memory"), true);
    assert.equal(isEcuStorageKey("adventureland-something"), false);
    assert.equal(isEcuStorageKey("code_cache"), false);
  });

  it("clears only ECU keys from storage", () => {
    const store = fakeStorage({
      "ecu-viz-settings": "{}",
      "al-comm-ui-settings-v1": "{}",
      "adventureland-keep": "1",
      "other": "x",
    });
    const n = clearEcuKeysFromStorage(store);
    assert.equal(n, 2);
    assert.equal(store.getItem("ecu-viz-settings"), null);
    assert.equal(store.getItem("al-comm-ui-settings-v1"), null);
    assert.equal(store.getItem("adventureland-keep"), "1");
    assert.equal(store.getItem("other"), "x");
  });

  it("lists known IndexedDB caches", () => {
    assert.ok(ECU_INDEXED_DB_NAMES.indexOf("ecu-market-cache") >= 0);
    assert.ok(ECU_INDEXED_DB_NAMES.indexOf("ecu-mail-cache") >= 0);
    assert.ok(ECU_INDEXED_DB_NAMES.indexOf("ecu-bank-cache") >= 0);
    assert.ok(ECU_INDEXED_DB_NAMES.indexOf("ecu-meter-archive") >= 0);
  });
});
