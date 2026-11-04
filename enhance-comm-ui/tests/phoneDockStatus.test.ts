import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPhoneCharDockMeta,
  formatPhoneServerDockPlayers,
  readPhoneDockStatus,
  shortPhoneDockLabel,
} from "../src/lib/phoneDockStatus";

describe("phoneDockStatus", () => {
  it("shortPhoneDockLabel truncates long names", () => {
    assert.equal(shortPhoneDockLabel("Hi", 12), "Hi");
    assert.equal(shortPhoneDockLabel("abcdefghijkl", 12), "abcdefghijkl");
    assert.equal(shortPhoneDockLabel("abcdefghijklm", 12), "abcdefghijk…");
  });

  it("readPhoneDockStatus reports not observing when empty", () => {
    const prevObs = (globalThis as { window?: unknown }).window;
    (globalThis as { window: any }).window = {
      observing: null,
      server_region: "EU",
      server_identifier: "I",
      X: {
        servers: [{ region: "EU", name: "I", key: "EU_I", players: 42 }],
        characters: [],
      },
      socket: {},
      pings: [40, 50, 60],
      server_to_ui: (k: string) => (k === "EU_I" ? "EU I" : k),
    };
    try {
      const snap = readPhoneDockStatus();
      assert.equal(snap.observing, false);
      assert.equal(snap.observingName, "");
      assert.equal(snap.connected, true);
      assert.ok(snap.serverLabel === "EU I" || snap.serverLabel === "EU I");
      assert.equal(snap.serverPlayers, 42);
      assert.equal(snap.pingMs, 50);
      assert.equal(snap.pingBars.length, 3);
      assert.equal(formatPhoneCharDockMeta(snap), "Tap to watch");
      assert.equal(formatPhoneServerDockPlayers(snap), "42 players");
    } finally {
      if (prevObs === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = prevObs;
      }
    }
  });

  it("readPhoneDockStatus surfaces observing name + class/level", () => {
    const prevObs = (globalThis as { window?: unknown }).window;
    (globalThis as { window: any }).window = {
      observing: { name: "Alice" },
      server_region: "US",
      server_identifier: "I",
      X: {
        servers: [{ region: "US", name: "I", key: "US_I", players: 3 }],
        characters: [
          {
            name: "Alice",
            level: 88,
            type: "ranger",
            online: true,
            server: "US_I",
          },
        ],
      },
      socket: {},
      pings: [120],
      server_to_ui: () => "US I",
    };
    try {
      const snap = readPhoneDockStatus();
      assert.equal(snap.observing, true);
      assert.equal(snap.observingName, "Alice");
      assert.equal(snap.observingLevel, "88");
      assert.equal(snap.observingType, "ranger");
      assert.equal(snap.serverPlayers, 3);
      assert.equal(snap.pingMs, 120);
      assert.equal(formatPhoneCharDockMeta(snap), "Lv.88 · ranger");
      assert.equal(formatPhoneServerDockPlayers(snap), "3 players");
    } finally {
      if (prevObs === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = prevObs;
      }
    }
  });
});
