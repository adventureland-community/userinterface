import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openMainframe } from "../src/host/commChrome/chromeActions";

describe("openMainframe", () => {
  it("navigates to /mainframe like stock comm bottom link", () => {
    let assigned = "";
    const g = globalThis as typeof globalThis & { window?: any };
    const prevWin = g.window;
    g.window = {
      location: {
        assign: (url: string) => {
          assigned = url;
        },
        href: "",
      },
    };
    try {
      openMainframe();
      assert.equal(assigned, "/mainframe");
    } finally {
      g.window = prevWin;
    }
  });

  it("falls back to location.href when assign is missing", () => {
    const g = globalThis as typeof globalThis & { window?: any };
    const prevWin = g.window;
    const loc = { href: "" };
    g.window = { location: loc };
    try {
      openMainframe();
      assert.equal(loc.href, "/mainframe");
    } finally {
      g.window = prevWin;
    }
  });
});
