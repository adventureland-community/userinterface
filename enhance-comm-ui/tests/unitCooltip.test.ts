/**
 * Unit vitals cooltip HTML.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import { unitCooltipHtml } from "../src/ui/chrome/unitCooltip";

describe("unitCooltipHtml", () => {
  it("lists name, level, class, vitals, and flags", () => {
    const entity = {
      id: "somekq6272",
      name: "somekq6272",
      level: 48,
      ctype: "mage",
      hp: 800,
      max_hp: 1000,
      mp: 400,
      max_mp: 500,
    } as EntityLike;
    const html = unitCooltipHtml({
      entity,
      observed: true,
      dead: false,
      aggroCount: 2,
      controlStates: [
        {
          kind: "hardcc",
          id: "stunned",
          label: "Stunned",
          severity: 4,
          color: "#ffd0a0",
          border: "#c87830",
          background: "rgba(70,40,10,0.9)",
          skin: "condition_bad",
        },
      ],
    });
    assert.match(html, /somekq6272/);
    assert.match(html, />Level<\/span><b>48<\/b>/);
    assert.match(html, />Class<\/span><b>mage<\/b>/);
    assert.match(html, /800 \/ 1000/);
    assert.match(html, /400 \/ 500/);
    assert.match(html, /Observing/);
    assert.match(html, /2 mobs/);
  });

  it("escapes names", () => {
    const html = unitCooltipHtml({
      entity: { id: "a<b>", name: "a<b>" } as EntityLike,
    });
    assert.match(html, /a&lt;b&gt;/);
  });
});
