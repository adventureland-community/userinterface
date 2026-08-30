import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { isObservedCommBagEvent } from "../src/host/gearObserved";
import { stripObservedBagNativeDropHandlers } from "../src/host/inventory";

function installWindow(stub: Record<string, unknown>): void {
  (globalThis as { window?: Record<string, unknown> }).window = stub;
}

describe("observed bag drop guard", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("detects drops inside bottomleftcorner on /comm", () => {
    installWindow({ is_comm: true, observing: { id: "abc" } });
    const slot = {} as Node;
    const host = {
      contains(node: Node) {
        return node === slot;
      },
    } as HTMLElement;

    assert.equal(
      isObservedCommBagEvent(host, { target: slot } as DragEvent),
      true,
    );
    assert.equal(
      isObservedCommBagEvent(host, { target: {} as Node } as DragEvent),
      false,
    );
  });

  it("strips native ondrop from bag slots on /comm", () => {
    installWindow({ is_comm: true, observing: { id: "abc" } });
    const attrs: Record<string, string> = {
      ondrop: "on_drop(event)",
      ondragover: "allow_drop(event)",
    };
    const slot = {
      removeAttribute(name: string) {
        delete attrs[name];
      },
      hasAttribute(name: string) {
        return attrs[name] != null;
      },
    };
    const host = {
      querySelectorAll() {
        return [slot];
      },
    };
    (globalThis as { document?: { getElementById: (id: string) => unknown } }).document =
      {
        getElementById(id: string) {
          return id === "bottomleftcorner" ? host : null;
        },
      };

    stripObservedBagNativeDropHandlers();
    assert.equal(slot.hasAttribute("ondrop"), false);
    assert.equal(slot.hasAttribute("ondragover"), false);
  });
});
