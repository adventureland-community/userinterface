/**
 * Hub `/hub` chat JSON API — `pull_chats`, `pull_chat`, `send_message`.
 *
 * POST `/api/<method>` with credentials (same as mail / history).
 * Stock `api_call` is a soft fallback when fetch misses the payload shape.
 */

import { extractInfs } from "../mail/api";

const API_TIMEOUT_MS = 12000;

type InfBag = { type?: string; failed?: unknown; [key: string]: unknown };

type ApiCallFn = (
  method: string,
  args?: Record<string, unknown>,
  rArgs?: Record<string, unknown>,
) => unknown;

export type HubChatCharacter = {
  name: string;
  online?: boolean;
  server?: string;
};

export type HubChatLatest = {
  id?: string;
  fro?: string;
  message?: string;
  date?: string;
  [key: string]: unknown;
};

export type HubChatSummary = {
  type: string;
  server?: string;
  character?: string;
  to?: string;
  latest?: HubChatLatest | null;
  [key: string]: unknown;
};

export type HubChatMessageRow = {
  id: string;
  fro: string;
  message: string;
  date: string;
  [key: string]: unknown;
};

export type PullChatsResult = {
  characters: HubChatCharacter[];
  chats: HubChatSummary[];
  cursor: string | null;
  after: string | null;
  more: boolean;
};

export type PullChatResult = {
  messages: HubChatMessageRow[];
  cursor: string | null;
  after: string | null;
  more: boolean;
};

export type HubApiResult<T> = {
  ok: boolean;
  data?: T;
  reason?: string;
};

function getApiCall(): ApiCallFn | null {
  const fn = (window as Window & { api_call?: ApiCallFn }).api_call;
  return typeof fn === "function" ? fn : null;
}

function postJson(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; json: unknown } | null> {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
    .then(async (res) => {
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { ok: res.ok, json };
    })
    .catch(() => null);
}

function asCursor(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function normalizeCharacter(row: unknown): HubChatCharacter | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as { name?: unknown; online?: unknown; server?: unknown };
  if (obj.name == null || obj.name === "") return null;
  const out: HubChatCharacter = { name: String(obj.name) };
  if (obj.online != null) out.online = !!obj.online;
  if (obj.server != null && obj.server !== "") out.server = String(obj.server);
  return out;
}

function normalizeChatSummary(row: unknown): HubChatSummary | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as HubChatSummary;
  if (!obj.type) return null;
  return obj;
}

function normalizeMessageRow(row: unknown): HubChatMessageRow | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as {
    id?: unknown;
    fro?: unknown;
    message?: unknown;
    date?: unknown;
  };
  if (obj.id == null || obj.id === "") return null;
  return {
    ...(row as HubChatMessageRow),
    id: String(obj.id),
    fro: obj.fro != null ? String(obj.fro) : "",
    message: obj.message != null ? String(obj.message) : "",
    date: obj.date != null ? String(obj.date) : "",
  };
}

/** Normalize `pull_chats` info payload. */
export function normalizePullChats(info: {
  characters?: unknown;
  chats?: unknown;
  cursor?: unknown;
  after?: unknown;
  more?: unknown;
}): PullChatsResult {
  const rawChars = Array.isArray(info.characters) ? info.characters : [];
  const characters: HubChatCharacter[] = [];
  for (let i = 0; i < rawChars.length; i++) {
    const row = normalizeCharacter(rawChars[i]);
    if (row) characters.push(row);
  }
  const rawChats = Array.isArray(info.chats) ? info.chats : [];
  const chats: HubChatSummary[] = [];
  for (let i = 0; i < rawChats.length; i++) {
    const row = normalizeChatSummary(rawChats[i]);
    if (row) chats.push(row);
  }
  return {
    characters,
    chats,
    cursor: asCursor(info.cursor),
    after: asCursor(info.after),
    more: !!info.more,
  };
}

/** Normalize `pull_chat` info payload. */
export function normalizePullChat(info: {
  messages?: unknown;
  cursor?: unknown;
  after?: unknown;
  more?: unknown;
}): PullChatResult {
  const raw = Array.isArray(info.messages) ? info.messages : [];
  const messages: HubChatMessageRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = normalizeMessageRow(raw[i]);
    if (row) messages.push(row);
  }
  return {
    messages,
    cursor: asCursor(info.cursor),
    after: asCursor(info.after),
    more: !!info.more,
  };
}

function hasChatsShape(obj: InfBag): boolean {
  return Array.isArray(obj.chats) || Array.isArray(obj.characters);
}

function hasMessagesShape(obj: InfBag): boolean {
  return Array.isArray(obj.messages);
}

function findInInfs(
  infs: InfBag[],
  match: (info: InfBag) => boolean,
): InfBag | null {
  for (let i = 0; i < infs.length; i++) {
    const info = infs[i];
    if (info && match(info)) return info;
  }
  return null;
}

/** Prefer infs; accept bare stock `api_call` resolve objects. */
function findPullChatsInfo(ct: unknown): InfBag | null {
  const fromInfs = findInInfs(extractInfs(ct), hasChatsShape);
  if (fromInfs) return fromInfs;
  if (ct && typeof ct === "object" && !Array.isArray(ct)) {
    const obj = ct as InfBag;
    if (obj.failed) return null;
    if (hasChatsShape(obj)) return obj;
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const data = obj.data as InfBag;
      if (hasChatsShape(data)) return data;
    }
  }
  return null;
}

