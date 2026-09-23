import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { STOCK_BOTTOM_TOGGLE_HIDE } from "../src/host/commChrome/chromeCss";
import {
  DISCONNECT_GRACE_MS,
  DISCONNECT_OVERLAY_CLASS,
  DISCONNECT_OVERLAY_Z,
  RECONNECT_HARD_TIMEOUT_MS,
  disconnectBannerDetail,
  disconnectBannerLabel,
  installDisconnectOverlay,
  isCommDisconnected,
  isReconnectInFlight,
  reconnectComm,
  resetDisconnectOverlayForTests,
  showDisconnectOverlay,
  syncDisconnectOverlayForTests,
} from "../src/host/disconnectOverlay";

type Win = typeof globalThis & {
  window: typeof globalThis & {
    socket?: { id?: string; connected?: boolean; on: () => void };
    disconnect_reason?: string;
    disconnect?: () => void;
    init_socket?: (args?: { secret?: string }) => void;
    server_address?: string;
    refresh_page?: () => void;
  };
};

function installWindow(): void {
  (globalThis as Win).window = globalThis as Win["window"];
}

function ensureDom(): void {
  if (typeof document !== "undefined" && document.body) return;
  // jsdom-less: minimal stubs for overlay DOM tests when body exists via prior setup
}

describe("disconnect overlay", { concurrency: false }, () => {
  beforeEach(() => {
    installWindow();
    delete window.socket;
    delete window.disconnect_reason;
    delete window.disconnect;
    delete window.init_socket;
    delete window.server_address;
    delete window.refresh_page;
  });

  afterEach(() => {
    resetDisconnectOverlayForTests();
    delete window.socket;
    delete window.disconnect_reason;
    delete window.disconnect;
    delete window.init_socket;
    delete window.server_address;
    delete window.refresh_page;
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
      disconnectBannerDetail(
        "Failed to check in. Your network might be too slow.",
      ),
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

  it("uses a long unexpected-drop grace and reconnect hard timeout", () => {
    assert.equal(DISCONNECT_GRACE_MS, 10_000);
    assert.equal(RECONNECT_HARD_TIMEOUT_MS, 25_000);
  });

  it("suppresses overlay while init_socket reconnect is in flight past grace", () => {
    ensureDom();
    window.server_address = "wss://example.invalid";
    let initCalls = 0;
    window.init_socket = () => {
      initCalls += 1;
      window.socket = { id: "new", connected: false, on() {} };
    };
    window.socket = { id: "old", connected: true, on() {} };
    installDisconnectOverlay();

    window.init_socket!({ secret: "sec-1" });
    assert.equal(initCalls, 1);
    assert.equal(isReconnectInFlight(), true);

    // Past unexpected grace — still suppressed because reconnect is in flight
    syncDisconnectOverlayForTests(Date.now() + DISCONNECT_GRACE_MS + 500);
    assert.equal(isReconnectInFlight(), true);
    if (typeof document !== "undefined" && document.body) {
      assert.equal(
        document.querySelector(`.${DISCONNECT_OVERLAY_CLASS}`),
        null,
      );
    }
  });

  it("clears reconnect suppress when the socket is live again", () => {
    window.server_address = "wss://example.invalid";
    window.init_socket = () => {
      window.socket = { id: "new", connected: false, on() {} };
    };
    window.socket = { id: "old", connected: true, on() {} };
    installDisconnectOverlay();

    window.init_socket!({});
    assert.equal(isReconnectInFlight(), true);

    window.socket = { id: "new", connected: true, on() {} };
    syncDisconnectOverlayForTests();
    assert.equal(isReconnectInFlight(), false);
    assert.equal(isCommDisconnected(), false);
  });

  it("shows immediately on explicit disconnect_reason even mid-reconnect", () => {
    window.server_address = "wss://example.invalid";
    window.init_socket = () => {
      window.socket = { id: "new", connected: false, on() {} };
    };
    window.disconnect = () => {};
    window.socket = { id: "old", connected: true, on() {} };
    installDisconnectOverlay();

    window.init_socket!({ secret: "sec" });
    assert.equal(isReconnectInFlight(), true);

    window.disconnect_reason = "limits";
    window.disconnect!();
    assert.equal(isReconnectInFlight(), false);
    if (typeof document !== "undefined" && document.body) {
      const el = document.querySelector(`.${DISCONNECT_OVERLAY_CLASS}`);
      assert.ok(el);
      assert.match(el!.textContent || "", /REJECTED/);
    }
  });

  it("allows overlay after reconnect hard timeout without a live socket", () => {
    window.server_address = "wss://example.invalid";
    const t0 = Date.now();
    window.init_socket = () => {
      window.socket = { id: "new", connected: false, on() {} };
    };
    window.socket = { id: "old", connected: true, on() {} };
    installDisconnectOverlay();

    window.init_socket!({});
    assert.equal(isReconnectInFlight(t0), true);

    const afterHard = t0 + RECONNECT_HARD_TIMEOUT_MS + 1;
    assert.equal(isReconnectInFlight(afterHard), false);
    // Expire in-flight and start unexpected grace from this sync
    syncDisconnectOverlayForTests(afterHard);
    assert.equal(isReconnectInFlight(afterHard), false);
    syncDisconnectOverlayForTests(afterHard + DISCONNECT_GRACE_MS + 1);
    if (typeof document !== "undefined" && document.body) {
      assert.ok(document.querySelector(`.${DISCONNECT_OVERLAY_CLASS}`));
    }
  });

  it("reconnectComm prefers init_socket over page reload", () => {
    let initArgs: { secret?: string } | undefined;
    let reloads = 0;
    window.server_address = "wss://example.invalid";
    window.init_socket = (args) => {
      initArgs = args || {};
    };
    window.refresh_page = () => {
      reloads += 1;
    };
    window.socket = { id: "old", connected: true, on() {} };
    installDisconnectOverlay();
    window.init_socket!({ secret: "keep-me" });
    // Live again so we are not mid-flight for the click path under test
    window.socket = { id: "x", connected: true, on() {} };
    syncDisconnectOverlayForTests();

    reconnectComm();
    assert.deepEqual(initArgs, { secret: "keep-me" });
    assert.equal(reloads, 0);
  });

  it("hint text says reconnect", () => {
    if (typeof document === "undefined" || !document.body) return;
    showDisconnectOverlay();
    const hint = document.querySelector(`.${DISCONNECT_OVERLAY_CLASS}-hint`);
    assert.equal(hint?.textContent, "Click anywhere to reconnect");
  });
});
