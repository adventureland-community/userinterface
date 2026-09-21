/**
 * Mail search must see the full loaded inbox — citrus (and any attachment)
 * sitting past the first pull_mail page is invisible until older pages land.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterMails } from "../../src/host/mail/filter";
import {
  mailSearchEmptyHint,
  mailSearchWantsBurst,
} from "../../src/host/mail/mailSearchCoverage";
import { normalizeMailPage, parseMailItem } from "../../src/host/mail/merge";
import type { MailRow } from "../../src/host/mail/types";

function row(
  id: string,
  extra?: Partial<MailRow>,
): MailRow {
  return Object.assign(
    {
      id,
      fro: "A",
      to: "Wizard",
      subject: "note",
      message: "",
      sent: id,
      read: true,
    },
    extra || {},
  );
}

describe("mail citrus search / cache coverage", () => {
  it("free-text citrus matches loaded attachment rows", () => {
    const mails = [
      row("1", { item: { name: "citrus", q: 270 }, taken: false }),
      row("2", { subject: "hello" }),
    ];
    const hits = filterMails(mails, {
      pill: "all",
      query: "citrus",
      selfNames: ["Wizard"],
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "1");
    assert.equal(
      filterMails(mails, {
        pill: "all",
        query: "item:citrus",
        selfNames: ["Wizard"],
      }).length,
      1,
    );
  });

  it("RED: citrus only on unloaded older pages → 0 hits (cache gap)", () => {
    const head: MailRow[] = [];
    for (let i = 0; i < 40; i++) {
      head.push(row("n" + i, { subject: "recent " + i }));
    }
    const citrus = row("citrus-mail", {
      fro: "BankBot",
      subject: "stash",
      item: { name: "citrus", q: 270 },
      taken: false,
      sent: "0",
    });
    const onlyHead = filterMails(head, {
      pill: "all",
      query: "citrus",
      selfNames: ["Wizard"],
    });
    assert.equal(
      onlyHead.length,
      0,
      "documents: search cannot see citrus until older pages are loaded",
    );
    const full = filterMails(head.concat([citrus]), {
      pill: "all",
      query: "citrus",
      selfNames: ["Wizard"],
    });
    assert.equal(full.length, 1);
  });

  it("burst prefetch while query active and hasMore", () => {
    assert.equal(
      mailSearchWantsBurst({ query: "citrus", hasMore: true }),
      true,
    );
    assert.equal(
      mailSearchWantsBurst({ query: "citrus", hasMore: false }),
      false,
    );
    assert.equal(mailSearchWantsBurst({ query: "  ", hasMore: true }), false);
  });

  it("empty hint while older pages still loading", () => {
    assert.equal(
      mailSearchEmptyHint({
        query: "citrus",
        hasMore: true,
        matchCount: 0,
        loadedCount: 40,
      }),
      "No matches in 40 loaded — fetching older mail…",
    );
    assert.equal(
      mailSearchEmptyHint({
        query: "citrus",
        hasMore: false,
        matchCount: 0,
        loadedCount: 200,
      }),
      "No matches",
    );
    assert.equal(
      mailSearchEmptyHint({
        query: "citrus",
        hasMore: true,
        matchCount: 2,
        loadedCount: 80,
      }),
      null,
    );
  });

  it("parses bare item name strings (not only JSON objects)", () => {
    assert.deepEqual(parseMailItem("citrus"), { name: "citrus" });
    assert.deepEqual(parseMailItem(JSON.stringify("citrus")), {
      name: "citrus",
    });
    const page = normalizeMailPage({
      mail: [
        {
          id: "1",
          fro: "a",
          to: "b",
          subject: "",
          message: "",
          sent: "1",
          item: JSON.stringify("citrus"),
          taken: false,
        },
      ],
    });
    assert.equal(page.mail[0].item?.name, "citrus");
  });
});
