import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GLike } from "../src/host/globals";
import {
  isServerEventEntry,
  listServerEventChips,
  listServerSeasonChips,
  readServerBlessing,
} from "../src/ui/frames/serverInfoModel";

const G = {
  events: {
    anniversary: {
      name: "Ten Years of Adventure Land",
      modal: "event-anniversary",
      sprite: "sixcake",
      type: "seasonal",
      announcement: {
        title: "10 Years of Adventure",
        color: "#F0B742",
        accent: "#ED86AB",
        text: "Find players for cake and Gifts.",
      },
    },
    halloween: {
      name: "Halloween",
      type: "seasonal",
      sprite: "candy0",
    },
    goobrawl: {
      name: "Goo Brawl",
      type: "daily",
    },
  },
  monsters: {
    wabbit: { name: "Wabbit" },
  },
} as unknown as GLike;

describe("serverInfoModel", () => {
  it("treats live/event/spawn objects as events", () => {
    assert.equal(isServerEventEntry({ live: true }), true);
    assert.equal(isServerEventEntry({ event: "2026-01-01T00:00:00.000Z" }), true);
    assert.equal(isServerEventEntry({ spawn: "2099-01-01T00:00:00.000Z" }), true);
    assert.equal(isServerEventEntry({ live: false, event: "x" }), true);
  });

  it("ignores blessing scalars and bare season flags as event rows", () => {
    assert.equal(isServerEventEntry(4320), false);
    assert.equal(isServerEventEntry("Alice"), false);
    assert.equal(isServerEventEntry(true), false);
    assert.equal(isServerEventEntry(null), false);
  });

  it("does not render blessed_* or season booleans as empty event chips", () => {
    const chips = listServerEventChips(
      {
        schedule: { time_offset: 0, night: false },
        blessed_minutes: 4320,
        blessed_by: "shellBuyer",
        goobrawl: { live: true, map: "main" },
        wabbit: { live: false, spawn: "2099-01-01T00:00:00.000Z" },
        halloween: true,
        anniversary: true,
      },
      G,
    );
    assert.deepEqual(
      chips.map((c) => c.id),
      ["goobrawl", "wabbit"],
    );
    assert.equal(chips[0].label, "Goo Brawl");
    assert.equal(chips[0].detail, "live · main");
    assert.equal(chips[1].label, "Wabbit");
    assert.match(chips[1].detail, /^in /);
  });

  it("renders anniversary seasonal chip from G.events", () => {
    const seasons = listServerSeasonChips(
      {
        anniversary: true,
        halloween: false,
        goobrawl: { live: true },
      },
      G,
    );
    assert.equal(seasons.length, 1);
    assert.equal(seasons[0].id, "anniversary");
    assert.equal(seasons[0].label, "10 Years of Adventure");
    assert.equal(seasons[0].detail, "Find players for cake and Gifts.");
    assert.equal(seasons[0].sprite, "sixcake");
    assert.equal(seasons[0].modal, "event-anniversary");
    assert.equal(seasons[0].docsUrl, "/docs/ref/anniversary");
    assert.equal(seasons[0].accent, "#F0B742");
  });

  it("reads an active patron blessing", () => {
    const bless = readServerBlessing({
      blessed_minutes: 90,
      blessed_by: "shellBuyer",
    });
    assert.ok(bless);
    assert.equal(bless!.by, "shellBuyer");
    assert.equal(bless!.minutes, 90);
    assert.equal(bless!.remainLabel, "2h");
  });

  it("hides blessing when minutes are gone", () => {
    assert.equal(readServerBlessing({ blessed_minutes: 0, blessed_by: "x" }), null);
    assert.equal(readServerBlessing({ blessed_by: "x" }), null);
    assert.equal(readServerBlessing(undefined), null);
  });
});
