/**
 * Mail JSON API — live Adventure Land (`/api/<method>`).
 *
 * POST `/api/<method>` with args-only JSON body
 * (`common/handlers.js` → `app.all("/api/:method", …)`).
 *
 * Stock `api_call` strips `infs` onto `handle_information`, so fetch is the
 * primary path; `api_call` is only a soft fallback.
 */

import { normalizeMailPage } from "./merge";
import type { PullMailPage } from "./types";

type ApiCallFn = (
  method: string,
  args?: Record<string, unknown>,
  rArgs?: Record<string, unknown>,
) => unknown;

function getApiCall(): ApiCallFn | null {
  const fn = (window as Window & { api_call?: ApiCallFn }).api_call;
  return typeof fn === "function" ? fn : null;
}

type InfBag = { type?: string; [key: string]: unknown };

/** Accept stock `{ success, infs }`, bare arrays, or a single mail info object. */
export function extractInfs(ct: unknown): InfBag[] {
  if (!ct) return [];
  if (typeof ct === "string") {
    try {
      return extractInfs(JSON.parse(ct));
    } catch {
      return [];
    }
  }
  if (Array.isArray(ct)) return ct as InfBag[];
  if (typeof ct !== "object") return [];
  const obj = ct as {
    infs?: unknown;
    type?: string;
    mail?: unknown;
    data?: unknown;
    failed?: unknown;
  };
  if (obj.failed) return [];
  if (Array.isArray(obj.infs)) return obj.infs as InfBag[];
  if (obj.data != null) {
    const nested = extractInfs(obj.data);
    if (nested.length) return nested;
  }
  if (obj.type === "mail" || Array.isArray(obj.mail)) {
    return [obj as InfBag];
  }
  return [];
}

/**
 * Stock `/api` often returns HTTP 200 with `{ failed: true, reason }`
 * (e.g. delete_mail cant_delete). Match api_call's reject-on-failed.
 */
export function apiResponseFailed(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const obj = json as { failed?: unknown; success?: unknown };
  if (obj.failed === true) return true;
  if (obj.success === false) return true;
  return false;
}

export type MailApiResult<T> = {
  ok: boolean;
  data?: T;
  unreadCount?: number;
  message?: string;
  reason?: string;
};

function readUnreadFromInfs(infs: InfBag[]): number | undefined {
  for (let i = 0; i < infs.length; i++) {
    const info = infs[i];
    if (info && info.type === "unread" && typeof info.count === "number") {
      return info.count;
    }
  }
  return undefined;
}

function findMailInfo(infs: InfBag[]): InfBag | null {
  for (let i = 0; i < infs.length; i++) {
    const info = infs[i];
    if (info && (info.type === "mail" || Array.isArray(info.mail))) {
      return info;
    }
  }
  return null;
}

const API_TIMEOUT_MS = 20000;

async function postJson(
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
): Promise<{ ok: boolean; status: number; json: unknown } | null> {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(window.location.origin + path, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "same-origin",
      body: JSON.stringify(body),
      signal,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch {
    return null;
  }
}

/**
 * POST `/api/<method>` with args body.
 * - `null` → hard network/abort failure
 * - `{ ok: false }` → non-2xx HTTP or `{ failed: true }` body
 * - `{ ok: true, infs }` → HTTP 200 success body
 */
async function callApiFetch(
  method: string,
  args: Record<string, unknown>,
): Promise<
  { ok: true; infs: InfBag[] } | { ok: false; reason?: string } | null
> {
  const ctrl =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, API_TIMEOUT_MS);
  try {
    const res = await postJson(
      "/api/" + method,
      { ...args },
      ctrl ? ctrl.signal : undefined,
    );
    if (!res) return null;
    if (!res.ok) return { ok: false, reason: "http_error" };
    if (apiResponseFailed(res.json)) {
      return { ok: false, reason: "api_failed" };
    }
    return { ok: true, infs: extractInfs(res.json) };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Soft fallback via stock `api_call` — preserves failed vs empty-infs. */
function callApiStock(
  method: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; infs: InfBag[]; reason?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload: {
      ok: boolean;
      infs: InfBag[];
      reason?: string;
    }) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const api = getApiCall();
    if (!api) {
      finish({ ok: false, infs: [], reason: "no_api_call" });
      return;
    }

    const timer = window.setTimeout(
      () => finish({ ok: false, infs: [], reason: "timeout" }),
      API_TIMEOUT_MS,
    );

    const accept = (ct: unknown) => {
      window.clearTimeout(timer);
      if (apiResponseFailed(ct)) {
        finish({ ok: false, infs: [], reason: "api_failed" });
        return;
      }
      finish({ ok: true, infs: extractInfs(ct) });
    };

    try {
      const maybePromise = api(
        method,
        {
          ...args,
          callback: (ct: unknown) => {
            accept(ct);
          },
        },
        { silent: true },
      );

      if (
        maybePromise &&
        typeof (maybePromise as Promise<unknown>).then === "function"
      ) {
        (maybePromise as Promise<unknown>)
          .then((data) => {
            accept(data);
          })
          .catch((data) => {
            // Stock rejects on data.failed — still inspect the body.
            if (apiResponseFailed(data)) {
              window.clearTimeout(timer);
              finish({ ok: false, infs: [], reason: "api_failed" });
              return;
            }
            accept(data);
          });
      }
    } catch {
      window.clearTimeout(timer);
      finish({ ok: false, infs: [], reason: "no_response" });
    }
  });
}

