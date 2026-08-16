import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMailDate,
  formatMailRelative,
} from "../../src/ui/frames/mail/mailFormat";

describe("mailFormat list when column", () => {
  it("keeps relative age for old mail (date lives in its own column)", () => {
    const now = Date.parse("2026-08-16T12:00:00.000Z");
    assert.equal(
      formatMailRelative("2026-08-16T11:50:00.000Z", now),
      "10m ago",
    );
    assert.equal(
      formatMailRelative("2026-07-01T12:00:00.000Z", now),
      "46d ago",
    );
    assert.equal(
      formatMailRelative("2025-08-16T12:00:00.000Z", now),
      "1y ago",
    );
    assert.equal(
      formatMailRelative("2026-02-16T12:00:00.000Z", now),
      "6mo ago",
    );
  });

  it("matches locale short numeric / clock formatting", () => {
    const now = new Date(2026, 7, 16, 23, 51, 0).getTime();
    const today = new Date(2026, 7, 16, 1, 5, 0);
    const sameYear = new Date(2026, 6, 1, 12, 0, 0);
    const older = new Date(2025, 7, 16, 12, 0, 0);

    assert.equal(
      formatMailDate(today.toISOString(), now),
      today.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
    assert.equal(
      formatMailDate(sameYear.toISOString(), now),
      sameYear.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
      }),
    );
    assert.equal(
      formatMailDate(older.toISOString(), now),
      older.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
    );
  });
});
