import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNewMailToast,
  formatMailRoute,
  formatMailWhat,
  formatNewMailPlainLine,
  pickNewMailRows,
} from "../src/host/mail/mailNewNotify";
import type { MailRow } from "../src/host/mail/types";

function row(partial: Partial<MailRow> & Pick<MailRow, "id">): MailRow {
  return {
    fro: "Alice",
    to: "Bob",
    subject: "hi",
    message: "",
    sent: "2026-01-01",
    ...partial,
  };
}

describe("mailNewNotify", () => {
  it("prefers unread rows newest-first", () => {
    const mails = [
      row({ id: "1", read: true }),
      row({ id: "2", read: false, fro: "NPC", to: "Hero" }),
      row({ id: "3", read: false, fro: "Vendor", to: "Hero" }),
    ];
    const picks = pickNewMailRows(mails, 2);
    assert.equal(picks.length, 2);
    assert.equal(picks[0].id, "2");
    assert.equal(picks[1].id, "3");
  });

  it("falls back to inbox head when nothing is unread", () => {
    const mails = [
      row({ id: "a", read: true }),
      row({ id: "b", read: true }),
    ];
    const picks = pickNewMailRows(mails, 1);
    assert.equal(picks[0].id, "a");
  });

  it("formats route and attachment what-line", () => {
    const withItem = row({
      id: "x",
      fro: "Merchant",
      to: "Warrior",
      item: { name: "hpot0", q: 3 },
    });
    assert.equal(formatMailRoute(withItem), "Merchant → Warrior");
    assert.match(formatMailWhat(withItem), /×3/);
    assert.match(formatNewMailPlainLine(withItem), /Merchant → Warrior/);

    const textOnly = row({
      id: "y",
      subject: "Welcome",
      item: undefined,
    });
    assert.equal(formatMailWhat(textOnly), "Welcome");
  });

  it("builds toast text and keeps rows for ItemInstance rendering", () => {
    const toast = buildNewMailToast(
      [
        row({
          id: "1",
          fro: "A",
          to: "B",
          item: { name: "scroll0", level: 0 },
        }),
        row({ id: "2", fro: "C", to: "D", subject: "thanks" }),
      ],
      2,
    );
    assert.equal(toast.head, "2 new mails");
    assert.match(toast.text, /2 new mails/);
    assert.match(toast.text, /A → B/);
    assert.match(toast.text, /C → D/);
    assert.equal(toast.rows.length, 2);
    assert.equal(toast.rows[0].id, "1");
    assert.ok(toast.durationMs > 3200);
  });

  it("falls back to count-only toast when rows missing", () => {
    const toast = buildNewMailToast([], 3);
    assert.equal(toast.text, "3 new mails");
    assert.equal(toast.head, "3 new mails");
    assert.equal(toast.rows.length, 0);
  });
});
