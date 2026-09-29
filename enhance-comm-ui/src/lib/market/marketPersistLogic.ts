/**
 * Pure market catalog cache reconcile.
 *
 * Listing identity: merchantName + rid. A rid stays on its slot (game never
 * relocates a rid); a new rid in a slot replaces the previous listing there.
 *
 * Pull / open-stand snapshots are authoritative only for merchants present in
 * that snapshot. Merchants missing from a pull keep their cached trades.
 * Closed stand / out-of-range never delete rids.
 */

import type { MarketSlotListing } from "./marketTypes";
import {
  slotsFromCatalogChar,
  type PullMerchantsChar,
} from "../../host/market/pullMerchants";

export type CachedMarketListing = MarketSlotListing & {
  rid: string;
  lastRefreshedAt: number;
};

export type CachedMarketMerchant = {
  name: string;
  level?: number;
  map?: string;
  x?: number;
  y?: number;
  server?: string;
  stand?: string | boolean | null;
  afk?: boolean | string;
  skin?: string;
  /** Last time this merchant appeared in a pull or live open-stand sync. */
  lastSeenAt: number;
  slots: CachedMarketListing[];
};

function merchantKey(name: string): string {
  return String(name || "").toLowerCase();
}

function wantFingerprint(
  want: MarketSlotListing["want"] | undefined,
): string {
  if (!want || !want.name) return "";
  return [
    want.name,
    want.level != null ? String(want.level) : "",
    want.p === null ? "null" : want.p != null ? String(want.p) : "",
    want.q != null ? String(want.q) : "",
  ].join("\0");
}

function listingFromSlot(
  slot: MarketSlotListing,
  now: number,
): CachedMarketListing | null {
  if (!slot.rid) return null;
  const row: CachedMarketListing = {
    slot: slot.slot,
    name: slot.name,
    rid: slot.rid,
    price: slot.price,
    buyOrder: slot.buyOrder,
    lastRefreshedAt: now,
  };
  if (slot.giveaway) row.giveaway = true;
  if (slot.giveawayEntries != null) row.giveawayEntries = slot.giveawayEntries;
  if (slot.giveawayMinutes != null) row.giveawayMinutes = slot.giveawayMinutes;
  if (slot.giveawayNames && slot.giveawayNames.length) {
    row.giveawayNames = slot.giveawayNames.slice();
  }
  if (slot.tradeOffer && slot.want) {
    row.tradeOffer = true;
    row.want = { ...slot.want };
  }
  if (slot.q != null) row.q = slot.q;
  if (slot.level != null) row.level = slot.level;
  if (slot.p !== undefined) row.p = slot.p;
  if (slot.stat_type != null) row.stat_type = slot.stat_type;
  return row;
}

/** Authoritative slot snapshot → rid-keyed listings (drops rid-less rows). */
export function listingsFromAuthoritativeSlots(
  slots: MarketSlotListing[],
  now: number,
): CachedMarketListing[] {
  const byRid: Record<string, CachedMarketListing> = Object.create(null);
  for (let i = 0; i < slots.length; i++) {
    const row = listingFromSlot(slots[i], now);
    if (!row) continue;
    byRid[row.rid] = row;
  }
  const keys = Object.keys(byRid);
  const out: CachedMarketListing[] = [];
  for (let i = 0; i < keys.length; i++) out.push(byRid[keys[i]]);
  out.sort((a, b) => {
    const an = parseInt(a.slot.replace("trade", ""), 10) || 0;
    const bn = parseInt(b.slot.replace("trade", ""), 10) || 0;
    return an - bn;
  });
  return out;
}

function cloneMerchant(m: CachedMarketMerchant): CachedMarketMerchant {
  const slots: CachedMarketListing[] = [];
  for (let i = 0; i < m.slots.length; i++) {
    slots.push({ ...m.slots[i] });
  }
  const next: CachedMarketMerchant = {
    name: m.name,
    lastSeenAt: m.lastSeenAt,
    slots,
  };
  if (m.level != null) next.level = m.level;
  if (m.map != null) next.map = m.map;
  if (m.x != null) next.x = m.x;
  if (m.y != null) next.y = m.y;
  if (m.server != null) next.server = m.server;
  if (m.stand !== undefined) next.stand = m.stand;
  if (m.afk !== undefined) next.afk = m.afk;
  if (m.skin != null) next.skin = m.skin;
  return next;
}

