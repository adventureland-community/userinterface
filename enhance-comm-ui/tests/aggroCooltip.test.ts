import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import { aggroCooltipHtml } from "../src/ui/chrome/aggroCooltip";

type Win = typeof globalThis & { window: Record<string, unknown> };

describe("aggroCooltipHtml", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("lists owner, typed counts, and mob rows", () => {
    (globalThis as Win).window = {
      G: {
        monsters: {
          goo: { name: "Goo", damage_type: "physical" },
          bee: { name: "Bee", damage_type: "magical" },
        },
      },
    };
    const html = aggroCooltipHtml({
      ownerName: "Ahnaki",
      mobs: [
        { id: "1", mtype: "goo" } as EntityLike,
        { id: "2", mtype: "bee" } as EntityLike,
      ],
    });
    assert.match(html, /Aggro · 2 mobs/);
    assert.match(html, />On<\/span><b>Ahnaki<\/b>/);
    assert.match(html, />Physical<\/span><b>1<\/b>/);
    assert.match(html, />Magical<\/span><b>1<\/b>/);
    assert.match(html, /ecu-cooltip-mob/);
    // Sprite() missing in unit tests → letter fallback still wraps as ecu-meter-icon.
    assert.match(html, /ecu-meter-icon/);
    assert.match(html, /Goo #1/);
    assert.match(html, /Bee #2/);
  });

  it("shows aggro/courage as X/Y when owner pools are known", () => {
    (globalThis as Win).window = {
      calculate_item_properties: () => ({}),
      G: {
        items: {},
        monsters: {
          goo: { name: "Goo", damage_type: "physical" },
          croc: { name: "Croc", damage_type: "physical" },
        },
        classes: {
          warrior: {
            courage: 5,
            mcourage: 1,
            pcourage: 1,
            stats: { str: 0, int: 0 },
            lstats: { str: 0, int: 0 },
          },
        },
      },
    };
    const html = aggroCooltipHtml({
      ownerName: "Awocra",
      owner: {
        id: "Awocra",
        ctype: "warrior",
        level: 1,
        slots: {},
      } as EntityLike,
      mobs: [
        { id: "1", mtype: "croc" } as EntityLike,
        { id: "2", mtype: "croc" } as EntityLike,
      ],
    });
    assert.match(html, />Physical<\/span><b>2\/5<\/b>/);
    assert.match(html, />Magical<\/span><b>0\/1<\/b>/);
    assert.match(html, />Pure<\/span><b>0\/1<\/b>/);
  });
});
