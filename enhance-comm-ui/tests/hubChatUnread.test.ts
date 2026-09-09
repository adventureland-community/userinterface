import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baselineHubChatSeen,
  countHubChatUnread,
  formatHubUnreadBadge,
  isHubChatUnread,
  markHubChatSeen,
  rememberHubChat,
  resetHubConversations,
  selectHubChat,
} from "../src/host/chat/hubConversations";

describe("hub chat unread", () => {
  it("baselines first sight without unread, then flags newer latest", () => {
    resetHubConversations();
    const chat = rememberHubChat({
      type: "server",
      server: "SR_EUI",
      latest: {
        id: "1",
        date: "2026-09-09T10:00:00.000Z",
        fro: "A",
        message: "hi",
      },
    });
    baselineHubChatSeen(chat);
    assert.equal(isHubChatUnread(chat, false), false);
    assert.equal(countHubChatUnread(chat, false), 0);

    chat.latest = {
      id: "2",
      date: "2026-09-09T11:00:00.000Z",
      fro: "B",
      message: "yo",
    };
    assert.equal(isHubChatUnread(chat, false), true);
    assert.equal(countHubChatUnread(chat, false), 1);
    assert.equal(isHubChatUnread(chat, true), false);

    chat.messages = [
      {
        id: "2",
        date: "2026-09-09T11:00:00.000Z",
        fro: "B",
        message: "yo",
      },
      {
        id: "3",
        date: "2026-09-09T11:05:00.000Z",
        fro: "C",
        message: "hey",
      },
    ];
    chat.latest = chat.messages[1];
    assert.equal(countHubChatUnread(chat, false), 2);
    assert.equal(formatHubUnreadBadge(2), "2");
    assert.equal(formatHubUnreadBadge(120), "99+");

    selectHubChat(chat.key);
    assert.equal(isHubChatUnread(chat, true), false);
    markHubChatSeen(chat.key);
    assert.equal(chat.seen, "2026-09-09T11:05:00.000Z");
  });
});
