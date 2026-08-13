/**
 * Bundle must evaluate without window.React (Tampermonkey inject path).
 * Skips when dist/ is missing — run after `npm run build`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "dist", "enhance-comm-ui.js");

describe("inject bundle without React", () => {
  it("loads dist/enhance-comm-ui.js without throwing", () => {
    if (!fs.existsSync(bundlePath)) {
      console.log("skip: dist/enhance-comm-ui.js missing (run npm run build)");
      return;
    }

    const code = fs.readFileSync(bundlePath, "utf8");
    const scripts: Array<{
      ev?: string;
      fn?: unknown;
      src?: string;
      append?: string;
    }> = [];

    function el() {
      return {
        id: "",
        src: "",
        crossOrigin: "",
        style: {},
        textContent: "",
        innerText: "",
        setAttribute() {},
        addEventListener(ev: string, fn: unknown) {
          scripts.push({ ev, fn, src: this.src });
        },
        remove() {},
      };
    }

    const doc = {
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => el(),
      addEventListener() {},
      removeEventListener() {},
      head: {
        append(n: { src?: string } | null) {
          scripts.push({ append: n && n.src });
        },
        appendChild() {},
      },
      body: { append() {}, appendChild() {} },
      documentElement: { appendChild() {} },
    };

    const g = globalThis as typeof globalThis & {
      window: Record<string, unknown>;
      document: typeof doc;
    };
    g.window = {
      React: undefined,
      ReactDOM: undefined,
      document: doc,
      setInterval: () => 1,
      clearInterval: () => {},
      setTimeout: () => 1,
      clearTimeout: () => {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      addEventListener() {},
      location: { href: "https://adventure.land/comm" },
    };
    g.document = doc;

    assert.doesNotThrow(() => {
      // eslint-disable-next-line no-eval
      eval(code);
    });
  });
});
