import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildComposeSummary,
  buildMailMatchingToFreeOwnDraft,
  composeSendBlockReason,
} from "../../src/host/mail/composeExperience";
import type { MailRow } from "../../src/host/mail/types";

function row(
  id: string,
  opts: Partial<MailRow> & { item?: MailRow["item"] },
): MailRow {
  const m: MailRow = {
    id,
    fro: opts.fro || "thmsn",
    to: opts.to || "thmsn",
    subject: "x",
    message: "",
    sent: "1",
  };
  if (opts.item) m.item = opts.item;
  if (opts.canTake != null) m.canTake = opts.canTake;
  return m;
}

describe("buildMailMatchingToFreeOwnDraft", () => {
  it("queues matching, sets free own To, and distributes", () => {
    const planned = buildMailMatchingToFreeOwnDraft({
      draft: { to: [], subject: "", body: "", attaches: [] },
      fingerprints: [
        { slot: 1, name: "helmet", level: 5, p: "festive" },
        { slot: 4, name: "helmet", level: 5, p: "festive" },
        { slot: 7, name: "helmet", level: 5, p: "festive" },
      ],
      freeOwnNames: ["Ahnaki", "RedMill"],
    });
    assert.equal(planned.draft.to.length, 2);
    assert.equal(planned.draft.attaches.length, 3);
    assert.equal(planned.assigned, 3);
    assert.equal(planned.needTo, 0);
    assert.equal(planned.draft.attaches[0].to, "Ahnaki");
    assert.equal(planned.draft.attaches[1].to, "RedMill");
    assert.equal(planned.draft.attaches[2].to, "Ahnaki");
    assert.match(planned.status, /Queued/);
    assert.match(planned.status, /free own/);
  });

  it("leaves leftovers when more items than free own", () => {
    const planned = buildMailMatchingToFreeOwnDraft({
      draft: { to: [], subject: "", body: "", attaches: [] },
      fingerprints: [
        { slot: 0, name: "cape" },
        { slot: 1, name: "cape" },
      ],
      freeOwnNames: [],
    });
    assert.equal(planned.needTo, 2);
    assert.equal(planned.statusKind, "warn");
    assert.match(planned.status, /still need To|0 free own/);
  });

  it("replaces prior To (including full sticky own) with free own only", () => {
    const planned = buildMailMatchingToFreeOwnDraft({
      draft: {
        to: ["Ahnaki", "Friend", "thmsn"],
        subject: "keep me",
        body: "hi",
        attaches: [{ slot: 9, name: "helmet", to: "Ahnaki" }],
      },
      fingerprints: [
        { slot: 1, name: "helmet", level: 5 },
        { slot: 2, name: "helmet", level: 5 },
      ],
      freeOwnNames: ["RedMill", "Idle"],
    });
    assert.deepEqual(planned.draft.to, ["RedMill", "Idle"]);
    assert.equal(planned.draft.attaches.length, 3);
    assert.equal(planned.draft.attaches[0].to, "RedMill");
    assert.equal(planned.draft.attaches[1].to, "Idle");
    assert.equal(planned.draft.attaches[2].to, "RedMill");
    assert.equal(planned.draft.subject, "keep me");
  });
});

describe("buildComposeSummary / composeSendBlockReason", () => {
  it("summarizes queued vs need To and free own", () => {
    const summary = buildComposeSummary({
      draft: {
        to: ["thmsn"],
        subject: "",
        body: "",
        attaches: [
          { slot: 0, name: "cape", to: "thmsn" },
          { slot: 1, name: "cape", to: "" },
        ],
      },
      mails: [],
      selfNames: ["thmsn", "Idle"],
    });
    assert.equal(summary.queued, 2);
    assert.equal(summary.withTo, 1);
    assert.equal(summary.needTo, 1);
    assert.match(summary.line, /2 queued/);
    assert.match(summary.line, /1 need To/);
  });

  it("blocks send when an attach lacks To", () => {
    const block = composeSendBlockReason({
      draft: {
        to: ["thmsn"],
        subject: "",
        body: "",
        attaches: [{ slot: 0, name: "cape", to: "" }],
      },
      mails: [],
      selfNames: ["thmsn"],
    });
    assert.ok(block);
    assert.match(block!.reason, /need/i);
  });

  it("blocks send when recipient is at sender cap", () => {
    const mails: MailRow[] = [];
    for (let i = 0; i < 20; i++) {
      mails.push(
        row("s" + i, {
          fro: "thmsn",
          to: "RedMill",
          item: { name: "a" },
          canTake: true,
        }),
      );
    }
    const block = composeSendBlockReason({
      draft: {
        to: ["RedMill"],
        subject: "",
        body: "",
        attaches: [{ slot: 3, name: "cape", to: "RedMill" }],
      },
      mails,
      selfNames: ["thmsn", "RedMill"],
    });
    assert.ok(block);
    assert.match(block!.reason, /cap/i);
  });
});
