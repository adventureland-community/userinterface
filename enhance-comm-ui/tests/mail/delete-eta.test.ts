import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteGapMs,
  estimateDeleteEtaMs,
  estimateDeleteRemainingMs,
  formatDeleteEta,
  MAIL_DELETE_API_DEFAULT_MS,
} from "../../src/host/mail/mailDeleteEstimate";
import {
  MAIL_DELETE_GAP_MS,
  MAIL_DELETE_GAP_MAX_MS,
} from "../../src/host/mail/types";

describe("mailDeleteEstimate", () => {
  it("deleteGapMs starts at 0 and ramps toward max", () => {
    assert.equal(deleteGapMs(0), 0);
    assert.equal(deleteGapMs(1), MAIL_DELETE_GAP_MS + 4);
    assert.ok(deleteGapMs(500) <= MAIL_DELETE_GAP_MAX_MS);
    assert.equal(deleteGapMs(500), MAIL_DELETE_GAP_MAX_MS);
  });

  it("schedule ETA includes remaining gaps + API seed", () => {
    const total = 10;
    const eta0 = estimateDeleteRemainingMs(0, total, MAIL_DELETE_API_DEFAULT_MS);
    let gaps = 0;
    for (let i = 0; i < total; i++) gaps += deleteGapMs(i);
    assert.equal(eta0, gaps + total * MAIL_DELETE_API_DEFAULT_MS);

    const eta5 = estimateDeleteRemainingMs(5, total, 200);
    let gapsLeft = 0;
    for (let i = 5; i < total; i++) gapsLeft += deleteGapMs(i);
    assert.equal(eta5, gapsLeft + 5 * 200);
  });

  it("switches to measured pace after two deletes", () => {
    const startedAt = 1_000_000;
    const now = startedAt + 2_000; // 2 deletes in 2s → 1s each
    const eta = estimateDeleteEtaMs({
      done: 2,
      total: 12,
      startedAt,
      now,
      avgApiMs: 9999, // ignored once pace is ready
    });
    assert.equal(eta, 10_000);
  });

  it("formatDeleteEta uses compact ~ labels", () => {
    assert.equal(formatDeleteEta(200), "");
    assert.equal(formatDeleteEta(12_000), "~12s");
    assert.equal(formatDeleteEta(125_000), "~2m");
  });
});
