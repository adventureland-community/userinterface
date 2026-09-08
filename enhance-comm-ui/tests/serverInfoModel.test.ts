import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GLike } from "../src/host/globals";
import {
  formatUntilMs,
  isSeasonStatusEntry,
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
  maps: {
    main: { name: "Mainland" },
    desertland: { name: "Desertland" },
  },
} as unknown as GLike;

describe("serverInfoModel", () => {
  it("treats live/event/spawn objects as events", () => {
    assert.equal(isServerEventEntry({ live: true }), true);
    assert.equal(isServerEventEntry({ event: "2026-01-01T00:00:00.000Z" }), true);
    assert.equal(isServerEventEntry({ spawn: "2099-01-01T00:00:00.000Z" }), true);
  });

  it("recognizes anniversary status objects as seasonal", () => {
    assert.equal(
      isSeasonStatusEntry(
        { active: true, live: false, next: 1788827400000 },
        G.events!.anniversary as any,
      ),
      true,
    );
    assert.equal(isSeasonStatusEntry(true, G.events!.halloween as any), true);
    assert.equal(
      isSeasonStatusEntry({ live: true, map: "main" }, G.events!.goobrawl as any),
      false,
    );
  });

  it("does not render anniversary status as a bare upcoming event chip", () => {
    const chips = listServerEventChips(
      {
        schedule: { time_offset: 0, night: false },
        anniversary: { active: true, live: false, next: 1788827400000 },
        goobrawl: { live: true, map: "main" },
        halloween: true,
      },
      G,
    );
    assert.deepEqual(
      chips.map((c) => c.id),
      ["goobrawl"],
    );
  });

  it("shows countdown to next featured anniversary round", () => {
    const now = 1788827400000 - 18 * 60 * 1000;
    const seasons = listServerSeasonChips(
      {
        anniversary: { active: true, live: false, next: 1788827400000 },
      },
      G,
      now,
    );
    assert.equal(seasons.length, 1);
    assert.equal(seasons[0].id, "anniversary");
    assert.equal(seasons[0].label, "10 Years of Adventure");
    assert.equal(seasons[0].live, false);
    assert.equal(seasons[0].detail, "next in 18m");
    assert.match(seasons[0].title, /Next featured player in 18m/);
    assert.match(seasons[0].title, /Every 30 minutes/);
  });

  it("shows live featured player and round time left", () => {
    const now = 1_000_000;
    const seasons = listServerSeasonChips(
      {
        anniversary: {
          active: true,
          live: true,
          next: now + 30 * 60 * 1000,
          expires: now + 4 * 60 * 1000,
          target: "cakeHero",
          id: "abc",
          map: "main",
          x: 120,
          y: -40,
        },
      },
      G,
      now,
    );
    assert.equal(seasons[0].live, true);
    assert.equal(seasons[0].detail, "live · cakeHero · 4m left");
    assert.match(seasons[0].title, /Find cakeHero/);
    assert.match(seasons[0].title, /Mainland \(120, -40\)/);
  });

  it("formats until-ms helpers", () => {
    assert.equal(formatUntilMs(Date.now() + 90_000, Date.now()), "2m");
    assert.equal(formatUntilMs(Date.now() - 1000, Date.now()), "");
  });

  it("reads an active patron blessing", () => {
    const bless = readServerBlessing({
      blessed_minutes: 90,
      blessed_by: "shellBuyer",
    });
    assert.ok(bless);
    assert.equal(bless!.remainLabel, "2h");
  });
});
