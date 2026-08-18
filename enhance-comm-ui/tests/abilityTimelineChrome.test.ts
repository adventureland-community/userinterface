import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABILITY_CD_CRIT_MS,
  ABILITY_TICK_EVERY_MS,
  bigIconSize,
  cdHighlightKind,
  collectBigIcons,
  formatAbilityCountdown,
  growFlexDirection,
  nearTimelineTick,
  timelineTickMs,
} from "../src/instance/abilityTimelineChrome";
import { DEFAULT_ABILITY_TIMELINE_PREFS } from "../src/instance/abilityTimelinePrefs";
import type { AbilityTimelineSection } from "../src/instance/abilityTimelineModel";

function section(rows: AbilityTimelineSection["rows"]): AbilityTimelineSection {
  return {
    targetId: "boss1",
    targetName: "Bill",
    targetMtype: "a1",
    rows,
  };
}

describe("abilityTimeline chrome (Better Timeline mapping)", () => {
  it("places a 5s tick inside a 10s window", () => {
    assert.deepEqual(timelineTickMs(10000), [ABILITY_TICK_EVERY_MS]);
  });

  it("places 5s and 10s ticks inside a 15s window", () => {
    assert.deepEqual(timelineTickMs(15000), [5000, 10000]);
  });

  it("does not tick at the window edge", () => {
    assert.equal(timelineTickMs(5000).length, 0);
  });

  it("colors countdown yellow at 5s and red at 3s", () => {
    assert.equal(cdHighlightKind(8000, false), "none");
    assert.equal(cdHighlightKind(5000, false), "warn");
    assert.equal(cdHighlightKind(3000, false), "crit");
    assert.equal(cdHighlightKind(ABILITY_CD_CRIT_MS, false), "crit");
    assert.equal(cdHighlightKind(0, true), "none");
  });

  it("formats countdown as ceil seconds under a minute", () => {
    assert.equal(formatAbilityCountdown(0), "");
    assert.equal(formatAbilityCountdown(200), "1");
    assert.equal(formatAbilityCountdown(5000), "5");
    assert.equal(formatAbilityCountdown(61000), "1m");
  });

  it("flashes when remaining crosses a tick", () => {
    assert.equal(nearTimelineTick(5000, 10000), true);
    assert.equal(nearTimelineTick(4800, 10000), true);
    assert.equal(nearTimelineTick(2000, 10000), false);
  });

  it("collects BigIcons for remaining <= imminentMs, soonest first", () => {
    const prefs = { ...DEFAULT_ABILITY_TIMELINE_PREFS };
    const icons = collectBigIcons(
      [
        section([
          {
            id: "anger",
            name: "Anger",
            ms: 6600,
            cooldown: 12000,
            frac: 0.55,
            imminent: false,
            ready: false,
            pinned: false,
            scrollPos: 0.66,
            endsAt: 0,
            castGen: 0,
          },
          {
            id: "warpstomp",
            name: "Warpstomp",
            ms: 2000,
            cooldown: 8000,
            frac: 0.25,
            imminent: true,
            ready: false,
            pinned: false,
            scrollPos: 0.2,
            endsAt: 0,
            castGen: 0,
          },
        ]),
      ],
      prefs,
    );
    assert.deepEqual(
      icons.map((i) => i.id),
      ["warpstomp"],
    );
    assert.equal(icons[0].highlight, "crit");
    assert.equal(icons[0].caster, "Bill");
    assert.equal(icons[0].skillName, "Warpstomp");
  });

  it("collects highlight names for the same imminent window", () => {
    const prefs = { ...DEFAULT_ABILITY_TIMELINE_PREFS };
    const names = collectBigIcons(
      [
        section([
          {
            id: "anger",
            name: "Anger",
            ms: 6600,
            cooldown: 12000,
            frac: 0.55,
            imminent: false,
            ready: false,
            pinned: false,
            scrollPos: 0.66,
            endsAt: 0,
            castGen: 0,
          },
          {
            id: "warpstomp",
            name: "Warpstomp",
            ms: 2000,
            cooldown: 8000,
            frac: 0.25,
            imminent: true,
            ready: false,
            pinned: false,
            scrollPos: 0.2,
            endsAt: 0,
            castGen: 0,
          },
        ]),
      ],
      prefs,
    );
    assert.deepEqual(
      names.map((n) => n.name),
      ["Warpstomp"],
    );
    assert.equal(names[0].highlight, "crit");
  });

  it("maps grow direction to flex-direction", () => {
    assert.equal(growFlexDirection("right"), "row");
    assert.equal(growFlexDirection("left"), "row-reverse");
    assert.equal(growFlexDirection("down"), "column");
    assert.equal(growFlexDirection("up"), "column-reverse");
  });

  it("keeps BigIcon larger than the rail icon", () => {
    assert.ok(bigIconSize(44) > 44);
  });
});