function findPullChatInfo(ct: unknown): InfBag | null {
  const fromInfs = findInInfs(extractInfs(ct), hasMessagesShape);
  if (fromInfs) return fromInfs;
  if (ct && typeof ct === "object" && !Array.isArray(ct)) {
    const obj = ct as InfBag;
    if (obj.failed) return null;
    if (hasMessagesShape(obj)) return obj;
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const data = obj.data as InfBag;
      if (hasMessagesShape(data)) return data;
    }
  }
  return null;
}

function isFailedPayload(ct: unknown): boolean {
  if (!ct || typeof ct !== "object") return false;
  return !!(ct as InfBag).failed;
}

function callApiStock(method: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (data: unknown) => {
      if (settled) return;
      settled = true;
      resolve(data);
    };

    const api = getApiCall();
    if (!api) {
      finish(null);
      return;
    }

    const timer = window.setTimeout(() => finish(null), API_TIMEOUT_MS);

    try {
      const maybePromise = api(method, { ...args }, { silent: true, timeout: API_TIMEOUT_MS });

      if (
        maybePromise &&
        typeof (maybePromise as Promise<unknown>).then === "function"
      ) {
        (maybePromise as Promise<unknown>)
          .then((data) => {
            window.clearTimeout(timer);
            finish(data);
          })
          .catch((data) => {
            window.clearTimeout(timer);
            finish(data);
          });
      } else {
        window.clearTimeout(timer);
        finish(maybePromise);
      }
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}

async function fetchApiJson(
  method: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; json: unknown } | null> {
  const ctrl =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, API_TIMEOUT_MS);
  try {
    return await postJson(
      "/api/" + method,
      { ...args },
      ctrl ? ctrl.signal : undefined,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Conversation key — mirrors stock `comm_chat_key`.
 * Private names are lowercased before sort.
 */
export function hubChatKey(chat: {
  type: string;
  server?: string;
  character?: string;
  to?: string;
}): string {
  if (chat.type === "server") return "server:" + (chat.server || "");
  if (chat.type === "party") return "party";
  if (chat.type === "new") return "new";
  const a = (chat.character || "").toLowerCase();
  const b = (chat.to || "").toLowerCase();
  const pair = a < b ? a + ":" + b : b + ":" + a;
  return "private:" + pair;
}

/**
 * Catch-up `after` cursor — stock subtracts 1s from the ISO before `|`.
 */
export function hubChatSince(cursor: string): string {
  return (
    new Date(new Date(cursor.split("|")[0]).getTime() - 1000).toISOString() +
    "|MS_0"
  );
}

export async function pullChatsPage(opts?: {
  cursor?: string | null;
  after?: string | null;
}): Promise<HubApiResult<PullChatsResult>> {
  const args: Record<string, unknown> = {};
  if (opts?.cursor) args.cursor = opts.cursor;
  else if (opts?.after) args.after = opts.after;

  const res = await fetchApiJson("pull_chats", args);
  if (res && res.ok) {
    const info = findPullChatsInfo(res.json);
    if (info) return { ok: true, data: normalizePullChats(info as Parameters<typeof normalizePullChats>[0]) };
  }

  const stock = await callApiStock("pull_chats", args);
  const info = findPullChatsInfo(stock);
  if (info) return { ok: true, data: normalizePullChats(info as Parameters<typeof normalizePullChats>[0]) };

  if (res == null && stock == null) return { ok: false, reason: "network" };
  if (res && !res.ok) return { ok: false, reason: "http_error" };
  return { ok: false, reason: "no_chats_payload" };
}

export async function pullChatPage(opts: {
  server?: string;
  character?: string;
  to?: string;
  cursor?: string | null;
  after?: string | null;
}): Promise<HubApiResult<PullChatResult>> {
  const args: Record<string, unknown> = {};
  if (opts.server) args.server = opts.server;
  else {
    if (opts.character) args.character = opts.character;
    if (opts.to) args.to = opts.to;
  }
  if (opts.cursor) args.cursor = opts.cursor;
  else if (opts.after) args.after = opts.after;

  const res = await fetchApiJson("pull_chat", args);
  if (res && res.ok) {
    const info = findPullChatInfo(res.json);
    if (info) return { ok: true, data: normalizePullChat(info as Parameters<typeof normalizePullChat>[0]) };
  }

  const stock = await callApiStock("pull_chat", args);
  const info = findPullChatInfo(stock);
  if (info) return { ok: true, data: normalizePullChat(info as Parameters<typeof normalizePullChat>[0]) };

  if (res == null && stock == null) return { ok: false, reason: "network" };
  if (res && !res.ok) return { ok: false, reason: "http_error" };
  return { ok: false, reason: "no_messages_payload" };
}

export async function sendHubMessage(opts: {
  character: string;
  message: string;
  server?: string;
  to?: string;
}): Promise<HubApiResult<true>> {
  const args: Record<string, unknown> = {
    character: opts.character,
    message: opts.message,
  };
  if (opts.server) args.server = opts.server;
  else if (opts.to) args.to = opts.to;

  const res = await fetchApiJson("send_message", args);
  if (res && res.ok && !isFailedPayload(res.json)) {
    // HTTP 2xx without `failed` counts as success (infs optional).
    return { ok: true, data: true };
  }
  if (res && res.ok && isFailedPayload(res.json)) {
    return { ok: false, reason: "failed" };
  }

  const stock = await callApiStock("send_message", args);
  if (stock != null && !isFailedPayload(stock)) {
    return { ok: true, data: true };
  }
  if (isFailedPayload(stock)) return { ok: false, reason: "failed" };

  if (res == null && stock == null) return { ok: false, reason: "network" };
  if (res && !res.ok) return { ok: false, reason: "http_error" };
  return { ok: false, reason: "no_response" };
}
