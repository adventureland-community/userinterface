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
} from "../../src/host/mail/xUnread";
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

describe("mail filter + suggest", () => {
  it("filters unread and sorts newest first", () => {
    const mails: MailRow[] = [
      {
        id: "1",
        fro: "Stranger",
        to: "Wizard",
        subject: "hi",
        message: "",
        sent: "1",
        read: false,
      },
      {
        id: "2",
        fro: "Wizard",
        to: "Kael",
        subject: "yo",
        message: "",
        sent: "2",
        read: true,
        item: { name: "gloves" },
        taken: false,
      },
      {
        id: "3",
        fro: "Old",
        to: "Wizard",
        subject: "ancient attach",
        message: "",
        sent: "0",
        read: true,
        item: { name: "helmet" },
        taken: false,
      },
    ];
    const all = filterMails(mails, {
      pill: "all",
      query: "",
      selfNames: ["Wizard"],
    });
    assert.deepEqual(
      all.map((m) => m.id),
      ["2", "1", "3"],
    );
    const sug = suggestMailTo("", {
      selfNames: ["Wizard"],
      mails,
      visiblePlayers: ["Nearby"],
    });
    assert.equal(sug[0].group, "own");
    assert.equal(sug[0].name, "Wizard");
  });

  it("supports Gmail-style operators", () => {
    const day = 86400000;
    const now = Date.UTC(2026, 7, 16);
    const mails: MailRow[] = [
      {
        id: "a",
        fro: "Alice",
        to: "Wizard",
        subject: "loot drop",
        message: "here",
        sent: new Date(now - 2 * day).toISOString(),
        read: false,
        item: { name: "hpamulet" },
        taken: false,
      },
      {
        id: "b",
        fro: "Bob",
        to: "Wizard",
        subject: "thanks",
        message: "ok",
        sent: new Date(now - 40 * day).toISOString(),
        read: true,
        item: { name: "gloves" },
        taken: true,
      },
      {
        id: "c",
        fro: "Alice",
        to: "Kael",
        subject: "plain",
        message: "no item",
        sent: new Date(now - 1 * day).toISOString(),
        read: false,
      },
    ];
    const fromAlice = filterMails(mails, {
      pill: "all",
      query: "from:Alice",
      selfNames: ["Wizard"],
      now,
    });
    assert.deepEqual(
      fromAlice.map((m) => m.id),
      ["c", "a"],
    );
    const attach = filterMails(mails, {
      pill: "all",
      query: "has:attachment is:untaken",
      selfNames: ["Wizard"],
      now,
    });
    assert.deepEqual(
      attach.map((m) => m.id),
      ["a"],
    );
    const taken = filterMails(mails, {
      pill: "all",
      query: "is:taken item:gloves",
      selfNames: ["Wizard"],
      now,
    });
    assert.deepEqual(
      taken.map((m) => m.id),
      ["b"],
    );
    const subj = filterMails(mails, {
      pill: "all",
      query: 'subject:"loot drop"',
      selfNames: ["Wizard"],
      now,
    });
    assert.equal(subj.length, 1);
    assert.equal(subj[0].id, "a");
    const newer = filterMails(mails, {
      pill: "all",
      query: "newer_than:7d",
      selfNames: ["Wizard"],
      now,
    });
    assert.deepEqual(newer.map((m) => m.id).sort(), ["a", "c"]);
    const exclude = filterMails(mails, {
      pill: "all",
      query: "from:Alice -plain",
      selfNames: ["Wizard"],
      now,
    });
    assert.deepEqual(
      exclude.map((m) => m.id),
      ["a"],
    );
  });

  it("round-trips search options form to operators", () => {
    const q = mailSearchFormToQuery({
      from: "Alice",
      to: "Wizard",
      subject: "loot drop",
      hasWords: "rare",
      doesntHave: "junk",
      item: "hpamulet",
      hasAttachment: true,
      untakenOnly: true,
      takenOnly: false,
      newerThan: "7d",
      scope: "tome",
    });
    assert.match(q, /from:Alice/);
    assert.match(q, /to:Wizard/);
    assert.match(q, /subject:"loot drop"/);
    assert.match(q, /item:hpamulet/);
    assert.match(q, /has:attachment/);
    assert.match(q, /has:untaken/);
    assert.match(q, /newer_than:7d/);
    assert.match(q, /\brare\b/);
    assert.match(q, /-junk/);
    const form = queryToMailSearchForm(q, "tome");
    assert.equal(form.from, "alice");
    assert.equal(form.to, "wizard");
    assert.equal(form.subject, "loot drop");
    assert.equal(form.item, "hpamulet");
    assert.equal(form.hasAttachment, true);
    assert.equal(form.untakenOnly, true);
    assert.equal(form.takenOnly, false);
    assert.equal(form.newerThan, "7d");
    assert.equal(form.scope, "tome");
    assert.match(form.hasWords, /rare/);
    assert.match(form.doesntHave, /junk/);
  });

  it("maps taken-only cleanup search", () => {
    const q = mailSearchFormToQuery({
      ...EMPTY_MAIL_SEARCH_FORM,
      hasAttachment: true,
      takenOnly: true,
    });
    assert.match(q, /has:attachment/);
    assert.match(q, /is:taken/);
    assert.doesNotMatch(q, /untaken/);
    const form = queryToMailSearchForm("has:attachment is:taken");
    assert.equal(form.hasAttachment, true);
    assert.equal(form.takenOnly, true);
    assert.equal(form.untakenOnly, false);
  });
});

describe("mail subjects", () => {
  const gloves = { slot: 2, name: "gloves", level: 8 };
  it("fills empty subject from item; {item} token; batch joins when no token", () => {
    assert.equal(resolveMailSubject("", gloves, 1, 1), "gloves +8");
    assert.equal(resolveMailSubject("Hi", gloves, 1, 1), "Hi");
    assert.equal(
      resolveMailSubject("Sending {item}", gloves, 1, 1),
      "Sending gloves +8",
    );
    assert.equal(
      resolveMailSubject("Loot: {item}", gloves, 2, 3),
      "Loot: gloves +8",
    );
    assert.equal(resolveMailSubject("", gloves, 1, 3), "gloves +8");
    assert.equal(resolveMailSubject("loot", gloves, 2, 3), "loot · gloves +8");
    assert.equal(resolveMailSubject("", null, 1, 1), "");
    assert.equal(resolveMailSubject("", null, 1, 2), "Mail (1/2)");
    assert.equal(
      resolveMailBody("Here is {item}", gloves),
      "Here is gloves +8",
    );
  });
});

describe("mail batch cost", () => {
  it("scales attach cost by queue length and plain by recipients", () => {
    assert.equal(mailSendCost(false), MAIL_SEND_COST);
    assert.equal(mailSendCost(true), MAIL_SEND_COST + MAIL_ATTACH_EXTRA);
    assert.equal(mailBatchSendCost(0), MAIL_SEND_COST);
    assert.equal(mailBatchSendCost(0, 3), 3 * MAIL_SEND_COST);
    assert.equal(
      mailBatchSendCost(3),
      3 * (MAIL_SEND_COST + MAIL_ATTACH_EXTRA),
    );
  });
});

