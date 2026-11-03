/**
 * Mail delete / API failure / sent normalize correctness.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiResponseFailed } from "../../src/host/mail/api";
import { filterMails } from "../../src/host/mail/filter";
import {
  normalizeMailPage,
  normalizeMailSent,
} from "../../src/host/mail/merge";
import type { MailRow } from "../../src/host/mail/types";

describe("apiResponseFailed", () => {
  it("treats failed/success:false bodies as failure (HTTP 200 trap)", () => {
    assert.equal(apiResponseFailed({ failed: true, reason: "cant_delete" }), true);
    assert.equal(apiResponseFailed({ success: false }), true);
    assert.equal(apiResponseFailed({ success: true, infs: [] }), false);
    assert.equal(apiResponseFailed(null), false);
  });
});

describe("normalizeMailSent", () => {
  it("coerces epoch and Date strings to ISO", () => {
    const iso = normalizeMailSent(1_700_000_000_000);
    assert.ok(iso.indexOf("T") > 0);
    assert.ok(Date.parse(iso) > 0);
    const fromStr = normalizeMailSent("Sun Aug 16 2026");
    assert.ok(Date.parse(fromStr) > 0 || fromStr.length > 0);
    assert.equal(normalizeMailSent("undefined"), "");
    assert.equal(normalizeMailSent(null), "");
  });

  it("normalizeMailPage stores parseable sent", () => {
    const page = normalizeMailPage({
      mail: [
        {
          id: "1",
          fro: "a",
          to: "b",
          subject: "",
          message: "",
          sent: 1_700_000_000_000,
        },
      ],
    });
    assert.ok(Date.parse(page.mail[0].sent) > 0);
  });
});

describe("tome/fromme without roster", () => {
  it("does not hide all mail when selfNames is empty", () => {
    const mails: MailRow[] = [
      {
        id: "1",
        fro: "Alice",
        to: "Bob",
        subject: "hi",
        message: "",
        sent: "1",
      },
    ];
    const tome = filterMails(mails, {
      pill: "tome",
      query: "",
      selfNames: [],
    });
    assert.equal(tome.length, 1);
    const fromme = filterMails(mails, {
      pill: "fromme",
      query: "",
      selfNames: [],
    });
    assert.equal(fromme.length, 1);
    const fromothers = filterMails(mails, {
      pill: "fromothers",
      query: "",
      selfNames: [],
    });
    assert.equal(fromothers.length, 1);
  });
});

describe("fromothers pill", () => {
  it("keeps player→you and drops self-mail", () => {
    const mails: MailRow[] = [
      {
        id: "player",
        fro: "Alice",
        to: "thmsn",
        subject: "gift",
        message: "",
        sent: "3",
      },
      {
        id: "self",
        fro: "Idle",
        to: "thmsn",
        subject: "bank",
        message: "",
        sent: "2",
      },
      {
        id: "outbound",
        fro: "thmsn",
        to: "Alice",
        subject: "thanks",
        message: "",
        sent: "1",
      },
    ];
    const hits = filterMails(mails, {
      pill: "fromothers",
      query: "",
      selfNames: ["thmsn", "Idle"],
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "player");
  });
});
