/**
 * In-memory Hub chat conversation map (stock `comm_chat` chats/active/characters).
 */

import {
  hubChatKey,
  type HubChatCharacter,
  type HubChatLatest,
  type HubChatMessageRow,
  type HubChatSummary,
  type PullChatResult,
  type PullChatsResult,
} from "./hubApi";

export type HubConversation = {
  key: string;
  type: string;
  server?: string;
  character?: string;
  to?: string;
  sender?: string;
  latest?: HubChatLatest | null;
  seen?: string;
  messages: HubChatMessageRow[];
  draft: string;
  loaded: boolean;
  loading?: boolean;
  cursor?: string | null;
  after?: string | null;
  catchup_after?: string | null;
  scroll_bottom?: boolean;
  sending?: boolean;
  error?: string;
  retry?: number;
};

type Listener = () => void;

const listeners: Listener[] = [];
let chats: Record<string, HubConversation> = {};
let activeKey: string | null = null;
let characters: HubChatCharacter[] = [];

function notify(): void {
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function subscribeHubChat(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getHubConversations(): Readonly<Record<string, HubConversation>> {
  return chats;
}

export function getHubActiveKey(): string | null {
  return activeKey;
}

export function getHubActiveConversation(): HubConversation | null {
  if (!activeKey) return null;
  return chats[activeKey] || null;
}

/** Newest-first conversation list (excludes draft `new`). Party stays on top. */
export function listHubConversations(): HubConversation[] {
  const keys = Object.keys(chats);
  const out: HubConversation[] = [];
  for (let i = 0; i < keys.length; i++) {
    const chat = chats[keys[i]];
    if (!chat || chat.type === "new") continue;
    out.push(chat);
  }
  out.sort((a, b) => {
    if (a.type === "party" && b.type !== "party") return -1;
    if (b.type === "party" && a.type !== "party") return 1;
    const ad = (a.latest && a.latest.date) || "";
    const bd = (b.latest && b.latest.date) || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return a.key.localeCompare(b.key);
  });
  return out;
}

/**
 * Stock unread: latest newer than `seen`, and not the active conversation.
 * First sight baselines `seen` so existing history is not all marked unread.
 */
export function isHubChatUnread(
  chat: HubConversation,
  isActive: boolean,
): boolean {
  return countHubChatUnread(chat, isActive) > 0;
}

/**
 * Count messages newer than `seen`.
 * If the thread is not loaded yet but `latest` is newer, returns at least 1.
 */
export function countHubChatUnread(
  chat: HubConversation,
  isActive: boolean,
): number {
  if (isActive) return 0;
  if (!chat.seen) return 0;
  const seen = chat.seen;
  let n = 0;
  for (let i = 0; i < chat.messages.length; i++) {
    const msg = chat.messages[i];
    if (msg && msg.date && msg.date > seen) n += 1;
  }
  if (n > 0) return n;
  if (chat.latest && chat.latest.date && chat.latest.date > seen) return 1;
  return 0;
}

/** Format a compact unread badge (caps at 99+). */
export function formatHubUnreadBadge(n: number): string {
  const c = Math.max(0, Math.floor(Number(n) || 0));
  if (c <= 0) return "";
  if (c > 99) return "99+";
  return String(c);
}

/** Mark conversation read through its current latest message. */
export function markHubChatSeen(key: string): void {
  const chat = chats[key];
  if (!chat) return;
  if (chat.latest && chat.latest.date) chat.seen = chat.latest.date;
  else if (!chat.seen) chat.seen = new Date().toISOString();
  notify();
}

/** First list sight — baseline seen without flashing unread (stock behavior). */
export function baselineHubChatSeen(chat: HubConversation): void {
  if (chat.seen) return;
  chat.seen = (chat.latest && chat.latest.date) || new Date().toISOString();
}

/** Ensure the live Party (observe) conversation exists. */
export function ensurePartyConversation(): HubConversation {
  return rememberHubChat({ type: "party" });
}

export function getHubCharacters(): readonly HubChatCharacter[] {
  return characters;
}

export function resetHubConversations(): void {
  chats = {};
  activeKey = null;
  characters = [];
  notify();
}

/** Upsert a conversation from a partial summary (stock `comm_chat_remember`). */
export function rememberHubChat(
  partial: HubChatSummary & { type: string },
): HubConversation {
  const key = hubChatKey(partial);
  let saved = chats[key];
  if (!saved) {
    saved = {
      key,
      type: partial.type,
      server: partial.server,
      character: partial.character,
      to: partial.to,
      latest: partial.latest || null,
      messages: [],
      draft: "",
      loaded: false,
    };
    chats[key] = saved;
  } else {
    if (
      partial.latest &&
      (!saved.latest ||
        (partial.latest.date || "") >= (saved.latest.date || ""))
    ) {
      saved.latest = partial.latest;
    }
    if (partial.character) saved.character = partial.character;
    if (partial.to) saved.to = partial.to;
    if (partial.server) saved.server = partial.server;
  }
  notify();
  return saved;
}

export function selectHubChat(key: string): HubConversation | null {
  const chat = chats[key];
  if (!chat) return null;
  activeKey = key;
  chat.scroll_bottom = true;
  if (chat.latest && chat.latest.date) chat.seen = chat.latest.date;
  notify();
  return chat;
}

/** Activate the draft `new` conversation (optionally prefill `to`). */
export function setHubActiveNew(to?: string): HubConversation {
  if (to) {
    const want = to.toLowerCase();
    const keys = Object.keys(chats);
    let best: HubConversation | null = null;
    for (let i = 0; i < keys.length; i++) {
      const chat = chats[keys[i]];
      if (!chat || chat.type !== "private") continue;
      if ((chat.to || "").toLowerCase() !== want) continue;
      if (
        !best ||
        (chat.latest?.date || "") > (best.latest?.date || "")
      ) {
        best = chat;
      }
    }
    if (best) {
      selectHubChat(best.key);
      return best;
    }
  }

  const draft = rememberHubChat({ type: "new", to: to || "" });
  if (to) draft.to = to;
  selectHubChat(draft.key);
  return draft;
}

function seedServersFromX(): void {
  const servers =
    typeof window !== "undefined" && window.X && Array.isArray(window.X.servers)
      ? window.X.servers
      : [];
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i] as { key?: string };
    if (!server || !server.key) continue;
    const key = hubChatKey({ type: "server", server: String(server.key) });
    if (!chats[key]) {
      rememberHubChat({ type: "server", server: String(server.key) });
    }
  }
}

