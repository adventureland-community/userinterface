/**
 * Command panel run gating (observe + socket).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isCommandObserveReady,
  runCommandSnippet,
} from "../src/host/commandRun";

afterEach(() => {
  delete (globalThis as any).window;
});

describe("runCommandSnippet", () => {
  it("rejects empty code", () => {
    (globalThis as any).window = { observing: { name: "Alice", id: "1" } };
    const r = runCommandSnippet("   ");
    assert.equal(r.ok, false);
    assert.match(r.status, /Write a command/i);
  });

  it("rejects when not observing", () => {
    (globalThis as any).window = { observing: null, socket: { emit() {} } };
    assert.equal(isCommandObserveReady(), false);
    const r = runCommandSnippet("loot()");
    assert.equal(r.ok, false);
    assert.match(r.status, /Observe a character/i);
  });

  it("emits o:command when observing", () => {
    const emitted: Array<{ event: string; payload: string }> = [];
    (globalThis as any).window = {
      observing: { name: "Alice", id: "1" },
      setTimeout: () => 1,
      clearTimeout: () => {},
      socket: {
        emit(event: string, payload: string) {
          emitted.push({ event, payload });
        },
      },
    };
    const r = runCommandSnippet("loot()");
    assert.equal(r.ok, true);
    assert.match(r.status, /Sent/i);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, "o:command");
    assert.ok(String(emitted[0].payload).indexOf("loot()") >= 0);
  });
});

describe("COMMAND_PANEL_STYLE pointer events", () => {
  it("command shell opts into hits", async () => {
    const { COMMAND_PANEL_STYLE } = await import("../src/lib/frameSizes");
    assert.equal(COMMAND_PANEL_STYLE.pointerEvents, "auto");
  });
});
