/**
 * Shared Comm cooltip host — key isolation + paint.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  cooltipHandlers,
  dismissCooltip,
  hideCooltip,
  isCooltipHovering,
  refreshCooltip,
  showCooltipAt,
} from "../src/ui/chrome/cooltip";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
  document: Document;
};

describe("cooltip", () => {
  beforeEach(() => {
    // jsdom-ish minimal document for host mount
    if (typeof document === "undefined") {
      (globalThis as Win).document = {
        getElementById: () => null,
        createElement: () =>
          ({
            id: "",
            className: "",
            classList: {
              add() {},
              remove() {},
              toggle() {},
            },
            style: {},
            setAttribute() {},
            innerHTML: "",
            getBoundingClientRect: () => ({
              width: 200,
              height: 100,
              top: 0,
              left: 0,
              right: 200,
              bottom: 100,
            }),
          }) as any,
        head: { appendChild() {} } as any,
        body: { appendChild() {} } as any,
      } as any;
      (globalThis as Win).window = {
        innerWidth: 800,
        innerHeight: 600,
      } as any;
    }
  });

  afterEach(() => {
    hideCooltip();
  });

  it("tracks hover key for refresh / dismiss", () => {
    let n = 0;
    const handlers = cooltipHandlers("a", () => {
      n += 1;
      return `<div>n=${n}</div>`;
    });
    handlers.onMouseEnter({ clientX: 10, clientY: 20 } as MouseEvent);
    assert.equal(isCooltipHovering("a"), true);
    assert.equal(isCooltipHovering("b"), false);
    refreshCooltip("b");
    assert.equal(n, 1);
    refreshCooltip("a");
    assert.equal(n, 2);
    dismissCooltip("b");
    assert.equal(isCooltipHovering("a"), true);
    dismissCooltip("a");
    assert.equal(isCooltipHovering("a"), false);
  });

  it("showCooltipAt paints without throwing", () => {
    showCooltipAt("<h4>Hi</h4>", 40, 40);
    hideCooltip();
  });
});
