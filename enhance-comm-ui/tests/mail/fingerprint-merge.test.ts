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

describe("mail fingerprint", () => {
  it("matches name/level/q", () => {
    assert.equal(
      itemMatchesFingerprint(
        { name: "gloves", level: 8, q: 1 },
        { slot: 3, name: "gloves", level: 8, q: 1 },
      ),
      true,
    );
    assert.equal(
      itemMatchesFingerprint(
        { name: "gloves", level: 7 },
        { slot: 3, name: "gloves", level: 8 },
      ),
      false,
    );
  });

  it("finds slot after reshuffle", () => {
    const items = [
      null,
      { name: "intearring", level: 3 },
      { name: "hpots" },
    ];
    assert.equal(
      findFingerprintSlot(items, {
        slot: 5,
        name: "intearring",
        level: 3,
      }),
      1,
    );
    assert.equal(
      findFingerprintSlot(
        items,
        { slot: 1, name: "intearring", level: 3 },
        new Set([1]),
      ),
      -1,
    );
  });
});

describe("mail merge", () => {
  it("soft-merges head without dropping older", () => {
    const older: MailRow = {
      id: "old",
      fro: "A",
      to: "B",
      subject: "x",
      message: "",
      sent: "1",
      read: true,
    };
    const head: MailRow = {
      id: "new",
      fro: "C",
      to: "B",
      subject: "y",
      message: "",
      sent: "2",
      read: false,
    };
    const merged = mergeHeadPage([older], [head]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, "new");
    assert.equal(merged[1].id, "old");
  });

  it("appends cursor pages", () => {
    const a: MailRow = {
      id: "a",
      fro: "A",
      to: "B",
      subject: "",
      message: "",
      sent: "1",
    };
    const b: MailRow = {
      id: "b",
      fro: "A",
      to: "B",
      subject: "",
      message: "",
      sent: "0",
    };
    const next = appendCursorPage([a], [a, b]);
    assert.equal(next.length, 2);
  });

  it("parses stock JSON-string item payloads", () => {
    const page = normalizeMailPage({
      type: "mail",
      mail: [
        {
          id: "ML_1",
          fro: "thmsn",
          to: "thmsn",
          subject: "throwingstars",
          message: "",
          sent: "Sun Aug 16 2026",
          item: '{"name":"throwingstars","level":0}',
          taken: false,
        },
      ],
      more: true,
      cursor: "40",
    });
    assert.equal(page.mail.length, 1);
    assert.equal(page.mail[0].item?.name, "throwingstars");
    assert.equal(page.mail[0].item?.level, 0);
    assert.equal(page.mail[0].taken, false);
    assert.equal(page.more, true);
    assert.equal(page.cursor, "40");
  });

  it("parses object items and coerces taken flags", () => {
    const page = normalizeMailPage({
      mail: [
        {
          id: "a",
          fro: "A",
          to: "B",
          subject: "x",
          message: "",
          sent: "1",
          item: { name: "gloves", level: 2, q: 1 },
          taken: 0,
        },
        {
          id: "b",
          fro: "A",
          to: "B",
          subject: "y",
          message: "",
          sent: "2",
          item: JSON.stringify({ name: "helmet", level: "3" }),
          taken: "true",
        },
      ],
    });
    assert.equal(page.mail[0].item?.name, "gloves");
    assert.equal(page.mail[0].taken, false);
    assert.equal(page.mail[1].item?.name, "helmet");
    assert.equal(page.mail[1].item?.level, 3);
    assert.equal(page.mail[1].taken, true);
  });
});

describe("mail api extractInfs", () => {
  it("unwraps { success, infs } and bare mail bags", () => {
    const wrapped = extractInfs({
      success: true,
      infs: [{ type: "mail", mail: [{ id: "a" }] }],
    });
    assert.equal(wrapped.length, 1);
    assert.equal(wrapped[0].type, "mail");

    const bare = extractInfs({
      type: "mail",
      mail: [{ id: "b" }],
      more: false,
    });
    assert.equal(bare.length, 1);
    assert.equal(bare[0].type, "mail");
  });

  it("parses JSON string bodies", () => {
    const raw = extractInfs(
      JSON.stringify({
        success: true,
        infs: [{ type: "mail", mail: [{ id: "c" }] }],
      }),
    );
    assert.equal(raw.length, 1);
    assert.equal(raw[0].type, "mail");
  });

  it("unwraps mongodb read/delete infs on success bags", () => {
    const read = extractInfs({
      success: true,
      infs: [{ type: "unread", count: 3 }],
    });
    assert.equal(read.length, 1);
    assert.equal(read[0].type, "unread");
    assert.equal(read[0].count, 3);

    const del = extractInfs({
      success: true,
      infs: [{ type: "message", message: "Mail deleted." }],
    });
    assert.equal(del[0].message, "Mail deleted.");
  });
});