function applyMerchantMeta(
  prev: CachedMarketMerchant | null,
  patch: {
    name: string;
    level?: number;
    map?: string;
    x?: number;
    y?: number;
    server?: string;
    stand?: string | boolean | null;
    afk?: boolean | string;
    skin?: string;
  },
  slots: CachedMarketListing[],
  now: number,
): CachedMarketMerchant {
  const base = prev ? cloneMerchant(prev) : null;
  return {
    name: patch.name || (base && base.name) || "",
    level: patch.level ?? base?.level,
    map: patch.map ?? base?.map,
    x: patch.x ?? base?.x,
    y: patch.y ?? base?.y,
    server: patch.server ?? base?.server,
    stand: patch.stand !== undefined ? patch.stand : base?.stand,
    afk: patch.afk !== undefined ? patch.afk : base?.afk,
    skin: patch.skin ?? base?.skin,
    lastSeenAt: now,
    slots,
  };
}

/**
 * Merge a pull_merchants response into the cache.
 * Merchants absent from the pull keep their trades untouched.
 * For merchants present: slots become the rid set from the pull (gone rid → drop).
 */
export function reconcileCatalogPull(
  prev: CachedMarketMerchant[],
  chars: PullMerchantsChar[],
  now: number,
): CachedMarketMerchant[] {
  const byName: Record<string, CachedMarketMerchant> = Object.create(null);
  for (let i = 0; i < prev.length; i++) {
    const m = prev[i];
    if (!m || !m.name) continue;
    byName[merchantKey(m.name)] = cloneMerchant(m);
  }

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!c || !c.name) continue;
    const key = merchantKey(c.name);
    const prevM = byName[key] || null;
    const slots = listingsFromAuthoritativeSlots(
      slotsFromCatalogChar(c.slots || null),
      now,
    );
    byName[key] = applyMerchantMeta(
      prevM,
      {
        name: c.name,
        level: c.level,
        map: c.map,
        x: typeof c.x === "number" ? c.x : undefined,
        y: typeof c.y === "number" ? c.y : undefined,
        server: c.server,
        stand: c.stand,
        afk: c.afk,
        skin: c.skin,
      },
      slots,
      now,
    );
  }

  const keys = Object.keys(byName);
  const out: CachedMarketMerchant[] = [];
  for (let i = 0; i < keys.length; i++) out.push(byName[keys[i]]);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Live open-stand snapshot for one merchant.
 *
 * Soft sync often omits slot keys — absent keys do NOT delete cached rids.
 * A rid is dropped only when that slot key is present and empty, or present
 * with a different rid (replaced). Closed stand must not call this.
 */
