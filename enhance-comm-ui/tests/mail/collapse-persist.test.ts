import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSendScript, buildTakeScript } from "../../src/host/mail/commands";
import {
  attachesHaveRecipients,
  distributeAttachesAcrossTos,
  pickToForNewAttach,
  rebindAttachesToPool,
} from "../../src/host/mail/composeDraft";
import { filterMails } from "../../src/host/mail/filter";
import {
  EMPTY_MAIL_SEARCH_FORM,
  mailSearchFormToQuery,
  queryToMailSearchForm,
} from "../../src/host/mail/mailSearchForm";
import { itemMatchesFingerprint, findFingerprintSlot } from "../../src/host/mail/itemFingerprint";
import {
  appendCursorPage,
  mergeHeadPage,
  normalizeMailPage,
} from "../../src/host/mail/merge";
import { extractInfs } from "../../src/host/mail/api";
import { suggestMailTo } from "../../src/host/mail/toSuggest";
import {
  resolveMailBody,
  resolveMailSubject,
} from "../../src/host/mail/mailSubject";
import { mailBatchSendCost, mailSendCost } from "../../src/host/mail/capabilities";
import {
  assignLocalReadFlags,
  resolveCommandOutcome,
} from "../../src/host/mail/mailUnreadLogic";
import {
  formatUnreadBadgeLabel,
  SERVER_UNREAD_CAP,
} from "../../src/host/mail/mailUnread";
import {
  collapseMailRows,
  mailCollapseKey,
  mailStackItemQuantity,
} from "../../src/host/mail/collapse";
import {
  canKeepOlderAfterHead,
  findHeadOverlap,
  headFingerprint,
  reconcileAfterHeadPull,
  stitchHeadOntoCache,
} from "../../src/host/mail/mailPersistLogic";
import {
  MAIL_ATTACH_EXTRA,
  MAIL_SEND_COST,
  type MailRow,
} from "../../src/host/mail/types";

describe("mail collapse", () => {
  it("stacks same item fingerprints and identical plain mails", () => {
    const rows: MailRow[] = [
      {
        id: "1",
        fro: "A",
        to: "B",
        subject: "gloves",
        message: "",
        sent: "3",
        item: { name: "gloves", level: 2 },
        read: false,
      },
      {
        id: "2",
        fro: "A",
        to: "B",
        subject: "gloves",
        message: "",
        sent: "2",
        item: { name: "gloves", level: 2 },
        taken: true,
      },
      {
        id: "3",
        fro: "A",
        to: "B",
        subject: "gloves",
        message: "",
        sent: "1",
        item: { name: "gloves", level: 3 },
      },
      {
        id: "4",
        fro: "X",
        to: "Y",
        subject: "hi",
        message: "same",
        sent: "9",
      },
      {
        id: "5",
        fro: "X",
        to: "Y",
        subject: "hi",
        message: "same",
        sent: "8",
      },
      {
        id: "6",
        fro: "X",
        to: "Y",
        subject: "hi",
        message: "other",
        sent: "7",
      },
    ];
    assert.equal(mailCollapseKey(rows[0]), mailCollapseKey(rows[1]));
    assert.notEqual(mailCollapseKey(rows[0]), mailCollapseKey(rows[2]));
    const groups = collapseMailRows(rows);
    assert.equal(groups.length, 4);
    // Newest head first: plain "hi/same" (sent 9), then other plain (7),
    // then gloves+2 (3), then gloves+3 (1).
    assert.equal(groups[0].mails.length, 2);
    assert.equal(groups[0].head.id, "4");
    assert.equal(groups[1].mails.length, 1);
    assert.equal(groups[1].head.id, "6");
    assert.equal(groups[2].mails.length, 2);
    assert.equal(groups[2].unread, 1);
    assert.equal(groups[2].untaken, 1);
    assert.equal(groups[2].head.id, "1");
    assert.equal(groups[3].mails.length, 1);
    assert.equal(groups[3].head.id, "3");
    // One taken + one untaken gloves — qty ignores taken (only 1 left → null).
    assert.equal(mailStackItemQuantity(groups[2]), null);
  });

  it("sums stackable q and counts missing q as 1", () => {
    const stackable: MailRow[] = [
      {
        id: "a",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "2",
        item: { name: "hpot0", q: 50 },
      },
      {
        id: "b",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "1",
        item: { name: "hpot0", q: 50 },
      },
    ];
    const gStack = collapseMailRows(stackable)[0];
    assert.equal(mailStackItemQuantity(gStack), 100);

    const singles: MailRow[] = [
      {
        id: "c",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "2",
        item: { name: "throwingstars" },
      },
      {
        id: "d",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "1",
        item: { name: "throwingstars" },
      },
      {
        id: "e",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "0",
        item: { name: "throwingstars" },
      },
    ];
    const gSingles = collapseMailRows(singles)[0];
    assert.equal(mailStackItemQuantity(gSingles), 3);
  });

  it("excludes taken attachments from stack quantity", () => {
    const rows: MailRow[] = [
      {
        id: "a",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "2",
        item: { name: "beewings", q: 8615 },
        taken: false,
      },
      {
        id: "b",
        fro: "A",
        to: "B",
        subject: "",
        message: "",
        sent: "1",
        item: { name: "beewings", q: 8615 },
        taken: true,
      },
    ];
    const g = collapseMailRows(rows)[0];
    assert.equal(mailStackItemQuantity(g), 8615);
  });
});

