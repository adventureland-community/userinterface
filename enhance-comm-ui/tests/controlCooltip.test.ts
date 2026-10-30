import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import type { FearState } from "../src/lib/controlState";
import { controlCooltipHtml } from "../src/ui/chrome/controlCooltip";

type Win = typeof globalThis & { window: Record<string, unknown> };

describe("controlCooltipHtml", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("explains fear tier and shows aggro/courage as X/Y", () => {
    (globalThis as Win).window = {
      calculate_item_properties: () => ({}),
      G: {
        items: {},
        classes: {
          warrior: {
            courage: 2,
            mcourage: 1,
            pcourage: 1,
            stats: { str: 20, int: 5 },
            lstats: { str: 1, int: 0 },
          },
        },
      },
    };
    const state: FearState = {
      kind: "fear",
      level: "terrified",
      fear: 2,
      label: "Terrified",
      severity: 2,
      color: "#ffd0d8",
      border: "#e05570",
      background: "rgba(90,22,40,0.95)",
      skin: "skill_scare",
    };
    const html = controlCooltipHtml({
      state,
      entity: {
        id: "a",
        ctype: "warrior",
        level: 1,
        slots: {},
      } as EntityLike,
      aggroMobs: [
        { id: "1", mtype: "goo", damage_type: "physical" } as EntityLike,
        { id: "2", mtype: "bee", damage_type: "physical" } as EntityLike,
        { id: "3", mtype: "goo", damage_type: "physical" } as EntityLike,
        { id: "4", mtype: "goo", damage_type: "physical" } as EntityLike,
      ],
    });
    assert.match(html, /Terrified \(Fear\)/);
    assert.match(html, /×0\.4/);
    assert.match(html, />Overflow<\/span><b>2<\/b>/);
    // 4 physical vs courage (class 2 + warrior str/30) → overrun highlighted.
    assert.match(html, />Physical<\/span><b>4\/\d+<\/b>/);
    assert.match(html, /class="line ecu-cooltip-over"/);
    assert.match(html, />Magical<\/span><b>0\/\d+<\/b>/);
    assert.match(html, />Pure<\/span><b>0\/\d+<\/b>/);
    assert.doesNotMatch(html, /Aggro P\/M\/U/);
  });

  it("shows hard-CC explanation from G.conditions", () => {
    (globalThis as Win).window = {
      G: {
        conditions: {
          stunned: {
            name: "Stunned",
            explanation: "Cannot act.",
          },
        },
      },
    };
    const html = controlCooltipHtml({
      state: {
        kind: "hardcc",
        id: "stunned",
        label: "Stunned",
        severity: 4,
        color: "#ffd0a0",
        border: "#c87830",
        background: "rgba(70,40,10,0.9)",
        skin: "condition_bad",
      },
      entity: {
        id: "a",
        s: { stunned: { ms: 2500 } },
      } as EntityLike,
    });
    assert.match(html, /Stunned \(CC\)/);
    assert.match(html, /Cannot act/);
    assert.match(html, />Remaining<\/span><b>3s<\/b>/);
  });
});
