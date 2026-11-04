import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONE_DOCK_CSS_VAR,
  PHONE_DOCK_FALLBACK_PX,
  PHONE_HUD_BOTTOM_CSS_VAR,
  PHONE_CHROME_FALLBACK_PX,
  layoutClampBottomPad,
  phoneHudBottomInsetPx,
} from "../src/lib/phoneChrome";

describe("phoneChrome", () => {
  it("exposes dock CSS var and fallback height", () => {
    assert.equal(PHONE_DOCK_CSS_VAR, "--ecu-phone-dock-h");
    assert.equal(PHONE_DOCK_FALLBACK_PX, 48);
    assert.equal(PHONE_HUD_BOTTOM_CSS_VAR, "--ecu-phone-hud-bottom");
    assert.equal(PHONE_CHROME_FALLBACK_PX, 120);
  });

  it("reports zero HUD inset when phone dock is off", () => {
    assert.equal(phoneHudBottomInsetPx(), 0);
    assert.equal(layoutClampBottomPad(), 0);
  });
});
