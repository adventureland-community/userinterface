/**
 * Buff/debuff Comm cooltip HTML (meter tip shell).
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import { effectCooltipHtml } from "../src/ui/chrome/effectCooltip";
import type { BuiltEffect } from "../src/ui/chrome/effectsModel";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function install(
  conditions: Record<string, Record<string, unknown>>,
  extra?: { monsters?: Record<string, Record<string, unknown>> },
) {
  const g = globalThis as Win;
  g.window = {
    G: {
      conditions,
      ...(extra && extra.monsters ? { monsters: extra.monsters } : {}),
    },
  };
}

describe("effectCooltipHtml", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("renders name, stats, from, and live remaining", () => {
    install({
      mluck: {
        name: "Good Luck",
        luck: 12,
        buff: true,
        explanation: "Lucked!",
      },
    });
    const effect: BuiltEffect = {
      id: "mluck",
      skin: "buff_luck",
      type: "condition",
      name: "Good Luck",
      ms: 60_000,
    };
    const entity = {
      id: "1",
      s: { mluck: { ms: 60_000, f: "Merch", strong: true } },
    } as EntityLike;
    const html = effectCooltipHtml({
      effect,
      entity,
      remainingMs: 60_000,
    });
    assert.match(html, /Good Luck/);
    assert.match(html, /\(Buff\)/);
    assert.match(html, />From<\/span><b>Merch<\/b>/);
    assert.match(html, /ecu-cooltip-lock/);
    assert.match(html, /Yes · locked/);
    assert.match(html, /Lucked!/);
    assert.match(html, />Luck<\/span><b>\+12%<\/b>/);
    assert.match(html, />Remaining<\/span><b>/);
    const fromAt = html.indexOf(">From</span>");
    const strongAt = html.indexOf(">Strong</span>");
    const luckedAt = html.indexOf("Lucked!");
    assert.ok(fromAt >= 0 && fromAt < strongAt && strongAt < luckedAt);
  });

  it("shows monsterhunt target name and monster icon markup", () => {
    install(
      {
        monsterhunt: {
          name: "On The Hunt",
          explanation: "Tracking a target.",
          ui: true,
        },
      },
      { monsters: { goo: { name: "Goo" } } },
    );
    const html = effectCooltipHtml({
      effect: {
        id: "monsterhunt",
        skin: "quest_monsterhunt",
        type: "condition",
        name: "On The Hunt",
        charges: 3,
      },
      entity: {
        id: "1",
        s: { monsterhunt: { id: "goo", c: 3, ms: 100000 } },
      } as EntityLike,
      remainingMs: 100000,
    });
    assert.match(html, /On The Hunt/);
    assert.match(html, /Defeat 3 Goos and return/);
    assert.match(html, /ecu-cooltip-target/);
    assert.match(html, />Target<\/span>/);
    assert.match(html, /Goo/);
    assert.match(html, /Kills left/);
  });

  it("escapes names and explanations", () => {
    install({
      weird: {
        name: "A <B>",
        explanation: "x & y",
        buff: true,
      },
    });
    const html = effectCooltipHtml({
      effect: {
        id: "weird",
        skin: "buff_luck",
        type: "condition",
        name: "A <B>",
      },
      entity: { id: "1", s: {} } as EntityLike,
    });
    assert.match(html, /A &lt;B&gt;/);
    assert.match(html, /x &amp; y/);
    assert.doesNotMatch(html, /A <B>/);
  });
});