async function callApi(
  method: string,
  args: Record<string, unknown> = {},
): Promise<InfBag[]> {
  const viaFetch = await callApiFetch(method, args);
  if (viaFetch != null) {
    if (viaFetch.ok && viaFetch.infs.length > 0) return viaFetch.infs;
    if (viaFetch.ok) {
      const viaStock = await callApiStock(method, args);
      if (viaStock.ok && viaStock.infs.length) return viaStock.infs;
      return viaFetch.infs;
    }
    const viaStock = await callApiStock(method, args);
    if (viaStock.ok && viaStock.infs.length) return viaStock.infs;
    return [];
  }
  const viaStock = await callApiStock(method, args);
  return viaStock.ok ? viaStock.infs : [];
}

/** HTTP-aware call — `ok` follows live `/api` success, not merely 2xx. */
async function callApiResult(
  method: string,
  args: Record<string, unknown> = {},
): Promise<MailApiResult<InfBag[]>> {
  const viaFetch = await callApiFetch(method, args);
  if (viaFetch != null) {
    if (viaFetch.ok === false) {
      return {
        ok: false,
        reason: viaFetch.reason || "http_error",
        data: [],
      };
    }
    return { ok: true, data: viaFetch.infs };
  }
  const viaStock = await callApiStock(method, args);
  if (viaStock.ok) return { ok: true, data: viaStock.infs };
  return {
    ok: false,
    reason: viaStock.reason || "no_response",
    data: [],
  };
}

export async function pullMailPage(
  cursor?: string | null,
): Promise<MailApiResult<PullMailPage>> {
  const args: Record<string, unknown> = {};
  if (cursor) args.cursor = cursor;
  const infs = await callApi("pull_mail", args);
  const info = findMailInfo(infs);
  if (info) return { ok: true, data: normalizeMailPage(info) };
  return { ok: false, reason: "no_mail_payload" };
}

export async function readMail(
  mailId: string,
): Promise<MailApiResult<true>> {
  const res = await callApiResult("read_mail", { mail: mailId });
  if (!res.ok) return { ok: false, reason: res.reason || "no_response" };
  const infs = res.data || [];
  return {
    ok: true,
    data: true,
    unreadCount: readUnreadFromInfs(infs),
  };
}

export async function deleteMail(
  mailId: string,
): Promise<MailApiResult<true>> {
  const res = await callApiResult("delete_mail", { mid: mailId });
  if (!res.ok) return { ok: false, reason: res.reason || "no_response" };
  const infs = res.data || [];
  let message: string | undefined;
  for (let i = 0; i < infs.length; i++) {
    const info = infs[i];
    if (!info) continue;
    if (info.type === "message" && typeof info.message === "string") {
      message = info.message;
    }
  }
  return { ok: true, data: true, message };
}

export async function readMailMany(
  ids: string[],
): Promise<MailApiResult<{ unreadCount?: number }>> {
  let unreadCount: number | undefined;
  let anyOk = false;
  // Serialize — parallel read_mail races the server unread counter.
  for (let i = 0; i < ids.length; i++) {
    const res = await readMail(ids[i]);
    if (res.ok) anyOk = true;
    if (res.unreadCount != null) unreadCount = res.unreadCount;
  }
  if (!anyOk && ids.length) {
    return { ok: false, reason: "no_response", data: { unreadCount } };
  }
  return { ok: true, data: { unreadCount } };
}
