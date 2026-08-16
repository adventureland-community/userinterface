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

describe("assignLocalReadFlags", () => {
  const row = (id: string, read?: boolean): MailRow => ({
    id,
    fro: "A",
    to: "B",
    subject: "",
    message: "",
    sent: "1",
    read,
  });

  it("bootstrap marks unreadBudget rows unread", () => {
    const rows = [row("a"), row("b"), row("c")];
    const assigned = assignLocalReadFlags(rows, new Set(), true, 2, new Set());
    assert.equal(assigned.rows[0].read, false);
    assert.equal(assigned.rows[1].read, false);
    assert.equal(assigned.rows[2].read, true);
    assert.equal(assigned.newIds.length, 0);
  });

  it("delta marks only brand-new ids unread", () => {
    const prev = new Set(["a"]);
    const rows = [row("b"), row("a", true)];
    const assigned = assignLocalReadFlags(rows, prev, false, 0, new Set());
    assert.equal(assigned.newIds.join(","), "b");
    assert.equal(assigned.rows[0].read, false);
    assert.equal(assigned.rows[1].read, true);
  });

  it("respects locallyReadIds over bootstrap budget", () => {
    const assigned = assignLocalReadFlags(
      [row("a"), row("b")],
      new Set(),
      true,
      2,
      new Set(["a"]),
    );
    assert.equal(assigned.rows[0].read, true);
    assert.equal(assigned.rows[1].read, false);
  });
});

describe("resolveCommandOutcome", () => {
  it("send batch reports partial vs full", () => {
    const before = ["a"];
    const mails: MailRow[] = [
      {
        id: "a",
        fro: "x",
        to: "y",
        subject: "",
        message: "",
        sent: "1",
      },
      {
        id: "n1",
        fro: "x",
        to: "y",
        subject: "",
        message: "",
        sent: "2",
      },
    ];
    const partial = resolveCommandOutcome(
      { kind: "send", beforeIds: before, targetIds: [], expect: 2 },
      mails,
    );
    assert.equal(partial.code, "partial_sent");
    assert.equal(partial.kind, "warn");
    assert.match(partial.text, /Partial/);

    const fullMails = mails.concat([
      {
        id: "n2",
        fro: "x",
        to: "y",
        subject: "",
        message: "",
        sent: "3",
      },
    ]);
    const full = resolveCommandOutcome(
      { kind: "send", beforeIds: before, targetIds: [], expect: 2 },
      fullMails,
    );
    assert.equal(full.kind, "");
    assert.equal(full.code, "looks_sent");
    assert.match(full.text, /Looks sent/);
  });

  it("send with no new inbox rows is inconclusive not failure", () => {
    const mails: MailRow[] = [
      {
        id: "a",
        fro: "Ahnaki",
        to: "y",
        subject: "",
        message: "",
        sent: "1",
      },
    ];
    const r = resolveCommandOutcome(
      {
        kind: "send",
        beforeIds: ["a"],
        targetIds: [],
        expect: 1,
        fromNames: ["Ahnaki"],
      },
      mails,
    );
    assert.equal(r.code, "sent_inconclusive");
    assert.equal(r.kind, "");
    assert.match(r.text, /confirm on character log/i);
  });

  it("send counts only matching fro when fromNames set", () => {
    const mails: MailRow[] = [
      {
        id: "a",
        fro: "Ahnaki",
        to: "y",
        subject: "",
        message: "",
        sent: "1",
      },
      {
        id: "n1",
        fro: "Other",
        to: "y",
        subject: "",
        message: "",
        sent: "2",
      },
      {
        id: "n2",
        fro: "Ahnaki",
        to: "y",
        subject: "",
        message: "",
        sent: "3",
      },
    ];
    const r = resolveCommandOutcome(
      {
        kind: "send",
        beforeIds: ["a"],
        targetIds: [],
        expect: 1,
        fromNames: ["Ahnaki"],
      },
      mails,
    );
    assert.equal(r.kind, "");
    assert.equal(r.code, "looks_sent");
    assert.equal(r.text, "Looks sent");
  });

  it("take batch counts taken or missing item", () => {
    const mails: MailRow[] = [
      {
        id: "t1",
        fro: "x",
        to: "y",
        subject: "",
        message: "",
        sent: "1",
        item: { name: "gloves" },
        taken: true,
      },
      {
        id: "t2",
        fro: "x",
        to: "y",
        subject: "",
        message: "",
        sent: "2",
        item: { name: "helmet" },
        taken: false,
      },
    ];
    const partial = resolveCommandOutcome(
      {
        kind: "take",
        beforeIds: ["t1", "t2"],
        targetIds: ["t1", "t2"],
        expect: 2,
      },
      mails,
    );
    assert.equal(partial.code, "partial_taken");
    assert.equal(partial.kind, "warn");
    assert.match(partial.text, /Partial take/);

    mails[1].taken = true;
    const full = resolveCommandOutcome(
      {
        kind: "take",
        beforeIds: ["t1", "t2"],
        targetIds: ["t1", "t2"],
        expect: 2,
      },
      mails,
    );
    assert.equal(full.code, "looks_taken");
    assert.equal(full.kind, "");
    assert.match(full.text, /Looks taken/);
  });
});

describe("unread badge label", () => {
  it("shows 100+ at the server cap", () => {
    assert.equal(formatUnreadBadgeLabel(0), "0");
    assert.equal(formatUnreadBadgeLabel(99), "99");
    assert.equal(formatUnreadBadgeLabel(SERVER_UNREAD_CAP), "100+");
    assert.equal(formatUnreadBadgeLabel(150), "100+");
  });
});

