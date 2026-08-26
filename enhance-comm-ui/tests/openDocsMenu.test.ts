import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openDocsMenu } from "../src/host/commChrome/chromeActions";

describe("openDocsMenu", () => {
  it("opens stock /docs landing when show_modal + render_* exist", () => {
    const calls: Array<{ html: string; opts: Record<string, unknown> }> = [];
    const g = globalThis as typeof globalThis & { window?: any };
    const prev = g.window;
    g.window = {
      show_modal: (html: string, opts: Record<string, unknown>) => {
        calls.push({ html, opts });
      },
      render_guide: () => {},
      render_code_docs: () => {},
      render_others: () => {},
      open: () => {
        throw new Error("should not fall back to window.open");
      },
    };
    try {
      openDocsMenu();
      assert.equal(calls.length, 1);
      assert.match(calls[0].html, /Game Guide/);
      assert.match(calls[0].html, /CODE Docs/);
      assert.match(calls[0].html, /Other Systems/);
      assert.match(calls[0].html, /render_guide\(\)/);
      assert.match(calls[0].html, /render_code_docs\(\)/);
      assert.match(calls[0].html, /render_others\(\)/);
      assert.equal(calls[0].opts.url, "/docs");
    } finally {
      g.window = prev;
    }
  });

  it("falls back to /docs tab when stock helpers are missing", () => {
    const opened: string[] = [];
    const g = globalThis as typeof globalThis & { window?: any };
    const prev = g.window;
    g.window = {
      open: (url: string) => {
        opened.push(url);
        return null;
      },
    };
    try {
      openDocsMenu();
      assert.deepEqual(opened, ["/docs"]);
    } finally {
      g.window = prev;
    }
  });
});
