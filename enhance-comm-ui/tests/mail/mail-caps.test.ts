import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAIL_ATTACH_CAP,
  MAIL_ATTACH_SENDER_CAP,
  buildComposeCapNotices,
  countAttachmentsByRecipient,
  countMailboxAttachments,
  countSenderAttachmentsTo,
  countsTowardAttachCap,
  formatCapFraction,
  buildMailboxCapsView,
  formatMailboxCapsLine,
  mailboxCapPressure,
  senderCapPressure,
  summarizeMailboxCaps,
} from "../../src/host/mail/mailCaps";
import type { MailRow } from "../../src/host/mail/types";

function row(
  id: string,
  opts: Partial<MailRow> & { item?: MailRow["item"] },
): MailRow {
  const m: MailRow = {
    id,
    fro: opts.fro || "thmsn",
    to: opts.to || "thmsn",
    subject: opts.subject || "x",
    message: "",
    sent: "1",
  };
  if (opts.item) m.item = opts.item;
  if (opts.taken != null) m.taken = opts.taken;
  if (opts.takenPending != null) m.takenPending = opts.takenPending;
  if (opts.canTake != null) m.canTake = opts.canTake;
  return m;
}

describe("mail attachment caps", () => {
  it("counts pending claims but not settled takes", () => {
    assert.equal(
      countsTowardAttachCap(
        row("a", { item: { name: "candy1" }, taken: false }),
      ),
      true,
    );
    assert.equal(
      countsTowardAttachCap(
        row("b", {
          item: { name: "candy1" },
          taken: true,
          takenPending: true,
        }),
      ),
      true,
    );
    assert.equal(
      countsTowardAttachCap(
        row("c", { item: { name: "candy1" }, taken: true, takenPending: false }),
      ),
      false,
    );
    assert.equal(countsTowardAttachCap(row("d", {})), false);
  });

  it("mailbox fill skips outbound sender copies", () => {
    const mails = [
      row("1", { item: { name: "a" }, canTake: true }),
      row("2", { item: { name: "b" }, canTake: false }),
      row("3", { item: { name: "c" } }),
      row("4", { item: { name: "d" }, taken: true, takenPending: false }),
    ];
    assert.equal(countMailboxAttachments(mails), 2);
  });

  it("sender-to-recipient counts fro/to matches including self-mail", () => {
    const mails = [
      row("1", {
        fro: "thmsn",
        to: "Buddy",
        item: { name: "a" },
        canTake: false,
      }),
      row("2", {
        fro: "thmsn",
        to: "buddy",
        item: { name: "b" },
        canTake: false,
      }),
      row("3", {
        fro: "Other",
        to: "Buddy",
        item: { name: "c" },
        canTake: false,
      }),
      row("4", {
        fro: "thmsn",
        to: "thmsn",
        item: { name: "d" },
        canTake: true,
      }),
    ];
    assert.equal(countSenderAttachmentsTo(mails, ["thmsn"], "Buddy"), 2);
    assert.equal(countSenderAttachmentsTo(mails, ["thmsn"], "thmsn"), 1);
  });

  it("formats fractions and pressure bands", () => {
    assert.equal(formatCapFraction(47, MAIL_ATTACH_CAP), "47/200");
    assert.equal(formatCapFraction(47, MAIL_ATTACH_CAP, true), "47+/200");
    assert.equal(mailboxCapPressure(10), "");
    assert.equal(mailboxCapPressure(160), "warn");
    assert.equal(mailboxCapPressure(MAIL_ATTACH_CAP), "full");
    assert.equal(senderCapPressure(14), "");
    assert.equal(senderCapPressure(15), "warn");
    assert.equal(senderCapPressure(19, 1), "warn");
    assert.equal(senderCapPressure(20), "full");
    assert.equal(senderCapPressure(19, 2), "full");
    assert.equal(MAIL_ATTACH_SENDER_CAP, 20);
  });

  it("groups untaken attachments per recipient character", () => {
    const mails = [
      row("1", { to: "thmsn", item: { name: "a" }, canTake: true }),
      row("2", { to: "thmsn", item: { name: "b" }, canTake: true }),
      row("3", { to: "RedMill", item: { name: "c" }, canTake: true }),
      row("4", { to: "RedMill", item: { name: "d" }, canTake: false }),
      row("5", { to: "Other", item: { name: "e" }, canTake: true }),
    ];
    const fills = countAttachmentsByRecipient(mails, ["thmsn", "RedMill"]);
    assert.deepEqual(
      fills.map((f) => ({ name: f.name, count: f.count })),
      [
        { name: "thmsn", count: 2 },
        { name: "RedMill", count: 1 },
      ],
    );
    assert.equal(countMailboxAttachments(mails), 4);
  });

  it("formats per-char cap lines preferring the observed character", () => {
    const fills = countAttachmentsByRecipient(
      [
        row("1", { to: "RedMill", item: { name: "a" }, canTake: true }),
        row("2", { to: "RedMill", item: { name: "b" }, canTake: true }),
        row("3", { to: "thmsn", item: { name: "c" }, canTake: true }),
        row("4", { to: "Kariir", item: { name: "d" }, canTake: true }),
      ],
      ["thmsn", "RedMill", "Kariir"],
    );
    assert.match(
      formatMailboxCapsLine(fills, { preferName: "thmsn", maxNames: 2 }),
      /^thmsn 1\/200 · RedMill 2\/200 · \+1 char$/,
    );
    const summary = summarizeMailboxCaps({
      fills,
      preferName: "thmsn",
    });
    assert.match(summary.line, /thmsn 1\/200/);
    assert.match(summary.title, /per character/i);
    assert.match(summary.title, /thmsn 1\/200/);
  });

  it("builds a compact caps view plus full roster for the modal", () => {
    const mails = [];
    for (let i = 0; i < 200; i++) {
      mails.push(
        row("t" + i, { to: "thmsn", item: { name: "a" }, canTake: true }),
      );
    }
    for (let i = 0; i < 170; i++) {
      mails.push(
        row("r" + i, { to: "RedMill", item: { name: "b" }, canTake: true }),
      );
    }
    mails.push(
      row("k1", { to: "Kariir", item: { name: "c" }, canTake: true }),
    );
    const owned = ["thmsn", "RedMill", "Kariir", "IdleOne"];
    const view = buildMailboxCapsView({
      fills: countAttachmentsByRecipient(mails, owned),
      preferName: "thmsn",
      ownedNames: owned,
    });
    assert.equal(view.primary && view.primary.name, "thmsn");
    assert.equal(view.primary && view.primary.count, 200);
    assert.equal(view.primaryPct, 100);
    assert.equal(view.primaryLabel, "full");
    assert.equal(view.fullCount, 1);
    assert.equal(view.warnCount, 1);
    assert.equal(view.holdingCount, 3);
    assert.equal(view.okCount, 1);
    assert.equal(view.pressure, "full");
    assert.match(view.summaryLine, /1 full/);
    assert.match(view.summaryLine, /1 near/);
    assert.equal(view.fills.length, 4);
    assert.equal(view.fills[view.fills.length - 1].name, "IdleOne");
    assert.equal(view.fills[view.fills.length - 1].count, 0);
  });

  it("compose notices include per-char mailbox + per-recipient sender lines", () => {
    const mails = [
      row("1", {
        fro: "thmsn",
        to: "thmsn",
        item: { name: "candy1" },
        canTake: true,
      }),
      row("2", {
        fro: "thmsn",
        to: "thmsn",
        item: { name: "candy1" },
        canTake: true,
      }),
    ];
    const notices = buildComposeCapNotices({
      mails,
      selfNames: ["thmsn"],
      queued: [{ to: "thmsn", count: 3 }],
    });
    assert.equal(notices.length, 2);
    assert.match(notices[0].text, /Per-char mailbox · thmsn 2\/200/);
    assert.match(notices[1].text, /Self-mail 2\/20 from you · \+3 queued/);
    assert.equal(notices[1].pressure, "");
  });
});
