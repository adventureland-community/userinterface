import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { STOCK_BOTTOM_TOGGLE_HIDE } from "../src/host/commChrome/chromeCss";
import {
  DISCONNECT_OVERLAY_Z,
  disconnectBannerDetail,
  disconnectBannerLabel,
  isCommDisconnected,
  resetDisconnectOverlayForTests,
} from "../src/host/disconnectOverlay";

type Win = typeof globalThis & {
  window: typeof globalThis & {
    socket?: { id?: string; connected?: boolean; on: () => void };
    disconnect_reason?: string;
    disconnect?: () => void;
  };
};

function installWindow(): void {
  (globalThis as Win).window = globalThis as Win["window"];
}

describe("disconnect overlay", { concurrency: false }, () => {
  beforeEach(() => {
    installWindow();
    delete window.socket;
    delete window.disconnect_reason;
  });

  afterEach(() => {
    resetDisconnectOverlayForTests();
    delete window.socket;
    delete window.disconnect_reason;
  });

	it("labels limits as REJECTED", () => {
    assert.equal(disconnectBannerLabel(undefined), "DISCONNECTED");
    assert.equal(disconnectBannerLabel("limits"), "REJECTED");
    assert.equal(disconnectBannerLabel("blocked"), "DISCONNECTED");
  });

  it("explains known disconnect reasons", () => {
    assert.equal(disconnectBannerDetail(undefined), "");
    assert.equal(disconnectBannerDetail(""), "");
    assert.match(disconnectBannerDetail("limits"), /3 characters/);
    assert.match(disconnectBannerDetail("limitdc"), /Too many actions/);
    assert.match(disconnectBannerDetail("blocked"), /blocked/i);
    assert.equal(
      disconnectBannerDetail("Failed to check in. Your network might be too slow."),
      "Failed to check in. Your network might be too slow.",
    );
    assert.equal(disconnectBannerDetail("weird_code"), "weird_code");
  });

  it("does not treat first-load empty socket as a drop", () => {
    delete window.socket;
    assert.equal(isCommDisconnected(), false);
  });

  it("treats a dropped socket as disconnected after one was live", () => {
    window.socket = { id: "s1", on() {} };
    assert.equal(isCommDisconnected(), false);
    delete window.socket;
    assert.equal(isCommDisconnected(), true);
  });

  it("treats socket.connected === false as a drop", () => {
    window.socket = { id: "s1", connected: true, on() {} };
    assert.equal(isCommDisconnected(), false);
    window.socket = { id: "s1", connected: false, on() {} };
    assert.equal(isCommDisconnected(), true);
  });

  it("chrome hide rule keeps the DISCONNECTED gamebutton", () => {
    assert.equal(
      STOCK_BOTTOM_TOGGLE_HIDE,
      "#bottom > .gamebutton:not(.disconnected)",
    );
    assert.ok(DISCONNECT_OVERLAY_Z >= 2147483646);
  });
});
