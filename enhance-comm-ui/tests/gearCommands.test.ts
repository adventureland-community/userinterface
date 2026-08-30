import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEquipScript,
  buildInvSwapScript,
  buildUnequipScript,
} from "../src/host/gearCommands";
import {
  canEquipItemToSlot,
  equipSlotsForItemName,
  formatGearSlotLabel,
} from "../src/lib/gearSlots";
import { canEditObservedBag, canEditObservedGear, isObservedSelf } from "../src/host/gearObserved";

describe("gear command scripts", () => {
  it("builds equip script with fingerprint guard and slot", () => {
    const script = buildEquipScript(
      { slot: 3, name: "staff", level: 10 },
      "mainhand",
    );
    assert.match(script, /await equip\(__slot,"mainhand"\)/);
    assert.match(script, /staff/);
    assert.match(script, /item mismatch/);
  });

  it("builds unequip script and blocks elixir", () => {
    assert.match(buildUnequipScript("chest"), /await unequip\("chest"\)/);
    assert.match(buildUnequipScript("elixir"), /Cannot unequip elixir/);
  });

  it("skips slot guard for hidden stand listings", () => {
    const script = buildUnequipScript("trade5", { skipSlotGuard: true });
    assert.match(script, /await unequip\("trade5"\)/);
    assert.doesNotMatch(script, /slot empty/);
  });

  it("builds inventory swap script", () => {
    const script = buildInvSwapScript(2, 5);
    assert.match(script, /await swap\(2,5\)/);
  });
});

describe("gear slot labels", () => {
  it("formats known slots", () => {
    assert.equal(formatGearSlotLabel("mainhand"), "Main hand");
    assert.equal(formatGearSlotLabel("ring1"), "Ring 1");
  });

  it("returns empty slots for unknown item without G", () => {
    if (typeof window === "undefined") {
      // Node test runner — G lives on window in browser.
      return;
    }
    assert.deepEqual(equipSlotsForItemName("__no_such_item__"), []);
  });

  it("checks equip target slot membership", () => {
    if (typeof window === "undefined") return;
    (globalThis as any).window = {
      G: { items: { staff: { type: "weapon", name: "Staff" } } },
    };
    assert.equal(canEquipItemToSlot("staff", "mainhand"), true);
    assert.equal(canEquipItemToSlot("staff", "helmet"), false);
  });
});

describe("observed self guard", () => {
  it("matches observing id only", () => {
    if (typeof window === "undefined") return;
    const prev = window.observing;
    (window as any).observing = { id: "abc", name: "hero" };
    try {
      assert.equal(isObservedSelf({ id: "abc" }), true);
      assert.equal(isObservedSelf({ id: "xyz" }), false);
      assert.equal(canEditObservedGear({ id: "abc" }), true);
      assert.equal(canEditObservedGear({ id: "abc" }, true), false);
      assert.equal(canEditObservedBag(), true);
    } finally {
      (window as any).observing = prev;
    }
  });
});