export function reconcileLiveOpenStand(
  prev: CachedMarketMerchant[],
  opts: {
    name: string;
    slots: MarketSlotListing[];
    /** Raw entity.slots — used to tell "omitted" vs "empty". */
    liveSlotMap?: Record<string, unknown> | null;
    level?: number;
    map?: string;
    x?: number;
    y?: number;
    stand?: string | boolean | null;
    skin?: string;
  },
  now: number,
): CachedMarketMerchant[] {
  if (!opts.name) return prev;
  const key = merchantKey(opts.name);
  const byName: Record<string, CachedMarketMerchant> = Object.create(null);
  for (let i = 0; i < prev.length; i++) {
    const m = prev[i];
    if (!m || !m.name) continue;
    byName[merchantKey(m.name)] = cloneMerchant(m);
  }
  const prevM = byName[key] || null;
  const incoming = listingsFromAuthoritativeSlots(opts.slots, now);
  const liveMap = opts.liveSlotMap || null;

  // Empty soft blink with prior cache — keep trades, don't bump refresh times.
  if (!incoming.length && prevM && prevM.slots.length) {
    byName[key] = applyMerchantMeta(
      prevM,
      {
        name: opts.name,
        level: opts.level,
        map: opts.map,
        x: opts.x,
        y: opts.y,
        stand: opts.stand,
        skin: opts.skin,
      },
      prevM.slots.map((s) => ({ ...s })),
      prevM.lastSeenAt,
    );
    const keys = Object.keys(byName);
    const out: CachedMarketMerchant[] = [];
    for (let i = 0; i < keys.length; i++) out.push(byName[keys[i]]);
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  const byRid: Record<string, CachedMarketListing> = Object.create(null);
  if (prevM) {
    for (let i = 0; i < prevM.slots.length; i++) {
      byRid[prevM.slots[i].rid] = { ...prevM.slots[i] };
    }
  }

  // Drop only when the live map explicitly shows the slot empty / replaced.
  if (prevM && liveMap) {
    for (let i = 0; i < prevM.slots.length; i++) {
      const prevSlot = prevM.slots[i];
      if (!Object.prototype.hasOwnProperty.call(liveMap, prevSlot.slot)) {
        continue; // soft-omitted key — keep
      }
      const raw = liveMap[prevSlot.slot];
      if (!raw || typeof raw !== "object" || !(raw as { name?: unknown }).name) {
        delete byRid[prevSlot.rid];
        continue;
      }
      const liveRid = (raw as { rid?: unknown }).rid;
      if (typeof liveRid === "string" && liveRid && liveRid !== prevSlot.rid) {
        delete byRid[prevSlot.rid];
      }
    }
  } else if (prevM && !liveMap) {
    // No map — fall back to authoritative incoming set only when non-empty.
    const keep: Record<string, boolean> = Object.create(null);
    for (let i = 0; i < incoming.length; i++) keep[incoming[i].rid] = true;
    const prevRids = Object.keys(byRid);
    for (let i = 0; i < prevRids.length; i++) {
      if (!keep[prevRids[i]]) delete byRid[prevRids[i]];
    }
  }

  for (let i = 0; i < incoming.length; i++) {
    const inc = incoming[i];
    const prev = byRid[inc.rid];
    // Soft/live payloads sometimes omit `want` while keeping price:0 — don't
    // downgrade a known trade offer into a fake free sale.
    if (
      prev &&
      prev.tradeOffer &&
      prev.want &&
      !inc.tradeOffer &&
      !inc.buyOrder &&
      !inc.giveaway &&
      !(inc.price > 0)
    ) {
      byRid[inc.rid] = {
        ...inc,
        tradeOffer: true,
        want: { ...prev.want },
        price: typeof prev.price === "number" ? prev.price : 0,
      };
      continue;
    }
    byRid[inc.rid] = inc;
  }

  const ridKeys = Object.keys(byRid);
  const slots: CachedMarketListing[] = [];
  for (let i = 0; i < ridKeys.length; i++) slots.push(byRid[ridKeys[i]]);
  slots.sort((a, b) => {
    const an = parseInt(a.slot.replace("trade", ""), 10) || 0;
    const bn = parseInt(b.slot.replace("trade", ""), 10) || 0;
    return an - bn;
  });

  byName[key] = applyMerchantMeta(
    prevM,
    {
      name: opts.name,
      level: opts.level,
      map: opts.map,
      x: opts.x,
      y: opts.y,
      stand: opts.stand,
      skin: opts.skin,
    },
    slots,
    now,
  );
  const keys = Object.keys(byName);
  const out: CachedMarketMerchant[] = [];
  for (let i = 0; i < keys.length; i++) out.push(byName[keys[i]]);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Apply open-stand live entities onto the cache (closed stands skipped). */
export function reconcileLiveOpenStands(
  prev: CachedMarketMerchant[],
  entities: Array<{
    name?: string;
    level?: number;
    map?: unknown;
    real_x?: number;
    x?: number;
    real_y?: number;
    y?: number;
    stand?: unknown;
    skin?: string;
    slots?: Record<string, unknown> | null;
  }>,
  now: number,
): CachedMarketMerchant[] {
  let next = prev;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || !ent.name) continue;
    const stand = ent.stand;
    if (stand == null || stand === false || stand === "") continue;
    const liveSlotMap = (ent.slots || null) as Record<string, unknown> | null;
    next = reconcileLiveOpenStand(
      next,
      {
        name: String(ent.name),
        slots: slotsFromCatalogChar(liveSlotMap),
        liveSlotMap,
        level: typeof ent.level === "number" ? ent.level : undefined,
        map: ent.map != null ? String(ent.map) : undefined,
        x: ent.real_x ?? ent.x,
        y: ent.real_y ?? ent.y,
        stand: stand as string | boolean | null,
        skin: ent.skin,
      },
      now,
    );
  }
  return next;
}

