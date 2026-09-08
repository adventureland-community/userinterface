/**
 * Ring buffer of chat lines for the /comm Chat panel.
 * Stock `add_chat` is a no-op when `window.is_comm` — we keep our own log.
 */

import type { ChatChannel, ChatMessage } from "./types";
import {
  historyRowToChatMessage,
  pullMessagesPage,
  resolveHistoryType,
  type PullMessagesPage,
} from "./history";
import { noteChatUnread, resetChatUnread } from "./unread";

/** Live + history cap (stock friends page is 200; allow a few pages). */
const MAX_MESSAGES = 800;

type Listener = () => void;

const listeners: Listener[] = [];
let messages: ChatMessage[] = [];
let seq = 0;
const seenIds = new Set<string>();

export type ChatHistoryState = {
  type: string;
  cursor: string | null;
  more: boolean;
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

let history: ChatHistoryState = {
  type: "",
  cursor: null,
  more: false,
  loaded: false,
  loading: false,
  error: null,
};

function notify(): void {
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function subscribeChat(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getChatMessages(): readonly ChatMessage[] {
  return messages;
}

export function getChatHistoryState(): ChatHistoryState {
  return { ...history };
}

export function clearChatMessages(): void {
  messages = [];
  seenIds.clear();
  history = {
    type: "",
    cursor: null,
    more: false,
    loaded: false,
    loading: false,
    error: null,
  };
  notify();
}

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function rememberId(id: string): boolean {
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  return true;
}

function trimMessages(): void {
  if (messages.length <= MAX_MESSAGES) return;
  const drop = messages.length - MAX_MESSAGES;
  for (let i = 0; i < drop; i++) {
    seenIds.delete(messages[i].id);
  }
  messages = messages.slice(drop);
}

export function pushChatMessage(
  partial: Omit<ChatMessage, "id" | "at"> & { id?: string; at?: number },
): ChatMessage | null {
  const id = partial.id || nextId(partial.channel);
  if (!rememberId(id)) return null;
  const row: ChatMessage = {
    id,
    at: partial.at != null ? partial.at : Date.now(),
    channel: partial.channel,
    owner: partial.owner || "",
    message: partial.message || "",
    color: partial.color,
    xserver: partial.xserver,
    entityId: partial.entityId,
    local: partial.local,
  };
  messages = messages.concat([row]);
  trimMessages();
  noteChatUnread(row);
  notify();
  return row;
}

export function pushAmbientChat(data: {
  owner?: string;
  message?: string;
  color?: string;
  id?: string | number;
}): void {
  const message = data.message != null ? String(data.message) : "";
  if (!message) return;
  pushChatMessage({
    channel: "say",
    owner: data.owner != null ? String(data.owner) : "",
    message,
    color: data.color != null ? String(data.color) : undefined,
    entityId: data.id != null ? String(data.id) : undefined,
  });
}

export function pushSystemChat(message: string, color?: string): void {
  const text = String(message || "");
  if (!text) return;
  pushChatMessage({
    channel: "system",
    owner: "",
    message: text,
    color: color || "gray",
  });
}

export function pushPartyChat(owner: string, message: string): void {
  const text = String(message || "");
  if (!text) return;
  pushChatMessage({
    channel: "party",
    owner: owner || "",
    message: text,
    color: "#46A0C6",
  });
}

export function pushPmChat(
  owner: string,
  message: string,
  opts?: { xserver?: boolean; local?: boolean },
): void {
  const text = String(message || "");
  if (!text) return;
  pushChatMessage({
    channel: "pm",
    owner: owner || "",
    message: text,
    color: "#CD7879",
    xserver: opts?.xserver,
    local: opts?.local,
  });
}

export function pushLocalPartyChat(owner: string, message: string): void {
  pushChatMessage({
    channel: "party",
    owner,
    message,
    color: "#46A0C6",
    local: true,
  });
}

/**
 * Prepend a pull_messages page (API returns newest-first; we reverse to
 * chronological order for the log).
 */
export function prependHistoryPage(page: PullMessagesPage): number {
  const chronological: ChatMessage[] = [];
  for (let i = page.messages.length - 1; i >= 0; i--) {
    const row = historyRowToChatMessage(page.messages[i]);
    if (!row) continue;
    if (!rememberId(row.id)) continue;
    chronological.push(row);
  }
  if (chronological.length) {
    messages = chronological.concat(messages);
    trimMessages();
  }
  history = {
    ...history,
    type: page.mtype || history.type,
    cursor: page.more ? page.cursor : null,
    more: page.more,
    loaded: true,
    loading: false,
    error: null,
  };
  notify();
  return chronological.length;
}

/**
 * Load first page (or next older page). Returns how many rows were added.
 */
export async function loadChatHistory(opts?: {
  /** Force a fresh first page (e.g. after Clear). */
  reset?: boolean;
  type?: string;
}): Promise<{ ok: boolean; added: number; reason?: string }> {
  if (history.loading) return { ok: false, added: 0, reason: "busy" };

  const type = opts?.type || history.type || resolveHistoryType();
  const reset = opts?.reset === true || !history.loaded;
  if (!reset && !history.more) {
    return { ok: true, added: 0, reason: "end" };
  }

  const cursor = reset ? null : history.cursor;

  if (reset) {
    const kept: ChatMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (String(msg.id).indexOf("hist-") === 0) {
        seenIds.delete(msg.id);
        continue;
      }
      kept.push(msg);
    }
    messages = kept;
  }

  history = {
    ...history,
    type,
    loading: true,
    error: null,
    ...(reset ? { cursor: null, more: false, loaded: false } : null),
  };
  notify();

  const res = await pullMessagesPage({ type, cursor });

  if (!res.ok || !res.data) {
    history = {
      ...history,
      loading: false,
      error: res.reason || "failed",
      loaded: history.loaded || false,
    };
    notify();
    return { ok: false, added: 0, reason: res.reason || "failed" };
  }

  const added = prependHistoryPage(res.data);
  return { ok: true, added };
}

/** Test / teardown helper. */
export function resetChatStore(): void {
  messages = [];
  seq = 0;
  seenIds.clear();
  history = {
    type: "",
    cursor: null,
    more: false,
    loaded: false,
    loading: false,
    error: null,
  };
  resetChatUnread();
}

export type { ChatChannel, ChatMessage };
