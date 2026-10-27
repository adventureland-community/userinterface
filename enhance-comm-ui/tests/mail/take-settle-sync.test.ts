/**
 * Take settle sync: deep-cache takes must patch taken state from the
 * skip-cursor page that holds the target, not only the newest head of 40.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCommandOutcome } from "../../src/host/mail/mailUnreadLogic";
import {
  applyTakeSettleSync,
  cursorsForMailIds,
  mailPageCursorForIndex,
  reconcileAfterHeadPull,
} from "../../src/host/mail/mailPersistLogic";
import {
  chunkRefreshCursors,
  estimateRefreshEtaMs,
  estimateRefreshRemainingMs,
  formatRefreshProgressLabel,
  refreshPageCount,
  refreshPageCursors,
} from "../../src/host/mail/mailRefreshEstimate";
import type { MailRow, PullMailPage } from "../../src/host/mail/types";

function letter(id: string): MailRow {
  return {
    id,
    fro: "OperativeAce",
    to: "thmsn",
    subject: "noise",
    message: "",
    sent: id,
  };
}

function claw(
  id: string,
  opts?: { taken?: boolean; pending?: boolean },
): MailRow {
  const m: MailRow = {
    id,
    fro: "OperativeAce",
    to: "thmsn",
    subject: "+9 crab claws 2",
    message: "thanks for lending them to me 2!",
    sent: "2025-10-03",
    item: { name: "crabclaw", level: 9 },
    canTake: true,
  };
  if (opts?.taken != null) m.taken = opts.taken;
  if (opts?.pending != null) m.takenPending = opts.pending;
  return m;
}

/** Same optimistic flip takeMailCommand applies before head polls. */
function markClaimPending(mails: MailRow[], ids: string[]): MailRow[] {
  const want = new Set(ids);
  const out = mails.slice();
  for (let i = 0; i < out.length; i++) {
    const m = out[i];
    if (!want.has(m.id) || !m.item || m.taken) continue;
    out[i] = { ...m, taken: true, takenPending: true };
  }
  return out;
}

function pageOf(mails: MailRow[], more = true): PullMailPage {
  return {
    mail: mails.map((m) => ({ ...m })),
    more,
    cursor: more ? String(mails.length) : null,
    cursored: false,
  };
}

