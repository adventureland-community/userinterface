import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { isCommTouchUi } from "../src/lib/commTouchUi";

describe("isCommTouchUi", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
  });

  it("is true when #comm-ui has comm-ui-touch", () => {
    (globalThis as { window?: { innerWidth: number; innerHeight: number } }).window =
      { innerWidth: 1400, innerHeight: 900 };
    (globalThis as { document?: unknown }).document = {
      getElementById(id: string) {
        if (id !== "comm-ui") return null;
        return {
          classList: {
            contains(name: string) {
              return name === "comm-ui-touch";
            },
          },
        };
      },
    };
    assert.equal(isCommTouchUi(), true);
  });

  it("follows phone viewport when no touch class", () => {
    (globalThis as { window?: { innerWidth: number; innerHeight: number } }).window =
      { innerWidth: 390, innerHeight: 844 };
    (globalThis as { document?: unknown }).document = {
      getElementById() {
        return null;
      },
    };
    assert.equal(isCommTouchUi(), true);
  });
});
