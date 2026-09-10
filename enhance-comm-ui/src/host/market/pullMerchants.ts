/**
 * pull_merchants REST client — same /api/:method + `infs` shape as mail.
 */

import type { MarketSlotListing } from "../../lib/market/marketTypes";

export type PullMerchantsChar = {
  name: string;
  level?: number;
  afk?: boolean | string;
  skin?: string;
  stand?: string | boolean | null;
  x?: number;
  y?: number;
  map?: string;
  server?: string;
  slots?: Record<string, unknown>;
};

export type PullMerchantsPayload = {
  type?: string;
  pulledAt?: string;
  chars?: PullMerchantsChar[];
};

export type PullMerchantsResult = {
  ok: boolean;
  chars: PullMerchantsChar[];
  pulledAt?: string;
  message?: string;
};

type InfBag = {
  type?: string;
  chars?: PullMerchantsChar[];
  pulledAt?: string;
  [key: string]: unknown;
};

/**
 * Stock pull_merchants returns `{ success, infs: [{ type: "merchants", chars }] }`
 * (same envelope as pull_mail). Sample/mock files may be bare `{ type, chars }`.
 */
export function extractMerchantChars(ct: unknown): {
  chars: PullMerchantsChar[];
  pulledAt?: string;
} {
  if (!ct) return { chars: [] };
  if (typeof ct === "string") {
    try {
      return extractMerchantChars(JSON.parse(ct));
    } catch {
      return { chars: [] };
    }
  }
  if (typeof ct !== "object") return { chars: [] };
  const obj = ct as {
    failed?: unknown;
    reason?: unknown;
    chars?: unknown;
    infs?: unknown;
    data?: unknown;
    type?: string;
    pulledAt?: string;
  };
  if (obj.failed) return { chars: [] };

  if (Array.isArray(obj.chars)) {
    return {
      chars: obj.chars as PullMerchantsChar[],
      pulledAt:
        typeof obj.pulledAt === "string" ? obj.pulledAt : undefined,
    };
  }

  if (Array.isArray(obj.infs)) {
    const infs = obj.infs as InfBag[];
    for (let i = 0; i < infs.length; i++) {
      const info = infs[i];
      if (!info) continue;
      if (info.type === "merchants" || Array.isArray(info.chars)) {
        return {
          chars: Array.isArray(info.chars) ? info.chars : [],
          pulledAt:
            typeof info.pulledAt === "string"
              ? info.pulledAt
              : typeof obj.pulledAt === "string"
                ? obj.pulledAt
                : undefined,
        };
      }
    }
  }

  if (obj.data != null) return extractMerchantChars(obj.data);
  return { chars: [] };
}

export function normalizeCatalogSlot(
  slotName: string,
  raw: unknown,
): MarketSlotListing | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = typeof s.name === "string" ? s.name : "";
  if (!name) return null;
  const price = typeof s.price === "number" ? s.price : Number(s.price);
  if (!Number.isFinite(price)) return null;
  const listing: MarketSlotListing = {
    slot: slotName,
    name,
    price,
    buyOrder: s.b === true,
  };
  if (typeof s.rid === "string" && s.rid) listing.rid = s.rid;
  if (typeof s.q === "number") listing.q = s.q;
  if (typeof s.level === "number") listing.level = s.level;
  if (typeof s.p === "string" || s.p === null) listing.p = s.p as string | null;
  if (typeof s.stat_type === "string") listing.stat_type = s.stat_type;
  return listing;
}

export function slotsFromCatalogChar(
  slots: Record<string, unknown> | null | undefined,
): MarketSlotListing[] {
  if (!slots || typeof slots !== "object") return [];
  const keys = Object.keys(slots);
  const out: MarketSlotListing[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key.indexOf("trade") !== 0) continue;
    const row = normalizeCatalogSlot(key, slots[key]);
    if (row) out.push(row);
  }
  out.sort((a, b) => {
    const an = parseInt(a.slot.replace("trade", ""), 10) || 0;
    const bn = parseInt(b.slot.replace("trade", ""), 10) || 0;
    return an - bn;
  });
  return out;
}

/**
 * Fetch realm merchant catalog. Mirrors mail: POST /api/pull_merchants.
 */
export async function pullMerchants(): Promise<PullMerchantsResult> {
  try {
    const res = await fetch(
      (typeof window !== "undefined" && window.location
        ? window.location.origin
        : "") + "/api/pull_merchants",
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: "{}",
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        chars: [],
        message: "pull_merchants HTTP " + res.status,
      };
    }
    const json = (await res.json()) as unknown;
    const extracted = extractMerchantChars(json);
    return {
      ok: true,
      chars: extracted.chars,
      pulledAt: extracted.pulledAt || new Date().toISOString(),
      message:
        extracted.chars.length === 0
          ? "Catalog empty (check login / pull_merchants)"
          : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      chars: [],
      message: err instanceof Error ? err.message : "pull_merchants failed",
    };
  }
}
