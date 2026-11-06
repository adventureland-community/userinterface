import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { panelActuallyOpen } from "../src/lib/panelActuallyOpen";

describe("panelActuallyOpen", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
  });

  it("is false when the panel node is missing", () => {
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return null;
      },
    };
    assert.equal(panelActuallyOpen("mail"), false);
  });

  it("is false when the shell has no on-screen size", () => {
    const el = {
      getBoundingClientRect() {
        return { width: 0, height: 0, top: 0, left: 0 };
      },
    };
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return el;
      },
    };
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
    });
    assert.equal(panelActuallyOpen("mail"), false);
  });

  it("is true for a visible sized shell", () => {
    const el = {
      getBoundingClientRect() {
        return {
          width: 400,
          height: 300,
          top: 40,
          left: 40,
          right: 440,
          bottom: 340,
        };
      },
    };
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return el;
      },
    };
    (globalThis as { window?: unknown }).window = {
      innerWidth: 1440,
      innerHeight: 900,
    };
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () => ({
      display: "flex",
      visibility: "visible",
      opacity: "1",
    });
    assert.equal(panelActuallyOpen("mail"), true);
  });

  it("is false when the shell is fully off-viewport", () => {
    const el = {
      getBoundingClientRect() {
        return {
          width: 400,
          height: 300,
          top: -400,
          left: -500,
          right: -100,
          bottom: -100, // no intersection with 0..viewport
        };
      },
    };
    (globalThis as { document?: unknown }).document = {
      querySelector() {
        return el;
      },
    };
    (globalThis as { window?: unknown }).window = {
      innerWidth: 1440,
      innerHeight: 900,
    };
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () => ({
      display: "flex",
      visibility: "visible",
      opacity: "1",
    });
    assert.equal(panelActuallyOpen("mail"), false);
  });

  it("for bag requires the inventory grid, not only the shell", () => {
    const shell = {
      getBoundingClientRect() {
        return { width: 400, height: 300, top: 40, left: 40 };
      },
    };
    (globalThis as { document?: unknown }).document = {
      querySelector(sel: string) {
        if (sel === "#bottomleftcorner .theinventory") return null;
        if (sel === '[data-panel="bag"]') return shell;
        return null;
      },
    };
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () => ({
      display: "flex",
      visibility: "visible",
      opacity: "1",
    });
    assert.equal(panelActuallyOpen("bag"), false);
  });
});
