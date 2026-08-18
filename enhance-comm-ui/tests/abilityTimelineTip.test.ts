import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ABILITY_TIMELINE_CSS } from "../src/ui/frames/abilityTimelineCss";
import {
  abilityTimelineHover,
  abilityTimelineTipHtml,
  abilityTimelineTipHandlers,
  dismissAbilityTimelineTip,
} from "../src/ui/frames/abilityTimelineTip";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installG(g: Record<string, unknown>): void {
  (globalThis as Win).window = { G: g };
}

beforeEach(() => {
  installG({});
});

afterEach(() => {
  delete (globalThis as Win).window;
});

describe("ability timeline hover tip", () => {
  it("names the caster so Fairy Healing is not Elena Healing", () => {
    installG({
      skills: {
        self_healing: {
          name: "Healing",
          explanation: "Periodical self healing",
        },
      },
    });
    const html = abilityTimelineTipHtml({
      caster: "Fairy",
      abilityId: "self_healing",
      abilityName: "Healing",
      remainingLabel: "ready",
      cooldown: 10,
    });
    assert.match(html, /Healing/);
    assert.match(html, />Caster<\/span><b>Fairy<\/b>/);
    assert.match(html, /Periodical self healing/);
    assert.doesNotMatch(html, /Elena/);
  });

  it("escapes caster and skill names", () => {
    const html = abilityTimelineTipHtml({
      caster: "<Fairy>",
      abilityId: "self_healing",
      abilityName: "Healing & more",
      remainingLabel: "ready",
      cooldown: 0,
    });
    assert.match(html, /&lt;Fairy&gt;/);
    assert.match(html, /Healing &amp; more/);
    assert.doesNotMatch(html, /<Fairy>/);
  });

  it("keeps hover hosts hittable so mouseenter can fire", () => {
    const hover = abilityTimelineHover({
      caster: "Fairy",
      abilityId: "self_healing",
      abilityName: "Healing",
      remainingLabel: "ready",
      cooldown: 10,
    });
    assert.equal(hover.style.pointerEvents, "auto");
    assert.equal(hover.style.cursor, "help");
    assert.equal(typeof hover.onMouseEnter, "function");
  });

  it("merges rail marker position into the hover hit style", () => {
    const hover = abilityTimelineHover(
      {
        caster: "Fairy",
        abilityId: "self_healing",
        abilityName: "Healing",
        remainingLabel: "ready",
        cooldown: 10,
      },
      { left: "50%", transform: "translate3d(-50%, 0, 0)" },
    );
    assert.equal(hover.style.pointerEvents, "auto");
    assert.equal(hover.style.left, "50%");
  });

  it("does not disable pointer events on rail markers", () => {
    assert.match(
      ABILITY_TIMELINE_CSS,
      /\.ecu-abil-scroll-marker \{[^}]*pointer-events:\s*auto/,
    );
    assert.doesNotMatch(
      ABILITY_TIMELINE_CSS,
      /\.ecu-abil-scroll-marker \{[^}]*pointer-events:\s*none/,
    );
  });

  it("dismisses an open ability tip when the panel vanishes without mouseleave", () => {
    const tip = {
      className: "",
      style: { display: "none", left: "", top: "", position: "fixed", zIndex: "10000" },
      isConnected: true,
      innerHTML: "",
      classList: {
        toggle() {},
        remove() {},
      },
      getBoundingClientRect: () => ({ width: 120, height: 40 }),
    };
    const body = {
      appendChild(el: typeof tip) {
        return el;
      },
      querySelector: () => tip,
    };
    (globalThis as Win).window = {
      innerWidth: 800,
      innerHeight: 600,
      addEventListener() {},
      removeEventListener() {},
    };
    (globalThis as Win).document = {
      body,
      hidden: false,
      addEventListener() {},
      createElement: () => tip,
    } as unknown as Document;

    const ev = {
      clientX: 100,
      clientY: 100,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    } as MouseEvent;
    const handlers = abilityTimelineTipHandlers("<b>Healing</b>");
    handlers.onMouseEnter(ev);
    assert.equal(tip.style.display, "block");

    dismissAbilityTimelineTip();
    assert.equal(tip.style.display, "none");
  });

  it("dismiss without hover is a no-op", () => {
    dismissAbilityTimelineTip();
  });
});
