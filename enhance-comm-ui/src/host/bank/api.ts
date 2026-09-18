/**
 * Account bank via hub `load_bank` (same path as stock render_comm_bank).
 */

import type { BankPacks, BankSnapshot } from "../../lib/bank/bankTypes";

type ApiCallFn = (
  method: string,
  args?: Record<string, unknown>,
  rArgs?: Record<string, unknown>,
) => unknown;

export type BankLoadResult =
  | { ok: true; snapshot: BankSnapshot }
  | { ok: false; reason: string };

const TIMEOUT_MS = 12000;

function getApiCall(): ApiCallFn | null {
  const fn = (window as Window & { api_call?: ApiCallFn }).api_call;
  return typeof fn === "function" ? fn : null;
}

function asPacks(raw: unknown): BankPacks | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const keys = Object.keys(obj);
  let anyArray = false;
  for (let i = 0; i < keys.length; i++) {
    if (Array.isArray(obj[keys[i]])) anyArray = true;
  }
  return anyArray ? (obj as BankPacks) : null;
}

/** Normalize stock / fetch payload into packs + gold. */
export function parseLoadBankPayload(raw: unknown): {
  packs: BankPacks;
  gold: number;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.failed) return null;

  let packs = asPacks(obj.packs);
  let gold =
    typeof obj.gold === "number" && Number.isFinite(obj.gold) ? obj.gold : 0;

  if (!packs && Array.isArray(obj.infs)) {
    const infs = obj.infs as Array<Record<string, unknown>>;
    for (let i = 0; i < infs.length; i++) {
      const info = infs[i];
      if (!info || typeof info !== "object") continue;
      const nested = asPacks(info.packs);
      if (nested) {
        packs = nested;
        if (typeof info.gold === "number") gold = info.gold;
        break;
      }
    }
  }

  if (!packs) {
    // Bare packs object (keys like items0)
    packs = asPacks(obj);
  }

  if (!packs) return null;
  return { packs, gold };
}

function callApiStock(): Promise<unknown> {
  return new Promise((resolve) => {
    const api = getApiCall();
    if (!api) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (v: unknown) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = window.setTimeout(() => finish(null), TIMEOUT_MS);
    try {
      const maybe = api("load_bank", {}, { silent: true, timeout: TIMEOUT_MS });
      if (maybe && typeof (maybe as Promise<unknown>).then === "function") {
        (maybe as Promise<unknown>)
          .then((data) => {
            window.clearTimeout(timer);
            finish(data);
          })
          .catch((err) => {
            window.clearTimeout(timer);
            finish(err);
          });
        return;
      }
      window.clearTimeout(timer);
      finish(maybe);
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}

async function callApiFetch(): Promise<unknown> {
  if (typeof fetch !== "function") return null;
  const ctrl =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, TIMEOUT_MS);
  try {
    const res = await fetch(window.location.origin + "/api/load_bank", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "same-origin",
      body: JSON.stringify({}),
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Load account bank. Prefer stock `api_call` (hub path), then fetch.
 * Each call is a fresh server snapshot (may still lag recent in-game moves).
 */
export async function loadBank(): Promise<BankLoadResult> {
  if (!(window as Window & { user_id?: unknown }).user_id) {
    return { ok: false, reason: "Log in to load the account bank." };
  }

  const viaStock = await callApiStock();
  let parsed = parseLoadBankPayload(viaStock);
  if (!parsed) {
    const viaFetch = await callApiFetch();
    parsed = parseLoadBankPayload(viaFetch);
  }
  if (!parsed) {
    return {
      ok: false,
      reason: "Could not load bank (try again or re-login).",
    };
  }
  return {
    ok: true,
    snapshot: {
      packs: parsed.packs,
      gold: parsed.gold,
      loadedAt: Date.now(),
    },
  };
}