function row(id: string, taken?: boolean): MailRow {
  const m: MailRow = {
    id,
    fro: "A",
    to: "B",
    subject: "",
    message: "",
    sent: id,
  };
  if (taken != null) m.taken = taken;
  return m;
}

describe("mail persist reconcile", () => {
  it("fingerprints head ids + taken", () => {
    assert.equal(
      headFingerprint([row("a", false), row("b", true)], 2),
      "a:0|b:1",
    );
  });

  it("pushes new mail in front and keeps the older tail", () => {
    const existing = [row("2"), row("3"), row("4"), row("5")];
    const head = [row("1"), row("2"), row("3"), row("4")];
    assert.equal(canKeepOlderAfterHead(existing, head), true);
    const overlap = findHeadOverlap(existing, head);
    assert.ok(overlap);
    assert.equal(overlap!.headStart, 1);
    assert.equal(overlap!.existingStart, 0);
    const r = reconcileAfterHeadPull(
      existing,
      { mail: head, more: true, cursor: "40", cursored: true },
      "4",
      true,
    );
    assert.equal(r.strategy, "prepend");
    assert.equal(r.mails.map((m) => m.id).join(","), "1,2,3,4,5");
    assert.equal(r.nextCursor, "5");
    assert.equal(r.hasMore, true);
  });

  it("keeps cursor when head fingerprint unchanged", () => {
    const existing = [row("1"), row("2"), row("3"), row("old")];
    const head = [row("1"), row("2"), row("3")];
    const r = reconcileAfterHeadPull(
      existing,
      { mail: head, more: true, cursor: "40", cursored: true },
      "80",
      true,
    );
    assert.equal(r.strategy, "unchanged");
    assert.equal(r.nextCursor, "80");
    assert.equal(r.mails.length, 4);
  });

  it("stitches after a head delete — drops ghost, keeps older pages", () => {
    const existing = [row("1"), row("2"), row("3"), row("old")];
    const head = [row("2"), row("3"), row("4")];
    assert.equal(canKeepOlderAfterHead(existing, head), true);
    const stitched = stitchHeadOntoCache(existing, head);
    assert.ok(stitched);
    assert.equal(stitched!.strategy, "stitch");
    assert.equal(stitched!.mails.map((m) => m.id).join(","), "2,3,4,old");
    const r = reconcileAfterHeadPull(
      existing,
      { mail: head, more: true, cursor: "40", cursored: true },
      "80",
      true,
    );
    assert.equal(r.strategy, "stitch");
    assert.equal(r.mails.map((m) => m.id).join(","), "2,3,4,old");
    assert.equal(r.nextCursor, "4");
  });

  it("truncates only when the head shares no ids with the cache", () => {
    const existing = [row("a"), row("b"), row("old")];
    const head = [row("x"), row("y"), row("z")];
    assert.equal(canKeepOlderAfterHead(existing, head), false);
    const r = reconcileAfterHeadPull(
      existing,
      { mail: head, more: true, cursor: "40", cursored: true },
      "80",
      true,
    );
    assert.equal(r.strategy, "truncate");
    assert.equal(r.mails.map((m) => m.id).join(","), "x,y,z");
    assert.equal(r.nextCursor, "40");
  });

  it("replaces when server has no more pages", () => {
    const existing = [row("1"), row("2"), row("old")];
    const head = [row("9"), row("1")];
    const r = reconcileAfterHeadPull(
      existing,
      { mail: head, more: false, cursor: null, cursored: true },
      "40",
      true,
    );
    assert.equal(r.strategy, "replace");
    assert.equal(r.hasMore, false);
    assert.equal(r.mails.map((m) => m.id).join(","), "9,1");
  });
});
