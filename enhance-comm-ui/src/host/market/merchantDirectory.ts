/**
 * Merge cached catalog + live entities into a merchant directory.
 *
 * Slot data comes from the rid cache. Live open stands should already be
 * reconciled into the cache; closed / out-of-range only affect status + coords.
 */

import {
  getCurrentMap,
  getObserving,
  getServerIdentifier,
  getServerRegion,
} from "../al";
import type { EntityLike } from "../globals";
import { isInTradeRange } from "../../lib/tradeHelpers";
import type {
  MarketListingRow,
  MarketMerchant,
  MerchantStatus,
} from "../../lib/market/marketTypes";
import {
  cachedSlotsAsListings,
  type CachedMarketMerchant,
} from "../../lib/market/marketPersistLogic";
import { slotsFromCatalogChar } from "./pullMerchants";

function serverKey(region?: string | null, ident?: string | null): string {
  const r = String(region || "");
  const i = String(ident || "");
  if (r && i) return r + i;
  return r || i || "";
}

function currentServerKey(): string {
  return serverKey(getServerRegion(), getServerIdentifier());
}

function parseServerField(raw?: string | null): string {
  return String(raw || "");
}

function standIsOpen(ent: EntityLike | null | undefined): boolean {
  if (!ent) return false;
  const s = ent.stand;
  return s != null && s !== false && s !== "";
}

export function classifyMerchantStatus(opts: {
  name: string;
  map?: string;
  server?: string;
  live: EntityLike | null;
  observing: EntityLike | null | undefined;
}): MerchantStatus {
  const obs = opts.observing;
  if (
    obs &&
    opts.name &&
    obs.name &&
    String(obs.name).toLowerCase() === String(opts.name).toLowerCase()
  ) {
    return "you";
  }
  if (opts.live && isInTradeRange(opts.live, obs || null)) return "inRange";
  const curMap = String(getCurrentMap() || "");
  const curSrv = currentServerKey();
  const mMap = String(opts.map || (opts.live && opts.live.map) || "");
  const mSrv = parseServerField(
    opts.server ||
      (opts.live
        ? serverKey(
            (opts.live as any).server_region,
            (opts.live as any).server_identifier,
          )
        : ""),
  );
  if (opts.live) {
    if (curMap && mMap && curMap === mMap) return "sameMap";
    if (
      mSrv &&
      curSrv &&
      mSrv !== curSrv &&
      !mSrv.startsWith(curSrv) &&
      curSrv.indexOf(mSrv) < 0
    ) {
      const soft =
        mSrv.replace(/^SR_/, "") === curSrv ||
        curSrv.replace(/^SR_/, "") === mSrv ||
        mSrv.indexOf(curSrv) >= 0 ||
        curSrv.indexOf(mSrv.replace(/^SR_/, "")) >= 0;
      if (!soft) return "otherServer";
    }
    return "otherMap";
  }
  if (mSrv && curSrv) {
    const soft =
      mSrv === curSrv ||
      mSrv.replace(/^SR_/, "") === curSrv ||
      curSrv.indexOf(mSrv.replace(/^SR_/, "")) >= 0;
    if (!soft) return "otherServer";
  }
  if (curMap && mMap && curMap === mMap) return "sameMap";
  if (mMap) return "otherMap";
  return "catalogOnly";
}

function findLiveByName(
  entities: EntityLike[],
  name: string,
): EntityLike | null {
  const want = String(name || "").toLowerCase();
  if (!want) return null;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e && e.name && String(e.name).toLowerCase() === want) return e;
  }
  return null;
}

/**
 * Build merged merchant list from the rid cache + live presence.
 */