/** Apply a `pull_chats` page into the conversation map. */
export function applyPullChatsResult(data: PullChatsResult): void {
  characters = data.characters.slice();
  for (let i = 0; i < data.chats.length; i++) {
    const row = data.chats[i];
    if (row && row.type) rememberHubChat(row);
  }
  const keys = Object.keys(chats);
  let hasServer = false;
  for (let i = 0; i < keys.length; i++) {
    if (chats[keys[i]]?.type === "server") {
      hasServer = true;
      break;
    }
  }
  if (!hasServer) seedServersFromX();
  notify();
}

/**
 * Merge a `pull_chat` page into `key`.
 * `older` updates the older-page cursor; fresh loads set cursor when not yet loaded.
 */
export function applyPullChatResult(
  key: string,
  data: PullChatResult,
  older: boolean,
): HubConversation | null {
  const chat = chats[key];
  if (!chat) return null;

  const byId: Record<string, HubChatMessageRow> = {};
  for (let i = 0; i < chat.messages.length; i++) {
    const msg = chat.messages[i];
    if (msg && msg.id) byId[msg.id] = msg;
  }
  for (let i = 0; i < data.messages.length; i++) {
    const msg = data.messages[i];
    if (msg && msg.id) byId[msg.id] = msg;
  }
  const merged: HubChatMessageRow[] = [];
  const ids = Object.keys(byId);
  for (let i = 0; i < ids.length; i++) {
    merged.push(byId[ids[i]]);
  }
  chat.messages = merged;

  if (older || !chat.loaded) chat.cursor = data.cursor;
  if (!older) {
    if (!chat.after || (data.after || "") > (chat.after || "")) {
      chat.after = data.after;
    }
  }
  chat.loaded = true;
  chat.loading = false;

  // Prefer newest by date among the page (stock uses first vs last depending on `after`).
  let best: HubChatMessageRow | null = null;
  for (let i = 0; i < data.messages.length; i++) {
    const msg = data.messages[i];
    if (!best || (msg.date || "") >= (best.date || "")) best = msg;
  }
  if (best && (!chat.latest || (best.date || "") >= (chat.latest.date || ""))) {
    chat.latest = best;
  }
  if (activeKey === key && chat.latest && chat.latest.date) {
    chat.seen = chat.latest.date;
  }

  notify();
  return chat;
}
