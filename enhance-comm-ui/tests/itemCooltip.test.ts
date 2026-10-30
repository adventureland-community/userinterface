/**
 * Item cooltip — stock render_item body or name fallback.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { itemCooltipHtml } from "../src/ui/chrome/itemCooltip";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

describe("itemCooltipHtml", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("falls back to labeled heading when G.items / render_item missing", () => {
    (globalThis as Win).window = {
      G: { items: {} },
    };
    const html = itemCooltipHtml({ name: "hpbelt", level: 2 });
    assert.match(html, /<h4>/);
    assert.match(html, /hpbelt|Belt/i);
  });

  it("uses stock render_item html when available", () => {
    (globalThis as Win).window = {
      G: {
        items: {
          hpbelt: { name: "Belt of HP", skin: "hpbelt" },
        },
      },
      render_item: (_sel: string, args: { item?: { name?: string } }) => {
        return `<div class="buyitem"><div class="cbold">${args.item?.name}</div></div>`;
      },
    };
    const html = itemCooltipHtml({ name: "hpbelt", level: 1, q: 3 });
    assert.match(html, /buyitem/);
    assert.match(html, /Belt of HP/);
  });

  it("escapes fallback labels", () => {
    (globalThis as Win).window = {
      G: { items: {} },
    };
    const html = itemCooltipHtml({ name: "a<b>" });
    assert.match(html, /a&lt;b&gt;/);
    assert.doesNotMatch(html, /a<b>/);
  });
});