export function buildMerchantDirectory(opts: {
  entities: EntityLike[];
  catalogMerchants: CachedMarketMerchant[];
  observing?: EntityLike | null;
}): MarketMerchant[] {
  const observing =
    opts.observing !== undefined ? opts.observing : getObserving();
  const byName: Record<string, MarketMerchant> = Object.create(null);

  const upsert = (row: MarketMerchant) => {
    const key = row.name.toLowerCase();
    const prev = byName[key];
    if (!prev) {
      byName[key] = row;
      return;
    }
    byName[key] = {
      name: row.name || prev.name,
      level: row.level ?? prev.level,
      map: row.map ?? prev.map,
      x: row.x ?? prev.x,
      y: row.y ?? prev.y,
      server: row.server ?? prev.server,
      stand: row.stand ?? prev.stand,
      afk: row.afk ?? prev.afk,
      skin: row.skin ?? prev.skin,
      entityId: row.entityId ?? prev.entityId,
      status: row.fromLive ? row.status : prev.fromLive ? prev.status : row.status,
      // Cache slots win — live open-stand already reconciled into cache.
      slots: row.slots.length ? row.slots : prev.slots,
      fromCatalog: prev.fromCatalog || row.fromCatalog,
      fromLive: prev.fromLive || row.fromLive,
    };
  };

  for (let i = 0; i < opts.catalogMerchants.length; i++) {
    const c = opts.catalogMerchants[i];
    if (!c || !c.name) continue;
    const live = findLiveByName(opts.entities, c.name);
    const slots = cachedSlotsAsListings(c.slots);
    const status = classifyMerchantStatus({
      name: c.name,
      map: c.map || (live && live.map ? String(live.map) : undefined),
      server: c.server,
      live,
      observing,
    });
    upsert({
      name: c.name,
      level: c.level,
      map: live && live.map != null ? String(live.map) : c.map,
      x: live ? live.real_x ?? live.x ?? c.x : c.x,
      y: live ? live.real_y ?? live.y ?? c.y : c.y,
      server: c.server,
      stand: live ? ((live.stand as any) ?? c.stand) : c.stand,
      afk: c.afk,
      skin: c.skin,
      entityId: live && live.id != null ? String(live.id) : undefined,
      status,
      slots,
      fromCatalog: true,
      fromLive: !!live,
    });
  }

  // Live merchants not yet in cache (first sighting before persist round-trip).
  for (let i = 0; i < opts.entities.length; i++) {
    const ent = opts.entities[i];
    if (!ent || !ent.name) continue;
    const key = String(ent.name).toLowerCase();
    if (byName[key]) {
      const prev = byName[key];
      byName[key] = {
        ...prev,
        entityId: ent.id != null ? String(ent.id) : prev.entityId,
        map: ent.map != null ? String(ent.map) : prev.map,
        x: ent.real_x ?? ent.x ?? prev.x,
        y: ent.real_y ?? ent.y ?? prev.y,
        stand: (ent.stand as any) ?? prev.stand,
        fromLive: true,
        status: classifyMerchantStatus({
          name: String(ent.name),
          map: ent.map != null ? String(ent.map) : prev.map,
          server: prev.server,
          live: ent,
          observing,
        }),
      };
      continue;
    }
    const open = standIsOpen(ent);
    const liveSlots = slotsFromCatalogChar(
      (ent.slots || null) as Record<string, unknown> | null,
    );
    if (!liveSlots.length && !open) continue;
    const status = classifyMerchantStatus({
      name: String(ent.name),
      map: ent.map != null ? String(ent.map) : undefined,
      live: ent,
      observing,
    });
    upsert({
      name: String(ent.name),
      level: typeof ent.level === "number" ? ent.level : undefined,
      map: ent.map != null ? String(ent.map) : undefined,
      x: ent.real_x ?? ent.x,
      y: ent.real_y ?? ent.y,
      stand: ent.stand as any,
      entityId: ent.id != null ? String(ent.id) : undefined,
      status,
      slots: liveSlots,
      fromCatalog: false,
      fromLive: true,
    });
  }

  const names = Object.keys(byName);
  const out: MarketMerchant[] = [];
  for (let i = 0; i < names.length; i++) {
    out.push(byName[names[i]]);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function flattenListings(
  merchants: MarketMerchant[],
): MarketListingRow[] {
  const out: MarketListingRow[] = [];
  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i];
    const standOpen = m.stand != null && m.stand !== false && m.stand !== "";
    for (let j = 0; j < m.slots.length; j++) {
      const s = m.slots[j];
      out.push({
        ...s,
        merchant: m.name,
        merchantStatus: m.status,
        map: m.map,
        x: m.x,
        y: m.y,
        server: m.server,
        standOpen,
        catalogOnly: m.fromCatalog && !m.fromLive,
        fromLive: !!m.fromLive,
      });
    }
  }
  return out;
}