/** Strip to MarketSlotListing (keeps lastRefreshedAt for UI). */
export function cachedSlotsAsListings(
  slots: CachedMarketListing[],
): MarketSlotListing[] {
  const out: MarketSlotListing[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const row: MarketSlotListing = {
      slot: s.slot,
      name: s.name,
      rid: s.rid,
      price: s.price,
      buyOrder: s.buyOrder,
      lastRefreshedAt: s.lastRefreshedAt,
    };
    if (s.giveaway) row.giveaway = true;
    if (s.giveawayEntries != null) row.giveawayEntries = s.giveawayEntries;
    if (s.giveawayMinutes != null) row.giveawayMinutes = s.giveawayMinutes;
    if (s.giveawayNames && s.giveawayNames.length) {
      row.giveawayNames = s.giveawayNames.slice();
    }
    if (s.tradeOffer && s.want) {
      row.tradeOffer = true;
      row.want = { ...s.want };
    }
    if (s.q != null) row.q = s.q;
    if (s.level != null) row.level = s.level;
    if (s.p !== undefined) row.p = s.p;
    if (s.stat_type != null) row.stat_type = s.stat_type;
    out.push(row);
  }
  return out;
}

/** True when merchant set matches ignoring lastSeenAt / lastRefreshedAt. */
export function marketCacheContentEqual(
  a: CachedMarketMerchant[],
  b: CachedMarketMerchant[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      !y ||
      x.name !== y.name ||
      x.level !== y.level ||
      x.map !== y.map ||
      x.x !== y.x ||
      x.y !== y.y ||
      x.server !== y.server ||
      x.stand !== y.stand ||
      x.afk !== y.afk ||
      x.skin !== y.skin ||
      x.slots.length !== y.slots.length
    ) {
      return false;
    }
    for (let j = 0; j < x.slots.length; j++) {
      const sx = x.slots[j];
      const sy = y.slots[j];
      if (
        sx.rid !== sy.rid ||
        sx.slot !== sy.slot ||
        sx.name !== sy.name ||
        sx.price !== sy.price ||
        sx.buyOrder !== sy.buyOrder ||
        !!sx.giveaway !== !!sy.giveaway ||
        sx.giveawayEntries !== sy.giveawayEntries ||
        sx.giveawayMinutes !== sy.giveawayMinutes ||
        (sx.giveawayNames || []).join("\0") !==
          (sy.giveawayNames || []).join("\0") ||
        !!sx.tradeOffer !== !!sy.tradeOffer ||
        wantFingerprint(sx.want) !== wantFingerprint(sy.want) ||
        sx.q !== sy.q ||
        sx.level !== sy.level ||
        sx.p !== sy.p
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Stable signature of open-stand trade rids for effect deps. */
export function liveOpenStandSignature(
  entities: Array<{
    name?: string;
    stand?: unknown;
    slots?: Record<string, unknown> | null;
  }>,
): string {
  const parts: string[] = [];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || !ent.name) continue;
    const stand = ent.stand;
    if (stand == null || stand === false || stand === "") continue;
    const slots = ent.slots || null;
    const rids: string[] = [];
    if (slots) {
      const keys = Object.keys(slots);
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        if (k.indexOf("trade") !== 0) continue;
        const raw = slots[k];
        if (!raw || typeof raw !== "object") continue;
        const rid = (raw as { rid?: unknown }).rid;
        const price = (raw as { price?: unknown }).price;
        const name = (raw as { name?: unknown }).name;
        if (typeof rid === "string" && rid) {
          const wantRaw = (raw as { want?: unknown }).want;
          const wantName =
            typeof wantRaw === "string"
              ? wantRaw
              : wantRaw &&
                  typeof wantRaw === "object" &&
                  typeof (wantRaw as { name?: unknown }).name === "string"
                ? String((wantRaw as { name: string }).name)
                : "";
          rids.push(
            k +
              ":" +
              rid +
              ":" +
              (typeof price === "number" ? price : "") +
              ":" +
              (typeof name === "string" ? name : "") +
              ":" +
              wantName,
          );
        }
      }
    }
    rids.sort();
    parts.push(String(ent.name).toLowerCase() + "=" + rids.join(","));
  }
  parts.sort();
  return parts.join("|");
}
