import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isServerEventEntry,
  listServerEventChips,
  readServerBlessing,
} from "../src/ui/frames/serverInfoModel";

describe("serverInfoModel", () => {
  it("treats live/event objects as events", () => {
    assert.equal(isServerEventEntry({ live: true }), true);
    assert.equal(isServerEventEntry({ event: "2026-01-01T00:00:00.000Z" }), true);
    assert.equal(isServerEventEntry({ live: false, event: "x" }), true);
  });

  it("ignores blessing scalars and seasonal flags", () => {
    assert.equal(isServerEventEntry(4320), false);
    assert.equal(isServerEventEntry("Alice"), false);
    assert.equal(isServerEventEntry(true), false);
    assert.equal(isServerEventEntry(null), false);
  });

  it("does not render blessed_* as empty event chips", () => {
    const chips = listServerEventChips({
      schedule: { time_offset: 0, night: false },
      blessed_minutes: 4320,
      blessed_by: "shellBuyer",
      goobrawl: { live: true },
      wabbit: { live: false, event: "2099-01-01T00:00:00.000Z" },
      halloween: true,
    });
    assert.deepEqual(
      chips.map((c) => c.id),
      ["goobrawl", "wabbit"],
    );
    assert.equal(chips[0].live, true);
    assert.equal(chips[1].live, false);
    assert.ok(chips[1].until);
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
