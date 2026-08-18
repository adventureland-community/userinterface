import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { gameIconHtml, resolveGameIcon } from "../src/lib/gameIcon";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(g: Record<string, unknown>): void {
  (globalThis as Win).window = { G: g };
}

afterEach(() => {
  delete (globalThis as Win).window;
});

describe("resolveGameIcon monster abilities", () => {
  it("uses G.skills skin when present", () => {
    installG({
      skills: { anger: { skin: "anger_skin" } },
      monsters: {},
    });
    assert.equal(resolveGameIcon("anger", "skill").skin, "anger_skin");
  });

  it("reads monster ability skin when the id is not in G.skills", () => {
    installG({
      skills: { stomp: { skin: "stomp_art" } },
      monsters: {
        a1: {
          abilities: {
            warpstomp: { skill: "stomp" },
            roar: { skin: "roar_art" },
          },
        },
      },
    });
    assert.equal(
      resolveGameIcon("warpstomp", "skill", { mtype: "a1" }).skin,
      "stomp_art",
    );
    assert.equal(
      resolveGameIcon("roar", "skill", { mtype: "a1" }).skin,
      "roar_art",
    );
  });

  it("uses a hardcoded sheet skin when G.skills has no art", () => {
    installG({ skills: { anger: { name: "Anger" } }, monsters: {} });
    assert.equal(resolveGameIcon("anger", "skill").skin, "skill_agitate");
  });

  it("falls back without a skin when G has no mapping", () => {
    installG({ skills: {}, monsters: {} });
    const resolved = resolveGameIcon("customcast", "skill");
    assert.equal(resolved.kind, "skill");
    assert.equal(resolved.skin, undefined);
  });

  it("uses ability.condition skin when the skill has no art", () => {
    installG({
      skills: {},
      conditions: { weakness: { skin: "weakness_art", name: "Weakness" } },
      monsters: {
        a6: {
          abilities: {
            weakness_aura: { aura: true, condition: "weakness" },
          },
        },
      },
    });
    assert.equal(
      resolveGameIcon("weakness_aura", "skill", { mtype: "a6" }).skin,
      "weakness_art",
    );
  });

  it("paints the monster sprite when a skill has no sheet art", () => {
    installG({
      skills: { customcast: { name: "Custom Cast", type: "skill" } },
      monsters: { a2: { name: "Bill" } },
      positions: {},
    });
    (globalThis as Win).window.sprite = () =>
      '<img class="sprite-test" alt="" />';
    const html = gameIconHtml("customcast", {
      kind: "skill",
      mtype: "a2",
      size: 44,
      title: "Custom Cast",
    });
    assert.match(html, /ecu-meter-icon-monster/);
    assert.match(html, /sprite-test/);
  });
});
