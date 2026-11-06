import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { ensurePanelShellOpen } from "../src/lib/ensurePanelShellOpen";

describe("ensurePanelShellOpen", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
  });

  it("opens when state is closed", () => {
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return null;
      },
    };
    const calls: Array<[string, boolean]> = [];
    let opened = false;
    ensurePanelShellOpen(
      "chat",
      false,
      (id, v) => calls.push([id, v]),
      () => {
        opened = true;
      },
    );
    assert.deepEqual(calls, [["chat", true]]);
    assert.equal(opened, true);
  });

  it("remounts when state is open but shell is missing", async () => {
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return null;
      },
    };
    const timers: Array<() => void> = [];
    (globalThis as { window?: unknown }).window = {
      setTimeout(fn: () => void) {
        timers.push(fn);
        return 1;
      },
    };
    const calls: Array<[string, boolean]> = [];
    let opened = 0;
    ensurePanelShellOpen(
      "mail",
      true,
      (id, v) => calls.push([id, v]),
      () => {
        opened += 1;
      },
    );
    assert.deepEqual(calls, [["mail", false]]);
    assert.equal(opened, 0);
    assert.equal(timers.length, 1);
    timers[0]();
    assert.deepEqual(calls, [
      ["mail", false],
      ["mail", true],
    ]);
    assert.equal(opened, 1);
  });
});
