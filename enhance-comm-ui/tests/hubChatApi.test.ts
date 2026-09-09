/**
 * Hub chat API helpers — normalize, keys, since cursor.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hubChatKey,
  hubChatSince,
  normalizePullChat,
  normalizePullChats,
} from "../src/host/chat/hubApi";

describe("normalizePullChats", () => {
  it("maps characters, chats, cursor, after, more", () => {
    const page = normalizePullChats({
      characters: [
        { name: "Alice", online: true, server: "EU I" },
        { name: "Bob", online: false },
        { name: "" },
        null,
      ],
      chats: [
        {
          type: "server",
          server: "SR_EUI",
          latest: { fro: "Alice", message: "hi", date: "2026-01-01T00:00:00.000Z" },
        },
        {
          type: "private",
          character: "Alice",
          to: "Bob",
          latest: { fro: "Bob", message: "yo", date: "2026-01-02T00:00:00.000Z" },
        },
        { type: "" },
        null,
      ],
      cursor: "cur1",
      after: "aft1",
      more: 1,
    });
    assert.equal(page.characters.length, 2);
    assert.equal(page.characters[0].name, "Alice");
    assert.equal(page.characters[0].online, true);
    assert.equal(page.characters[0].server, "EU I");
    assert.equal(page.characters[1].name, "Bob");
    assert.equal(page.characters[1].online, false);
    assert.equal(page.chats.length, 2);
    assert.equal(page.chats[0].type, "server");
    assert.equal(page.chats[1].type, "private");
    assert.equal(page.cursor, "cur1");
    assert.equal(page.after, "aft1");
    assert.equal(page.more, true);
  });

  it("defaults empty arrays and null cursors", () => {
    const page = normalizePullChats({});
    assert.deepEqual(page.characters, []);
    assert.deepEqual(page.chats, []);
    assert.equal(page.cursor, null);
    assert.equal(page.after, null);
    assert.equal(page.more, false);
  });
});

describe("normalizePullChat", () => {
  it("maps messages and paging fields", () => {
    const page = normalizePullChat({
      messages: [
        {
          id: "m1",
          fro: "Alice",
          message: "hello",
          date: "2026-01-01T00:00:00.000Z",
        },
        { id: 2, fro: "Bob", message: "hi", date: "2026-01-01T00:00:01.000Z" },
        { fro: "no-id" },
        null,
      ],
      cursor: "c",
      after: "a",
      more: true,
    });
    assert.equal(page.messages.length, 2);
    assert.equal(page.messages[0].id, "m1");
    assert.equal(page.messages[0].fro, "Alice");
    assert.equal(page.messages[1].id, "2");
    assert.equal(page.cursor, "c");
    assert.equal(page.after, "a");
    assert.equal(page.more, true);
  });
});

describe("hubChatKey", () => {
  it("builds server, private, and new keys", () => {
    assert.equal(
      hubChatKey({ type: "server", server: "SR_EUI" }),
      "server:SR_EUI",
    );
    assert.equal(hubChatKey({ type: "new" }), "new");
    assert.equal(
      hubChatKey({ type: "private", character: "Alice", to: "Bob" }),
      "private:alice:bob",
    );
    assert.equal(
      hubChatKey({ type: "private", character: "Bob", to: "Alice" }),
      "private:alice:bob",
    );
  });
});

describe("hubChatSince", () => {
  it("subtracts one second from the ISO before |", () => {
    const since = hubChatSince("2026-01-01T00:00:05.000Z|MS_9");
    assert.equal(since, "2026-01-01T00:00:04.000Z|MS_0");
  });
});
