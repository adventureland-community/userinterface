import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateMailItems,
  findMailAggByKey,
  groupMailItemsByRecipient,
  mailAggTouchesFullCap,
  mailIdsAllChecked,
  mailIdsForItemsSelectAll,
  mailItemAggKey,
  mailsForAgg,
} from "../../src/host/mail/mailItemsOverview";
import type { MailRow } from "../../src/host/mail/types";

function row(
  partial: Partial<MailRow> & { id: string; item?: MailRow["item"] },
): MailRow {
  return {
    id: partial.id,
    fro: partial.fro ?? "A",
    to: partial.to ?? "thmsn",
    subject: partial.subject ?? "item",
    message: partial.message ?? "",
    sent: partial.sent ?? "1",
    item: partial.item,
    taken: partial.taken,
    takenPending: partial.takenPending,
    canTake: partial.canTake,
    read: partial.read,
  };
}

describe("mailItemAggKey", () => {
  it("matches bank-style name/level/title", () => {
    assert.equal(
      mailItemAggKey({ name: "jacko", level: 0 }),
      "jacko\x000\x00",
    );
    assert.equal(
      mailItemAggKey({ name: "jacko", level: 0, p: "shiny" }),
      "jacko\x000\x00shiny",
    );
  });
});

describe("aggregateMailItems", () => {
  it("merges same name/level across different fro/to", () => {
    const mails = [
      row({
        id: "1",
        fro: "A",
        to: "thmsn",
        item: { name: "jacko", level: 0 },
      }),
      row({
        id: "2",
        fro: "B",
        to: "merchBot",
        item: { name: "jacko", level: 0 },
      }),
      row({
        id: "3",
        fro: "A",
        to: "thmsn",
        item: { name: "wbreeches", level: 0 },
      }),
    ];
    const agg = aggregateMailItems(mails);
    assert.equal(agg.length, 2);
    const jacko = findMailAggByKey(agg, mailItemAggKey({ name: "jacko", level: 0 }));
    assert.ok(jacko);
    assert.equal(jacko!.mailIds.length, 2);
    assert.equal(jacko!.q, 2);
    assert.deepEqual(jacko!.recipients.sort(), ["merchBot", "thmsn"]);
  });

  it("sums stack quantities and excludes taken / canTake false", () => {
    const mails = [
      row({
        id: "1",
        item: { name: "citrus", q: 50 },
      }),
      row({
        id: "2",
        item: { name: "citrus", q: 20 },
      }),
      row({
        id: "3",
        item: { name: "citrus", q: 99 },
        taken: true,
      }),
      row({
        id: "4",
        item: { name: "citrus", q: 5 },
        canTake: false,
      }),
      row({
        id: "5",
        subject: "hi",
      }),
    ];
    const agg = aggregateMailItems(mails);
    assert.equal(agg.length, 1);
    assert.equal(agg[0].q, 70);
    assert.deepEqual(agg[0].mailIds, ["1", "2"]);
  });

  it("keeps pending claims in inventory (still occupy cap)", () => {
    const mails = [
      row({
        id: "1",
        item: { name: "gloves", level: 1 },
        taken: true,
        takenPending: true,
      }),
    ];
    const agg = aggregateMailItems(mails);
    assert.equal(agg.length, 1);
    assert.equal(agg[0].mailIds[0], "1");
  });
});

describe("groupMailItemsByRecipient", () => {
  it("splits stacks per destination and sorts by fill", () => {
    const mails = [
      row({
        id: "1",
        to: "thmsn",
        item: { name: "jacko", level: 0 },
      }),
      row({
        id: "2",
        to: "thmsn",
        item: { name: "jacko", level: 0 },
      }),
      row({
        id: "3",
        to: "merchBot",
        item: { name: "jacko", level: 0 },
      }),
    ];
    const sections = groupMailItemsByRecipient(mails);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].name, "thmsn");
    assert.equal(sections[0].fill?.count, 2);
    assert.equal(sections[0].items[0].mailIds.length, 2);
    assert.equal(sections[1].name, "merchBot");
    assert.equal(sections[1].items[0].mailIds.length, 1);
  });
});

describe("mailsForAgg / mailAggTouchesFullCap", () => {
  it("filters pool order and detects full-cap recipients", () => {
    const mails = [
      row({ id: "a", to: "thmsn", item: { name: "x" }, sent: "3" }),
      row({ id: "b", to: "other", item: { name: "x" }, sent: "2" }),
      row({ id: "c", to: "thmsn", item: { name: "y" }, sent: "1" }),
    ];
    const agg = aggregateMailItems(mails);
    const x = findMailAggByKey(agg, mailItemAggKey({ name: "x" }));
    assert.ok(x);
    assert.deepEqual(
      mailsForAgg(mails, x).map((m) => m.id),
      ["a", "b"],
    );
    assert.equal(
      mailAggTouchesFullCap(x!, [
        { name: "thmsn", count: 2178, pressure: "full" },
        { name: "other", count: 3, pressure: "" },
      ]),
      true,
    );
    assert.equal(
      mailAggTouchesFullCap(x!, [
        { name: "thmsn", count: 10, pressure: "" },
      ]),
      false,
    );
  });
});

describe("mailIdsForItemsSelectAll", () => {
  it("prefers the highlighted stack, else all inventory mails", () => {
    const mails = [
      row({ id: "1", item: { name: "jacko" } }),
      row({ id: "2", item: { name: "jacko" } }),
      row({ id: "3", item: { name: "gloves" } }),
      row({ id: "4", subject: "hi" }),
    ];
    const stack = mailIdsForItemsSelectAll(mails, ["2", "1"]);
    assert.equal(stack.kind, "stack");
    assert.deepEqual(stack.ids, ["1", "2"]);
    const all = mailIdsForItemsSelectAll(mails, null);
    assert.equal(all.kind, "all");
    assert.deepEqual(all.ids.sort(), ["1", "2", "3"]);
    assert.equal(
      mailIdsAllChecked(["1", "2"], { "1": true, "2": true, "9": true }),
      true,
    );
    assert.equal(mailIdsAllChecked(["1", "2"], { "1": true }), false);
  });
});

describe("cueMailItemsRecipient", () => {
  it("delivers once to live listeners and pending subscribers", async () => {
    const { cueMailItemsRecipient, subscribeMailItemsCue } = await import(
      "../../src/host/mail/mailSession"
    );
    const seen: string[] = [];
    const unsub = subscribeMailItemsCue((c) => seen.push(c.recipient));
    cueMailItemsRecipient("thmsn");
    assert.deepEqual(seen, ["thmsn"]);
    unsub();
    cueMailItemsRecipient("RedMill");
    const late: string[] = [];
    const unsub2 = subscribeMailItemsCue((c) => late.push(c.recipient));
    assert.deepEqual(late, ["RedMill"]);
    unsub2();
  });
});
