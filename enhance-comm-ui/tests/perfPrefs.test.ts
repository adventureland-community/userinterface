import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  liteAwarePanelVisible,
  normalizeHudDensity,
  resolveLiteHud,
  scalePollMs,
} from "../src/lib/perfPrefs";

describe("perfPrefs", () => {
  it("normalizeHudDensity falls back to auto", () => {
    assert.equal(normalizeHudDensity("lite"), "lite");
    assert.equal(normalizeHudDensity("nope"), "auto");
  });

  it("resolveLiteHud respects density and phone profile", () => {
    assert.equal(resolveLiteHud("lite", "desktop"), true);
    assert.equal(resolveLiteHud("full", "phone"), false);
    assert.equal(resolveLiteHud("auto", "phone"), true);
    assert.equal(resolveLiteHud("auto", "desktop"), false);
    assert.equal(resolveLiteHud("auto", "tablet"), false);
  });

  it("scalePollMs stretches data polls on phone only", () => {
    assert.equal(scalePollMs(2000, "data", "desktop"), 2000);
    assert.equal(scalePollMs(2000, "data", "phone"), 5000);
    assert.equal(scalePollMs(500, "data", "phone"), 1250);
    assert.equal(scalePollMs(100, "ui", "phone"), 150);
  });

  it("liteAwarePanelVisible hides lite-default-off unless overridden", () => {
    const panelVisible = {
      bossBar: true,
      abilityTimeline: true,
      minimap: true,
      paperdoll: true,
      bag: true,
    };
    assert.equal(
      liteAwarePanelVisible("bossBar", panelVisible, { lite: true }),
      true,
    );
    assert.equal(
      liteAwarePanelVisible("abilityTimeline", panelVisible, { lite: true }),
      false,
    );
    assert.equal(
      liteAwarePanelVisible("abilityTimeline", panelVisible, {
        lite: true,
        phoneHudVisible: { abilityTimeline: true },
      }),
      true,
    );
    assert.equal(
      liteAwarePanelVisible("abilityTimeline", panelVisible, { lite: false }),
      true,
    );
    assert.equal(
      liteAwarePanelVisible("minimap", panelVisible, {
        lite: true,
        phoneHudVisible: { minimap: false },
      }),
      false,
    );
    assert.equal(
      liteAwarePanelVisible("paperdoll", panelVisible, { lite: true }),
      false,
    );
    assert.equal(
      liteAwarePanelVisible("bag", panelVisible, { lite: true }),
      false,
    );
  });
});
