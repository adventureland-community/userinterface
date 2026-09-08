/**
 * Chat send scripts + store + history + unread.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildChatSendScript,
  clearChatMessages,
  formatChatUnreadBadge,
  getChatHistoryState,
  getChatMessages,
  getChatUnread,
  historyRowToChatMessage,
  normalizeMessagesPage,
  prependHistoryPage,
  pushAmbientChat,
  pushSystemChat,
  resetChatStore,
  setChatPanelOpen,
  truncateChatMessage,
} from "../src/host/chat";
import { formatChatTimestamp, resolveChatInlineColor } from "../src/ui/frames/chat/ChatPanel";

afterEach(() => {
  resetChatStore();
});

describe("buildChatSendScript", () => {
  it("wraps say for ambient messages", () => {
    const script = buildChatSendScript("say", 'hi "there"');
    assert.ok(script);
    assert.ok(script!.indexOf("say(") >= 0);
    assert.ok(script!.indexOf(JSON.stringify('hi "there"')) >= 0);
  });

  it("routes slash commands through say even in party mode", () => {
    const script = buildChatSendScript("party", "/list");
    assert.ok(script);
    assert.ok(script!.indexOf("say(") >= 0);
    assert.equal(script!.indexOf("party_say"), -1);
  });

  it("builds party_say and private_say", () => {
    const party = buildChatSendScript("party", "ready?");
    assert.ok(party);
    assert.ok(party!.indexOf("party_say(") >= 0);
    const whisper = buildChatSendScript("whisper", "psst", "Bob");
    assert.ok(whisper);
    assert.ok(whisper!.indexOf("private_say(") >= 0);
    assert.ok(whisper!.indexOf(JSON.stringify("Bob")) >= 0);
  });

  it("rejects empty whisper target", () => {
    assert.equal(buildChatSendScript("whisper", "hi", "  "), null);
    assert.equal(buildChatSendScript("say", "   "), null);
  });

  it("truncates long messages", () => {
    const long = "x".repeat(1500);
    assert.equal(truncateChatMessage(long).length, 1200);
  });
});

describe("chat store", () => {
  it("keeps ambient and system lines", () => {
    pushAmbientChat({ owner: "Alice", message: "hello", id: 1 });
    pushSystemChat("server notice", "orange");
    const rows = getChatMessages();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].channel, "say");
    assert.equal(rows[0].owner, "Alice");
    assert.equal(rows[1].channel, "system");
    clearChatMessages();
    assert.equal(getChatMessages().length, 0);
  });

  it("prepends pull_messages pages oldest→newest and tracks cursor", () => {
    pushAmbientChat({ owner: "Live", message: "now" });
    const page = normalizeMessagesPage({
      type: "messages",
      mtype: "SR_EUI",
      more: true,
      cursor: "200",
      messages: [
        {
          id: "m2",
          fro: "Bob",
          message: "second",
          type: "server",
          date: "2026-09-08T12:01:00Z",
        },
        {
          id: "m1",
          fro: "Alice",
          message: "first",
          type: "server",
          date: "2026-09-08T12:00:00Z",
        },
      ],
    });
    const added = prependHistoryPage(page);
    assert.equal(added, 2);
    const rows = getChatMessages();
    assert.equal(rows[0].owner, "Alice");
    assert.equal(rows[1].owner, "Bob");
    assert.equal(rows[2].owner, "Live");
    const hist = getChatHistoryState();
    assert.equal(hist.more, true);
    assert.equal(hist.cursor, "200");
    assert.equal(hist.loaded, true);
  });

  it("maps history rows to channels", () => {
    const pm = historyRowToChatMessage({
      id: "1",
      fro: "A",
      message: "hi",
      type: "private",
    });
    assert.equal(pm?.channel, "pm");
    const party = historyRowToChatMessage({
      id: "2",
      fro: "A",
      message: "go",
      type: "party",
    });
    assert.equal(party?.channel, "party");
  });
});

describe("chat unread + timestamps", () => {
  it("counts unread only while panel is closed", () => {
    setChatPanelOpen(false);
    pushAmbientChat({ owner: "Other", message: "ping" });
    assert.equal(getChatUnread(), 1);
    setChatPanelOpen(true);
    assert.equal(getChatUnread(), 0);
    pushAmbientChat({ owner: "Other", message: "while open" });
    assert.equal(getChatUnread(), 0);
    assert.equal(formatChatUnreadBadge(100), "99+");
  });

  it("formats compact timestamps", () => {
    const now = new Date();
    now.setHours(14, 5, 0, 0);
    assert.equal(formatChatTimestamp(now.getTime()), "14:05");
    assert.equal(formatChatTimestamp(0), "");
  });

  it("drops muted grey inline colors", () => {
    assert.equal(resolveChatInlineColor("say", "gray"), undefined);
    assert.equal(resolveChatInlineColor("say", "#46A0C6"), "#46A0C6");
    assert.equal(resolveChatInlineColor("system", "orange"), "orange");
  });
});