describe("take settle sync vs head-only soft-merge", () => {
  it("plans skip-cursor pages for deep take targets", () => {
    assert.equal(mailPageCursorForIndex(0), null);
    assert.equal(mailPageCursorForIndex(39), null);
    assert.equal(mailPageCursorForIndex(40), "40");
    assert.equal(mailPageCursorForIndex(99), "80");

    const headIds: MailRow[] = [];
    for (let i = 0; i < 40; i++) headIds.push(letter("HEAD_" + i));
    const deepId = "ML_claw_deep";
    const mails = headIds.concat([claw(deepId), letter("OLDER")]);
    assert.deepEqual(cursorsForMailIds(mails, [deepId]), ["40"]);
    assert.deepEqual(cursorsForMailIds(mails, ["HEAD_0", deepId]), ["40"]);
  });

  it("head-only polls leave deep targets Claim settling (bug characterization)", () => {
    const headIds: MailRow[] = [];
    for (let i = 0; i < 40; i++) headIds.push(letter("HEAD_" + i));
    const deepId = "ML_claw_deep";
    const existing = markClaimPending(
      headIds.concat([claw(deepId, { taken: false })]),
      [deepId],
    );

    const reconciled = reconcileAfterHeadPull(
      existing,
      pageOf(headIds),
      "43",
      true,
    );
    const deepAfter = reconciled.mails.find((m) => m.id === deepId)!;
    assert.equal(deepAfter.takenPending, true);

    const outcome = resolveCommandOutcome(
      {
        kind: "take",
        beforeIds: existing.map((m) => m.id),
        targetIds: [deepId],
        expect: 1,
      },
      reconciled.mails,
    );
    assert.equal(outcome.code, "claim_pending");
  });

  it("settle sync clears pending when the target page returns taken:true", () => {
    const headIds: MailRow[] = [];
    for (let i = 0; i < 40; i++) headIds.push(letter("HEAD_" + i));
    const deepId = "ML_claw_deep";
    const existing = markClaimPending(
      headIds.concat([claw(deepId, { taken: false }), letter("OLDER")]),
      [deepId],
    );

    const settled = applyTakeSettleSync({
      existing,
      headPage: pageOf(headIds),
      targetPages: [
        pageOf([claw(deepId, { taken: true, pending: false }), letter("OLDER")]),
      ],
      prevCursor: "42",
      prevHasMore: true,
    });

    const deep = settled.mails.find((m) => m.id === deepId)!;
    assert.equal(deep.taken, true);
    assert.equal(deep.takenPending, false);

    const outcome = resolveCommandOutcome(
      {
        kind: "take",
        beforeIds: existing.map((m) => m.id),
        targetIds: [deepId],
        expect: 1,
      },
      settled.mails,
    );
    assert.equal(outcome.code, "looks_taken");
  });

  it("settle sync clears pending when inv_size released taken:false", () => {
    const headIds: MailRow[] = [];
    for (let i = 0; i < 40; i++) headIds.push(letter("HEAD_" + i));
    const deepId = "ML_claw_deep";
    const existing = markClaimPending(
      headIds.concat([claw(deepId, { taken: false })]),
      [deepId],
    );

    const released = applyTakeSettleSync({
      existing,
      headPage: pageOf(headIds),
      targetPages: [pageOf([claw(deepId, { taken: false, pending: false })])],
      prevCursor: "41",
      prevHasMore: true,
    });

    const deep = released.mails.find((m) => m.id === deepId)!;
    assert.equal(deep.taken, false);
    assert.equal(deep.takenPending, false);

    const outcome = resolveCommandOutcome(
      {
        kind: "take",
        beforeIds: existing.map((m) => m.id),
        targetIds: [deepId],
        expect: 1,
      },
      released.mails,
    );
    assert.equal(outcome.code, "take_no_change");
  });

  it("Refresh soft-merge keeps the warmed older cache", () => {
    const headIds: MailRow[] = [];
    for (let i = 0; i < 40; i++) headIds.push(letter("HEAD_" + i));
    const existing = headIds.concat([
      claw("ML_old"),
      letter("OLDER_1"),
      letter("OLDER_2"),
    ]);
    // Same head fingerprint → unchanged strategy, older tail kept.
    const r = reconcileAfterHeadPull(
      existing,
      pageOf(headIds),
      "80",
      true,
    );
    assert.equal(r.strategy, "unchanged");
    assert.equal(r.mails.length, existing.length);
    assert.equal(
      r.mails.some((m) => m.id === "ML_old"),
      true,
    );
  });
});

describe("full cache refresh plan", () => {
  it("plans every warmed page and formats progress with rate + ETA", () => {
    assert.equal(refreshPageCount(0), 1);
    assert.equal(refreshPageCount(40), 1);
    assert.equal(refreshPageCount(41), 2);
    assert.equal(refreshPageCount(3125), 79);
    assert.deepEqual(refreshPageCursors(40), [null]);
    assert.deepEqual(refreshPageCursors(41), [null, "40"]);
    assert.deepEqual(refreshPageCursors(120), [null, "40", "80"]);

    assert.deepEqual(chunkRefreshCursors(["40", "80", "120", "160", "200"], 4), [
      ["40", "80", "120", "160"],
      ["200"],
    ]);

    // Parallel batches beat serial gaps: 78 deep pages @4 ≈ 20 batches.
    const serialIsh = 78 * 400;
    const parallel = estimateRefreshRemainingMs(1, 79, 220, 4);
    assert.ok(parallel < serialIsh / 3);

    const label = formatRefreshProgressLabel({
      done: 12,
      total: 79,
      etaMs: 55000,
      ratePerSec: 1.2,
    });
    assert.match(label, /12\/79/);
    assert.match(label, /1\.2 p\/s/);
    assert.match(label, /left/);

    const eta = estimateRefreshEtaMs({
      done: 2,
      total: 10,
      startedAt: 1000,
      now: 1000 + 800,
    });
    assert.equal(eta, 3200);
  });
});
