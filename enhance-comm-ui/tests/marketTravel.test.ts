import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  cancelMarketTravel,
  getMarketTravel,
  startMarketTravel,
  tickMarketTravel,
} from "../src/host/market/marketTravel";

afterEach(() => {
  cancelMarketTravel();
  delete (globalThis as any).window;
});

describe("market travel", () => {
  it("rejects without observing", () => {
    (globalThis as any).window = { observing: null, socket: { emit() {} } };
    const ok = startMarketTravel({
      name: "Bob",
      map: "main",
      x: 1,
      y: 2,
    });
    assert.equal(ok, false);
    assert.equal(getMarketTravel(), null);
  });

  it("starts move phase on same server and emits smart_move", () => {
    const emitted: Array<{ event: string; payload: string }> = [];
    (globalThis as any).window = {
      observing: { name: "Alice", id: "1" },
      setTimeout: () => 1,
      clearTimeout: () => {},
      setInterval: () => 1,
      clearInterval: () => {},
      server_region: "EU",
      server_identifier: "I",
      socket: {
        emit(event: string, payload: string) {
          emitted.push({ event, payload });
        },
      },
    };
    const ok = startMarketTravel({
      name: "Bob",
      map: "main",
      x: 40,
      y: 50,
    });
    assert.equal(ok, true);
    const it = getMarketTravel();
    assert.equal(it?.phase, "move");
    assert.equal(it?.map, "main");
    assert.ok(emitted.some((e) => e.event === "o:command"));
    assert.ok(
      emitted.some((e) => String(e.payload).indexOf("smart_move") >= 0),
    );
    cancelMarketTravel();
    assert.equal(getMarketTravel(), null);
  });

  it("hops server then waits before move", () => {
    const emitted: string[] = [];
    (globalThis as any).window = {
      observing: { name: "Alice", id: "1" },
      setTimeout: () => 1,
      clearTimeout: () => {},
      setInterval: () => 1,
      clearInterval: () => {},
      server_region: "EU",
      server_identifier: "I",
      socket: {
        emit(_event: string, payload: string) {
          emitted.push(String(payload));
        },
      },
    };
    const ok = startMarketTravel({
      name: "Bob",
      map: "winterland",
      x: 1,
      y: 2,
      region: "US",
      identifier: "I",
    });
    assert.equal(ok, true);
    assert.equal(getMarketTravel()?.phase, "server");
    assert.ok(emitted.some((p) => p.indexOf("change_server") >= 0));
    assert.ok(!emitted.some((p) => p.indexOf("smart_move") >= 0));

    (globalThis as any).window.server_region = "US";
    (globalThis as any).window.server_identifier = "I";
    tickMarketTravel();
    assert.equal(getMarketTravel()?.phase, "move");
    assert.ok(emitted.some((p) => p.indexOf("smart_move") >= 0));
  });
});
