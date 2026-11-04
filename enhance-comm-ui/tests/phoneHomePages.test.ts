import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activePhoneHomeScreen,
  clampPhoneHomePage,
  defaultPhoneHomeScreens,
  meterOnPhoneHomeScreen,
  normalizePhoneHomeScreens,
  panelOnPhoneHomeScreen,
  phoneHomeScreenIndices,
  stepPhoneHomePage,
  toggleMeterOnScreen,
  togglePanelOnScreen,
} from "../src/lib/phoneHomePages";

describe("phoneHomeScreens", () => {
  it("defaults to Home / Players / Coop", () => {
    const screens = defaultPhoneHomeScreens();
    assert.equal(screens.length, 3);
    assert.equal(screens[0].label, "Home");
    assert.deepEqual(screens[0].panels, []);
    assert.deepEqual(screens[0].meters, []);
    assert.ok(screens[1].panels.indexOf("players") >= 0);
    assert.ok(screens[2].meters.indexOf("meter-coop_v2") >= 0);
  });

  it("gates widgets per screen", () => {
    const screens = defaultPhoneHomeScreens();
    assert.equal(panelOnPhoneHomeScreen("players", screens[0]), false);
    assert.equal(panelOnPhoneHomeScreen("players", screens[1]), true);
    assert.equal(panelOnPhoneHomeScreen("chat", screens[0]), true);
    assert.equal(meterOnPhoneHomeScreen("meter-coop_v2", screens[0]), false);
    assert.equal(meterOnPhoneHomeScreen("meter-coop_v2", screens[2]), true);
  });

  it("steps pages like Samsung home", () => {
    const pages = phoneHomeScreenIndices(defaultPhoneHomeScreens());
    assert.deepEqual(pages, [0, 1, 2]);
    assert.equal(stepPhoneHomePage(0, pages, 1), 1);
    assert.equal(stepPhoneHomePage(2, pages, 1), 2);
    assert.equal(stepPhoneHomePage(2, pages, -1), 1);
    assert.equal(clampPhoneHomePage(9, pages), 2);
    assert.equal(activePhoneHomeScreen(defaultPhoneHomeScreens(), 1)?.id, "players");
  });

  it("toggles widgets onto the active screen", () => {
    let screens = defaultPhoneHomeScreens();
    screens = togglePanelOnScreen(screens, 0, "bossBar", true);
    assert.ok(screens[0].panels.indexOf("bossBar") >= 0);
    screens = toggleMeterOnScreen(screens, 0, "meter-damage", true);
    assert.ok(screens[0].meters.indexOf("meter-damage") >= 0);
    screens = normalizePhoneHomeScreens(screens);
    assert.equal(screens[0].panels.indexOf("chat"), -1);
  });
});
