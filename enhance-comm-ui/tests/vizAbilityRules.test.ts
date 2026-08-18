/**
 * Per-ability overlay appearance rules.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { colorFromAbilityKey } from "../src/viz/abilityPhase";
import {
  formatHexColor,
  parseHexColor,
  patchVizAbilityRule,
  resetVizAbilityRules,
  resolveAbilityAppearance,
  resolveAbilityColor,
  resolveAbilityShowName,
  VIZ_ABILITY_RULES_KEY,
} from "../src/viz/vizAbilityRules";
import { DEFAULT_VIZ_SETTINGS } from "../src/viz/vizSettings";

type Win = typeof globalThis & {
  localStorage?: Storage;
};

function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Win).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

afterEach(() => {
  delete (globalThis as Win).localStorage;
});

describe("vizAbilityRules", () => {
  it("parses and formats hex colors", () => {
    assert.equal(parseHexColor("#ff8800"), 0xff8800);
    assert.equal(parseHexColor("aabbcc"), 0xaabbcc);
    assert.equal(parseHexColor("nope"), undefined);
    assert.equal(formatHexColor(0xff8800), "#ff8800");
  });

  it("uses global abilityName default when no per-ability override", () => {
    installLocalStorage();
    const off = { ...DEFAULT_VIZ_SETTINGS, "entity.abilityName": false };
    const on = { ...DEFAULT_VIZ_SETTINGS, "entity.abilityName": true };
    assert.equal(resolveAbilityShowName("anger", off, {}), false);
    assert.equal(resolveAbilityShowName("anger", on, {}), true);
  });

  it("per-ability showName overrides global default", () => {
    installLocalStorage();
    const settings = { ...DEFAULT_VIZ_SETTINGS, "entity.abilityName": false };
    const rules = { anger: { showName: true } };
    assert.equal(resolveAbilityShowName("anger", settings, rules), true);
    assert.equal(resolveAbilityShowName("warpstomp", settings, rules), false);
  });

  it("per-ability color overrides hash color", () => {
    installLocalStorage();
    assert.equal(resolveAbilityColor("anger", {}), colorFromAbilityKey("anger"));
    assert.equal(resolveAbilityColor("anger", { anger: { color: 0x112233 } }), 0x112233);
  });

  it("persists rules to localStorage", () => {
    installLocalStorage();
    patchVizAbilityRule("anger", { showName: true, color: 0xabcdef });
    const raw = (globalThis as Win).localStorage!.getItem(VIZ_ABILITY_RULES_KEY);
    assert.ok(raw && raw.includes("anger"));
    const appearance = resolveAbilityAppearance("anger", DEFAULT_VIZ_SETTINGS);
    assert.equal(appearance.showName, true);
    assert.equal(appearance.color, 0xabcdef);
    resetVizAbilityRules();
    assert.equal(
      (globalThis as Win).localStorage!.getItem(VIZ_ABILITY_RULES_KEY),
      null,
    );
  });
});
