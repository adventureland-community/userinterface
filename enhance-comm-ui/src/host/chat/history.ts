/**
 * Account chat history via stock `pull_messages` (Friends → Chat).
 *
 * Server (`api.js` pull_messages_api): page size 200, cursor = skip offset.
 * Types: `all` | `private` | `party` | `global` | server.key (`SR_…`).
 */

import { extractInfs } from "../mail/api";
import type { ChatChannel, ChatMessage } from "./types";

const API_TIMEOUT_MS = 12000;
const PAGE = 200;

export type PullMessagesRow = {
  fro?: string;
  to?: string | string[];
  message?: string;
  type?: string;
  id?: string;
  server?: string;
  date?: string;
};

export type PullMessagesPage = {
  messages: PullMessagesRow[];
  more: boolean;
  cursor: string | null;
  cursored: boolean;
  mtype: string;
};

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

function findMessagesInfo(infs: Array<{ type?: string; [k: string]: unknown }>) {
  for (let i = 0; i < infs.length; i++) {
    const info = infs[i];
    if (info && (info.type === "messages" || Array.isArray(info.messages))) {
      return info;
    }
  }
  return null;
}

export function normalizeMessagesPage(info: {
  messages?: unknown;
  more?: unknown;
  cursor?: unknown;
  cursored?: unknown;
  mtype?: unknown;
  type?: unknown;
}): PullMessagesPage {
  const raw = Array.isArray(info.messages) ? info.messages : [];
  const messages: PullMessagesRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    messages.push(row as PullMessagesRow);
  }
  return {
    messages,
    more: !!info.more,
    cursor: info.cursor != null && info.cursor !== "" ? String(info.cursor) : null,
    cursored: !!info.cursored,
    mtype: typeof info.mtype === "string" ? info.mtype : "all",
  };
}

export async function pullMessagesPage(opts: {
  type?: string;
  cursor?: string | null;
}): Promise<{ ok: boolean; data?: PullMessagesPage; reason?: string }> {
  const args: Record<string, unknown> = {};
  if (opts.type) args.type = opts.type;
  if (opts.cursor) args.cursor = opts.cursor;

  const ctrl =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, API_TIMEOUT_MS);
  try {
    const res = await postJson(
      "/api/pull_messages",
      args,
      ctrl ? ctrl.signal : undefined,
    );
    if (!res) return { ok: false, reason: "network" };
    if (!res.ok) return { ok: false, reason: "http_error" };
    const info = findMessagesInfo(extractInfs(res.json));
    if (!info) return { ok: false, reason: "no_messages_payload" };
    return { ok: true, data: normalizeMessagesPage(info) };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Map DB message type → ECU chat channel. */
export function historyRowChannel(type: string | undefined): ChatChannel {
  if (type === "private") return "pm";
  if (type === "party") return "party";
  if (type === "ambient" || type === "server") return "say";
  return "say";
}

export function historyRowColor(type: string | undefined): string | undefined {
  if (type === "private") return "#CD7879";
  if (type === "party") return "#46A0C6";
  return undefined;
}

export function historyRowToChatMessage(row: PullMessagesRow): ChatMessage | null {
  const message = row.message != null ? String(row.message) : "";
  if (!message) return null;
  const at = row.date ? Date.parse(row.date) : NaN;
  return {
    id: row.id ? `hist-${row.id}` : `hist-${row.fro || ""}-${row.date || ""}-${message.slice(0, 24)}`,
    at: Number.isFinite(at) ? at : 0,
    channel: historyRowChannel(row.type),
    owner: row.fro != null ? String(row.fro) : "",
    message,
    color: historyRowColor(row.type),
    local: false,
  };
}

/**
 * Stock friends Chat uses `X.servers[].key` (same as game `server_id` / `SR_…`).
 * Falls back to `global` when the current server key is unknown.
 */
export function resolveHistoryType(): string {
  const region =
    typeof window.server_region === "string" ? window.server_region : "";
  const ident =
    typeof window.server_identifier === "string"
      ? window.server_identifier
      : "";
  const servers = window.X?.servers;
  if (Array.isArray(servers) && region && ident) {
    for (let i = 0; i < servers.length; i++) {
      const s = servers[i] as { region?: string; name?: string; key?: string };
      if (!s) continue;
      if (s.region === region && s.name === ident && s.key) {
        return String(s.key);
      }
    }
  }
  if (region && ident) return `SR_${region}${ident}`;
  return "global";
}

export { PAGE as HISTORY_PAGE_SIZE };
