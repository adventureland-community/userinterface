/**
 * Market hub — visual/interaction port of agentic/mockups/multimerchant-market.html.
 * Layout: You (bag+stand) | Market grid | Focus (sells/wants).
 */

import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { canEditObservedGear } from "../../host/gearObserved";
import {
  buildMerchantDirectory,
  flattenListings,
  pullMerchants,
  cancelMarketTravel,
  subscribeMarketTravel,
  hydrateMarketCacheFromIdb,
  schedulePersistMarketCache,
  type MarketTravelItinerary,
} from "../../host/market";
import {
  reconcileCatalogPull,
  reconcileLiveOpenStands,
  liveOpenStandSignature,
  marketCacheContentEqual,
  type CachedMarketMerchant,
} from "../../lib/market/marketPersistLogic";
import {
  actOnMarketListing,
  canActOnListing,
  travelToListing,
} from "../../host/market/marketListingActions";
import {
  filterMarketListings,
  groupMarketListings,
  marketGroupHasArb,
  marketGroupHasBothPrices,
  sortMarketGroups,
  sortMarketListings,
  MARKET_GROUP_SORT_OPTIONS,
  type MarketGroupSort,
  type MarketItemGroup,
} from "../../lib/market/marketBrowse";
import { getSettings, patchSettings } from "../../lib/settings";
import {
  applySearchSuggestion,
  buildMarketSearchSuggestions,
  rewriteIsInFilter,
  syncTogglesFromQuery,
  trailingOpContext,
  type MarketSearchSuggestion,
  type MarketToggleSync,
} from "../../lib/market/marketQuery";
import {
  collapseMarketBagStacks,
  marketBagStackKey,
  type MarketBagStack,
} from "../../lib/market/marketBagStacks";
import { collapseMarketStandPackSlots } from "../../lib/market/marketStandPackStacks";
import type { MarketListingRow } from "../../lib/market/marketTypes";
import { formatTradeGold } from "../../lib/tradeHelpers";
import { formatRelativeAge } from "../../lib/format";
import { resolveOwnTradeEntity } from "../../lib/tradeEntityResolve";
import { itemInstanceLabel } from "../../lib/gameIcon";
import { simpleDistance } from "../../host/al";
import { ItemInstance } from "../chrome/ItemInstance";
import { showTradeWishlistPicker } from "../gear/tradeWishlistPicker";
import {
  merchantCloseCommand,
  merchantOpenCommand,
} from "../../host/tradeCommands";
import {
  merchantStandCapacity,
  merchantStandSlotNames,
  observingTradeSlotNames,
  personalTradeSlotNames,
  tradeSlotIsEmpty,
} from "../../lib/tradeSlots";
import {
  hasObservingInventorySnapshot,
  refreshObservedInventory,
} from "../../host/inventory";
import { mergeStandTradeSlotsForUi } from "../../lib/standTradeSlotMemory";
import { TradeSlotCell } from "../trade/TradeSlotCell";
import { ensureMarketPanelCss } from "./marketPanelCss";

export type MarketPanelProps = {
  entities: EntityLike[];
  observing?: EntityLike | null;
  layoutEdit?: boolean;
  seedMerchant?: string | null;
  seedDesk?: "buy" | "sell" | null;
  seedSeq?: number;
};

const CATALOG_REFRESH_MS = 45000;

type Facet = "all" | "sale" | "wanted" | "giveaway";

function bagNameSet(observing: EntityLike | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = Object.create(null);
  const items = observing && observing.items;
  if (!items) return out;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it && it.name) out[String(it.name).toLowerCase()] = true;
  }
  return out;
}

function friendNameSet(
  entities: EntityLike[],
  observing: EntityLike | null | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = Object.create(null);
  const party = observing && observing.party ? String(observing.party) : "";
  if (!party) return out;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || !ent.name || !ent.party) continue;
    if (String(ent.party) !== party) continue;
    if (observing && ent.id === observing.id) continue;
    out[String(ent.name).toLowerCase()] = true;
  }
  return out;
}

/** Prefer live window.observing (bag items) over tick snapshot. */
function useLiveObserving(
  fallback: EntityLike | null | undefined,
): EntityLike | null | undefined {
  const React = getReact();
  const read = () => {
    const w = typeof window !== "undefined" ? window.observing : null;
    return (w || fallback || null) as EntityLike | null;
  };
  const fp = (obs: EntityLike | null) => {
    if (!obs) return "";
    const items = Array.isArray(obs.items) ? obs.items : null;
    let filled = 0;
    let gold = obs.gold != null ? String(obs.gold) : "";
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i] && items[i].name) filled++;
      }
    }
    const stand = obs.stand != null && obs.stand !== false ? "1" : "0";
    const slots = obs.slots ? Object.keys(obs.slots).length : 0;
    return (
      String(obs.id || "") +
      "\0" +
      String(obs.name || "") +
      "\0" +
      gold +
      "\0" +
      filled +
      "\0" +
      stand +
      "\0" +
      slots +
      "\0" +
      (items ? "1" : "0")
    );
  };
  const [obs, setObs] = React.useState(read);
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const next = read();
      setObs((prev: EntityLike | null) =>
        fp(prev) === fp(next) ? prev : next,
      );
    }, 500);
    return () => window.clearInterval(id);
  }, [fallback && fallback.id]);
  return obs;
}

function itemLabel(name: string, level?: number, p?: string | null): string {
  return (
    itemInstanceLabel(name, {
      level,
      p: p != null ? String(p) : undefined,
    }) || name
  );
}

function currentServerRaw(): string {
  const region =
    typeof window.server_region === "string" ? window.server_region : "";
  const ident =
    typeof window.server_identifier === "string"
      ? window.server_identifier
      : "";
  if (region && ident) return region + ident;
  return region || ident || "";
}

function formatMarketServer(server?: string | null): string {
  const rawIn = server || currentServerRaw();
  if (!rawIn) return "?";
  const fn = (
    window as Window & { server_to_ui?: (key: string) => string }
  ).server_to_ui;
  if (typeof fn === "function") {
    try {
      const label = fn(String(rawIn));
      if (label) return String(label);
    } catch {
      /* fall through */
    }
  }
  const raw = String(rawIn).replace(/^SR_/i, "");
  const m = raw.match(/^([A-Z]+?)(I[IVX]*|V|X)?$/i);
  if (m && m[2]) return m[1].toUpperCase() + " " + m[2].toUpperCase();
  return raw || "?";
}

type OfferLocationMeta = {
  server: string;
  map: string;
  distance: string;
  qty: string;
  cache: string;
  cacheTip?: string;
};

/** Discrete location / stock / cache bits for focus offer cards. */
function offerLocationMeta(
  row: MarketListingRow,
  observing: EntityLike | null | undefined,
  now = Date.now(),
): OfferLocationMeta {
  const server = formatMarketServer(row.server);
  const map = row.map ? String(row.map) : "";
  let distance = "";
  const sameMap =
    row.merchantStatus === "inRange" ||
    row.merchantStatus === "sameMap" ||
    row.merchantStatus === "you";
  if (
    sameMap &&
    row.x != null &&
    row.y != null &&
    observing &&
    (observing.real_x != null ||
      observing.x != null ||
      observing.real_y != null ||
      observing.y != null)
  ) {
    const d = Math.round(
      simpleDistance(
        { x: row.x, y: row.y },
        {
          x: observing.real_x ?? observing.x,
          y: observing.real_y ?? observing.y,
        },
      ),
    );
    if (Number.isFinite(d)) distance = d + " away";
  }
  const qty =
    row.giveaway && row.giveawayEntries != null
      ? row.giveawayEntries + " in"
      : row.q != null && row.q > 1
        ? "×" + String(row.q | 0)
        : "";

  let cache = "";
  let cacheTip: string | undefined;
  const closedStand =
    !row.standOpen && /^trade([5-9]|\d{2,})$/.test(row.slot);
  if (row.catalogOnly || closedStand) {
    const age = offerCacheAgeLabel(row, now);
    const kind = row.catalogOnly ? "cached" : "closed";
    cache = age ? kind + " · " + age : kind;
    cacheTip = row.catalogOnly
      ? age
        ? "Cached listing · last refreshed " + age
        : "Cached listing (age unknown)"
      : age
        ? "Stand closed · last seen " + age
        : "Stand closed";
  }

  return { server, map, distance, qty, cache, cacheTip };
}

function offerCacheAgeLabel(row: MarketListingRow, now = Date.now()): string {
  const at = row.lastRefreshedAt;
  if (at == null || !(at > 0)) return "";
  return formatRelativeAge(at, now);
}

function actionLabel(row: MarketListingRow): string {
  if (row.merchantStatus === "you") return "Yours";
  if (canActOnListing(row)) {
    if (row.giveaway) return "Join";
    return row.buyOrder ? "Sell" : "Buy";
  }
  return "Travel";
}

function marketItemIcon(
  name: string,
  opts: { level?: number; p?: string | null; size: number; q?: number },
): any {
  return e(ItemInstance, {
    name,
    size: opts.size,
    level: opts.level,
    q: opts.q,
    p: opts.p != null ? String(opts.p) : undefined,
  });
}

function nextBest(
  rows: MarketListingRow[],
  side: "buy" | "sell",
): MarketListingRow | null {
  const wantBuy = side === "buy";
  let best: MarketListingRow | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (wantBuy) {
      if (r.buyOrder || r.giveaway) continue;
      if (!canActOnListing(r)) continue;
      if (!best || r.price < best.price) best = r;
    } else {
      if (!r.buyOrder || r.giveaway) continue;
      if (!canActOnListing(r)) continue;
      if (!best || r.price > best.price) best = r;
    }
  }
  return best;
}

export function MarketPanel(props: MarketPanelProps): any {
  const React = getReact();
  ensureMarketPanelCss();

  const [query, setQuery] = React.useState("");
  const [facet, setFacet] = React.useState("all" as Facet);
  const [groupSort, setGroupSort] = React.useState("dual" as MarketGroupSort);
  const [nearOnly, setNearOnly] = React.useState(false);
  const [canAfford, setCanAfford] = React.useState(false);
  const [haveStock, setHaveStock] = React.useState(false);
  const [favOnly, setFavOnly] = React.useState(false);
  const [favoriteKeys, setFavoriteKeys] = React.useState(() =>
    getSettings().marketFavoriteKeys.slice(),
  );
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchHi, setSearchHi] = React.useState(0);
  const searchInputRef = React.useRef(null as HTMLInputElement | null);
  const [merchantFilter, setMerchantFilter] = React.useState(
    null as string | null,
  );
  const [focusKey, setFocusKey] = React.useState(null as string | null);
  const [bagStackKey, setBagStackKey] = React.useState(
    null as string | null,
  );
  const [standCompact, setStandCompact] = React.useState(true);
  const [catalogMerchants, setCatalogMerchants] = React.useState(
    [] as CachedMarketMerchant[],
  );
  const [catalogMsg, setCatalogMsg] = React.useState("");
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [pulledAt, setPulledAt] = React.useState(null as string | null);
  const [travel, setTravel] = React.useState(
    null as MarketTravelItinerary | null,
  );

  React.useEffect(() => subscribeMarketTravel(setTravel), []);

  React.useEffect(() => {
    let cancelled = false;
    void hydrateMarketCacheFromIdb().then((merchants) => {
      if (cancelled || !merchants.length) return;
      setCatalogMerchants((prev) => (prev.length ? prev : merchants));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (props.seedSeq == null) return;
    let nextQ = "";
    let nextFacet: Facet = "all";
    if (props.seedMerchant) {
      setMerchantFilter(String(props.seedMerchant));
      nextQ = "merchant:" + String(props.seedMerchant);
    }
    if (props.seedDesk === "buy") nextFacet = "sale";
    if (props.seedDesk === "sell") nextFacet = "wanted";
    nextQ = rewriteIsInFilter(nextQ, {
      facet: nextFacet,
      nearOnly: false,
      canAfford: false,
      haveStock: false,
    });
    setQuery(nextQ);
    setFacet(nextFacet);
    setNearOnly(false);
    setCanAfford(false);
    setHaveStock(false);
  }, [props.seedSeq]);

  const refreshCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogMsg("");
    const res = await pullMerchants();
    setCatalogLoading(false);
    if (!res.ok) {
      setCatalogMsg(res.message || "Catalog refresh failed");
      return;
    }
    const now = Date.now();
    setCatalogMerchants((prev) => {
      const next = reconcileCatalogPull(prev, res.chars, now);
      schedulePersistMarketCache(next);
      return next;
    });
    setPulledAt(res.pulledAt || new Date().toISOString());
  }, []);

  React.useEffect(() => {
    void refreshCatalog();
    const id = window.setInterval(() => {
      void refreshCatalog();
    }, CATALOG_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshCatalog]);

  const liveStandSig = liveOpenStandSignature(props.entities);
  const entitiesRef = React.useRef(props.entities);
  entitiesRef.current = props.entities;
  React.useEffect(() => {
    const now = Date.now();
    setCatalogMerchants((prev) => {
      const next = reconcileLiveOpenStands(prev, entitiesRef.current, now);
      if (marketCacheContentEqual(prev, next)) return prev;
      schedulePersistMarketCache(next);
      return next;
    });
  }, [liveStandSig]);

  const observing = useLiveObserving(props.observing);
  const ownEntity = resolveOwnTradeEntity(props.entities, observing);
  const friends = friendNameSet(props.entities, observing);
  const bagNames = bagNameSet(observing);
  const gold =
    observing && typeof observing.gold === "number" ? observing.gold : 0;
  const gearEditable = canEditObservedGear(ownEntity, false);
  const bagSynced = hasObservingInventorySnapshot();

  const merchants = buildMerchantDirectory({
    entities: props.entities,
    catalogMerchants,
    observing,
  });
  const flat = flattenListings(merchants);
  const applyQuery = (next: string) => {
    setQuery(next);
    const sync = syncTogglesFromQuery(next);
    setFacet(sync.facet);
    setNearOnly(sync.nearOnly);
    setCanAfford(sync.canAfford);
    setHaveStock(sync.haveStock);
    if (merchantFilter && next.toLowerCase().indexOf("merchant:") < 0) {
      setMerchantFilter(null);
    }
  };
  const applyToggleSync = (next: MarketToggleSync) => {
    const rewritten = rewriteIsInFilter(query, next);
    setQuery(rewritten);
    setFacet(next.facet);
    setNearOnly(next.nearOnly);
    setCanAfford(next.canAfford);
    setHaveStock(next.haveStock);
  };
  const side =
    facet === "sale"
      ? "sale"
      : facet === "wanted"
        ? "buy"
        : facet === "giveaway"
          ? "giveaway"
          : "all";
  let rows = filterMarketListings(flat, {
    query,
    side,
    canAfford,
    inMyBag: haveStock,
    nearOnly,
    gold,
    bagNames,
    friendNames: friends,
    merchantName: merchantFilter,
    formatServer: formatMarketServer,
  });
  rows = sortMarketListings(rows, friends);
  const favoriteSet: Record<string, boolean> = Object.create(null);
  for (let i = 0; i < favoriteKeys.length; i++) {
    favoriteSet[favoriteKeys[i]] = true;
  }
  let groups = sortMarketGroups(
    groupMarketListings(rows),
    groupSort,
    favoriteSet,
  );
  if (favOnly) {
    const favGroups: MarketItemGroup[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (favoriteSet[groups[i].key]) favGroups.push(groups[i]);
    }
    groups = favGroups;
  }
  const toggleFavorite = (key: string) => {
    const next = favoriteKeys.slice();
    const idx = next.indexOf(key);
    if (idx >= 0) next.splice(idx, 1);
    else next.push(key);
    setFavoriteKeys(next);
    patchSettings({ marketFavoriteKeys: next });
  };
  const searchSug = buildMarketSearchSuggestions({
    query,
    rows: flat,
    formatServer: formatMarketServer,
  });
  const pickSearchSuggestion = (row: MarketSearchSuggestion) => {
    const next = applySearchSuggestion(query, row);
    applyQuery(next);
    setSearchHi(0);
    const keepsOpen = !!(row.insert && /:$/.test(row.insert));
    setSearchOpen(keepsOpen || !!trailingOpContext(next));
    window.setTimeout(() => {
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* ignore */
        }
      }
    }, 0);
  };

  const focusGroup: MarketItemGroup | null = (() => {
    if (!focusKey) return null;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].key === focusKey) return groups[i];
    }
    return null;
  })();

  const runOffer = async (row: MarketListingRow, takeAll?: boolean) => {
    if (row.merchantStatus === "you") return;
    if (!canActOnListing(row)) {
      travelToListing(row);
      return;
    }
    await actOnMarketListing({
      row,
      entities: props.entities,
      observing,
      takeAll,
    });
  };

  const rawBag: Array<{
    slot: number;
    name: string;
    q?: number;
    level?: number;
    p?: string | null;
    skin?: string;
  }> = [];
  const rawItems = observing && observing.items ? observing.items : [];
  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i];
    if (!it || !it.name) continue;
    rawBag.push({
      slot: i,
      name: String(it.name),
      q: it.q,
      level: it.level,
      p: it.p != null ? String(it.p) : null,
      skin: it.skin != null ? String(it.skin) : undefined,
    });
  }
  const bagStacks = collapseMarketBagStacks(rawBag);

  const standOpen = !!(
    ownEntity &&
    ownEntity.stand != null &&
    ownEntity.stand !== false &&
    ownEntity.stand !== ""
  );

  const selectedBag: MarketBagStack | null = (() => {
    if (!bagStackKey) return null;
    for (let i = 0; i < bagStacks.length; i++) {
      const s = bagStacks[i];
      if (
        marketBagStackKey({ name: s.name, level: s.level, p: s.p }) ===
        bagStackKey
      ) {
        return s;
      }
    }
    return null;
  })();

  const offerCard = (row: MarketListingRow) => {
    const own = row.merchantStatus === "you";
    const statusChips: any[] = [];
    if (row.merchantStatus === "inRange") {
      statusChips.push(
        e("span", { key: "n", className: "MarketPanel-chip near" }, "near"),
      );
    }
    if (own) {
      statusChips.push(
        e("span", { key: "y", className: "MarketPanel-chip" }, "you"),
      );
    }
    if (friends[row.merchant.toLowerCase()]) {
      statusChips.push(
        e("span", { key: "p", className: "MarketPanel-chip party" }, "party"),
      );
    }
    const loc = offerLocationMeta(row, observing);
    const place = [loc.server, loc.map].filter(Boolean).join(" · ");
    const metaCell = (kind: string, text: string, title?: string) =>
      text
        ? e(
            "span",
            {
              className: "MarketPanel-offerMetaCell is-" + kind,
              title: title || text,
            },
            text,
          )
        : e("span", {
            className: "MarketPanel-offerMetaCell is-" + kind + " is-empty",
            "aria-hidden": true,
          });
    return e(
      "div",
      {
        key: row.merchant + ":" + row.slot + ":" + (row.rid || ""),
        className:
          "MarketPanel-offer" +
          (own ? " is-blocked" : "") +
          (row.giveaway
            ? " is-give"
            : row.buyOrder
              ? " is-want"
              : " is-sale"),
        title: loc.cacheTip,
      },
      e(
        "div",
        { className: "MarketPanel-offerTop" },
        e(
          "div",
          { className: "MarketPanel-who" },
          e("span", { className: "MarketPanel-whoName" }, row.merchant),
          loc.distance
            ? e(
                "span",
                {
                  className: "MarketPanel-whoDist",
                  title: loc.distance,
                },
                loc.distance,
              )
            : null,
          statusChips.length
            ? e("span", { className: "MarketPanel-chips" }, statusChips)
            : null,
        ),
        e(
          "div",
          { className: "MarketPanel-price" },
          row.giveaway ? "free" : formatTradeGold(row.price),
        ),
      ),
      e(
        "div",
        { className: "MarketPanel-offerMeta" },
        metaCell("place", place),
        metaCell(
          "qty",
          loc.qty,
          loc.qty
            ? row.giveaway
              ? "Entrants " + loc.qty
              : "Quantity " + loc.qty
            : undefined,
        ),
      ),
      e(
        "div",
        { className: "MarketPanel-offerFoot" },
        e(
          "span",
          {
            className:
              "MarketPanel-offerCache" + (loc.cache ? "" : " is-empty"),
            title: loc.cacheTip,
          },
          loc.cache || "",
        ),
        e(
          "button",
          {
            type: "button",
            className:
              "MarketPanel-rowAct is-primary " +
              (row.giveaway
                ? "is-give"
                : row.buyOrder
                  ? "is-sell"
                  : "is-buy"),
            disabled: own,
            title: own
              ? "Your listing — use Stand to reprice or delist"
              : undefined,
            onClick: (ev: any) => {
              if (own) return;
              void runOffer(row, !!(ev && ev.shiftKey));
            },
          },
          actionLabel(row),
        ),
      ),
    );
  };

  const marketBody =
    groups.length === 0
      ? e(
          "div",
          { className: "MarketPanel-empty" },
          e("strong", null, "Nothing matches"),
          "Try clearing filters or search.",
        )
      : e(
          "div",
          { className: "MarketPanel-itemGrid" },
          groups.map((g: MarketItemGroup) => {
            const dual = marketGroupHasBothPrices(g);
            const arb = marketGroupHasArb(g);
            const on = focusKey === g.key;
            const isFav = !!favoriteSet[g.key];
            return e(
              "div",
              {
                key: g.key,
                className:
                  "MarketPanel-itemCard" +
                  (dual ? " is-dual" : "") +
                  (g.giveaways.length ? " is-give" : "") +
                  (arb ? " is-arb" : "") +
                  (isFav ? " is-fav" : "") +
                  (on ? " is-on" : ""),
              },
              e(
                "button",
                {
                  type: "button",
                  className:
                    "MarketPanel-itemCard__fav" + (isFav ? " is-on" : ""),
                  title: isFav ? "Unfavorite" : "Favorite",
                  onClick: (ev: any) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    toggleFavorite(g.key);
                  },
                },
                isFav ? "★" : "☆",
              ),
              e(
                "button",
                {
                  type: "button",
                  className: "MarketPanel-itemCard__hit",
                  onClick: () => setFocusKey(g.key),
                },
                e(
                  "div",
                  { className: "MarketPanel-itemCard__top" },
                  marketItemIcon(g.name, { level: g.level, p: g.p, size: 48 }),
                  e(
                    "div",
                    { className: "MarketPanel-itemCard__counts" },
                    e(
                      "span",
                      {
                        className: "s" + (g.sales.length ? "" : " dim"),
                      },
                      g.sales.length + "S",
                    ),
                    e(
                      "span",
                      {
                        className: "b" + (g.wants.length ? "" : " dim"),
                      },
                      g.wants.length + "B",
                    ),
                    e(
                      "span",
                      {
                        className: "g" + (g.giveaways.length ? "" : " dim"),
                      },
                      g.giveaways.length + "G",
                    ),
                  ),
                ),
                e(
                  "div",
                  { className: "nm" },
                  itemLabel(g.name, g.level, g.p),
                ),
                e(
                  "div",
                  { className: "MarketPanel-itemCard__prices" },
                  e(
                    "div",
                    { className: "row-p" },
                    e("span", { className: "lbl" }, "Sell"),
                    e(
                      "span",
                      {
                        className:
                          "val " + (g.bestSale != null ? "sell" : "none"),
                      },
                      g.bestSale != null ? formatTradeGold(g.bestSale) : "—",
                    ),
                  ),
                  e(
                    "div",
                    { className: "row-p" },
                    e("span", { className: "lbl" }, "Buy"),
                    e(
                      "span",
                      {
                        className:
                          "val " + (g.bestWant != null ? "buy" : "none"),
                      },
                      g.bestWant != null ? formatTradeGold(g.bestWant) : "—",
                    ),
                  ),
                  g.giveaways.length
                    ? e(
                        "div",
                        { className: "row-p" },
                        e("span", { className: "lbl" }, "Give"),
                        e(
                          "span",
                          { className: "val give" },
                          g.giveaways.length + " free",
                        ),
                      )
                    : null,
                ),
              ),
            );
          }),
        );

  const bestBuy = focusGroup ? nextBest(focusGroup.rows, "buy") : null;
  const bestSell = focusGroup ? nextBest(focusGroup.rows, "sell") : null;

  const focusPane = focusGroup
    ? [
        e(
          "div",
          { key: "ph", className: "MarketPanel-ph" },
          "Focus ",
          e("em", null, focusGroup.rows.length + " offers"),
        ),
        e(
          "div",
          { key: "top", className: "MarketPanel-focusTop" },
          e(
            "div",
            { className: "MarketPanel-focusHead" },
            marketItemIcon(focusGroup.name, {
              level: focusGroup.level,
              p: focusGroup.p,
              size: 40,
            }),
            e(
              "div",
              { className: "MarketPanel-focusHeadText" },
              e(
                "div",
                { className: "MarketPanel-focusTitleRow" },
                e(
                  "h2",
                  null,
                  itemLabel(focusGroup.name, focusGroup.level, focusGroup.p),
                ),
                e(
                  "button",
                  {
                    type: "button",
                    className:
                      "MarketPanel-favBtn" +
                      (favoriteSet[focusGroup.key] ? " is-on" : ""),
                    title: favoriteSet[focusGroup.key]
                      ? "Unfavorite"
                      : "Favorite",
                    onClick: () => toggleFavorite(focusGroup.key),
                  },
                  favoriteSet[focusGroup.key] ? "★" : "☆",
                ),
              ),
              e(
                "div",
                { className: "sub" },
                focusGroup.sales.length +
                  " selling · " +
                  focusGroup.wants.length +
                  " buying" +
                  (focusGroup.giveaways.length
                    ? " · " + focusGroup.giveaways.length + " giveaways"
                    : ""),
              ),
            ),
          ),
          e(
            "div",
            { className: "MarketPanel-dealBar" },
            e(
              "button",
              {
                type: "button",
                className: "MarketPanel-btn MarketPanel-btn--gold",
                disabled: !bestBuy,
                onClick: () => {
                  if (bestBuy) void runOffer(bestBuy);
                },
              },
              bestBuy
                ? "Buy best · " + formatTradeGold(bestBuy.price)
                : "Buy best",
            ),
            e(
              "button",
              {
                type: "button",
                className: "MarketPanel-btn MarketPanel-btn--sell",
                disabled: !bestSell,
                onClick: () => {
                  if (bestSell) void runOffer(bestSell);
                },
              },
              bestSell
                ? "Sell best · " + formatTradeGold(bestSell.price)
                : "Sell best",
            ),
            e(
              "p",
              { className: "hint" },
              (bestBuy
                ? bestBuy.merchant + " sells @ " + formatTradeGold(bestBuy.price)
                : "No buyable sales") +
                " · " +
                (bestSell
                  ? bestSell.merchant +
                    " wants @ " +
                    formatTradeGold(bestSell.price)
                  : bagNames[focusGroup.name.toLowerCase()]
                    ? "No buy orders"
                    : "Not in bag"),
            ),
          ),
        ),
        e(
          "div",
          {
            key: "offers",
            className:
              "MarketPanel-focusOffers" +
              (focusGroup.giveaways.length ? " has-gives" : ""),
          },
          e(
            "div",
            { className: "MarketPanel-focusCol MarketPanel-focusCol--sells" },
            e(
              "div",
              { className: "MarketPanel-focusColH" },
              e("span", { className: "sells" }, "Sells"),
              e("em", null, String(focusGroup.sales.length)),
            ),
            focusGroup.sales.length
              ? focusGroup.sales
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map(offerCard)
              : e(
                  "div",
                  { className: "MarketPanel-focusColEmpty" },
                  "No sell offers",
                ),
          ),
          e(
            "div",
            {
              className:
                "MarketPanel-focusCol" +
                (focusGroup.giveaways.length
                  ? " MarketPanel-focusCol--mid"
                  : ""),
            },
            e(
              "div",
              { className: "MarketPanel-focusColH" },
              e("span", { className: "wants" }, "Wants"),
              e("em", null, String(focusGroup.wants.length)),
            ),
            focusGroup.wants.length
              ? focusGroup.wants
                  .slice()
                  .sort((a, b) => b.price - a.price)
                  .map(offerCard)
              : e(
                  "div",
                  { className: "MarketPanel-focusColEmpty" },
                  "No buy orders",
                ),
          ),
          focusGroup.giveaways.length
            ? e(
                "div",
                { className: "MarketPanel-focusCol" },
                e(
                  "div",
                  { className: "MarketPanel-focusColH" },
                  e("span", { className: "gives" }, "Gives"),
                  e("em", null, String(focusGroup.giveaways.length)),
                ),
                focusGroup.giveaways
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.giveawayEntries || 0) - (b.giveawayEntries || 0),
                  )
                  .map(offerCard),
              )
            : null,
        ),
      ]
    : [
        e("div", { key: "ph", className: "MarketPanel-ph" }, "Focus"),
        e(
          "div",
          { key: "empty", className: "MarketPanel-empty" },
          e("strong", null, "No item selected"),
          "Pick a card in the market grid, a bag stack, or a stand slot.",
        ),
      ];

  return e(
    "div",
    {
      className: "MarketPanel",
      "data-ecu-tour": "market-panel",
    },
    e(
      "div",
      { className: "MarketPanel-head" },
      e("h1", { className: "MarketPanel-title" }, "Market"),
      e(
        "div",
        { className: "MarketPanel-pill" },
        formatTradeGold(gold) +
          " gold" +
          (catalogMerchants.length
            ? " · " + catalogMerchants.length + " catalog"
            : catalogLoading
              ? " · catalog…"
              : "") +
          (travel ? " · Travel → " + travel.name : "") +
          (catalogMsg ? " · " + catalogMsg : ""),
      ),
      travel
        ? e(
            "button",
            {
              type: "button",
              className: "MarketPanel-btn MarketPanel-btn--ghost",
              onClick: () => cancelMarketTravel("Travel cancelled"),
            },
            "Cancel travel",
          )
        : null,
      e(
        "button",
        {
          type: "button",
          className: "MarketPanel-btn MarketPanel-btn--ghost",
          disabled: catalogLoading,
          onClick: () => {
            void refreshCatalog();
          },
          title: pulledAt ? "Catalog " + String(pulledAt) : "Refresh catalog",
        },
        catalogLoading ? "…" : "Refresh",
      ),
    ),
    e(
      "div",
      { className: "MarketPanel-tools" },
      e(
        "div",
        { className: "MarketPanel-searchWrap" },
        e(
          "div",
          { className: "MarketPanel-search" },
          e("span", { className: "ico" }, "⌕"),
          e("input", {
            ref: searchInputRef,
            type: "search",
            placeholder: "Search · item: · merchant: · is:sell · OR…",
            value: query,
            onFocus: () => {
              setSearchOpen(true);
              setSearchHi(0);
            },
            onBlur: () => {
              window.setTimeout(() => setSearchOpen(false), 120);
            },
            onChange: (ev: any) => {
              applyQuery(String(ev.target.value || ""));
              setSearchOpen(true);
              setSearchHi(0);
            },
            onKeyDown: (ev: any) => {
              const flatSug = searchSug.flat;
              if (ev.key === "Escape") {
                setSearchOpen(false);
                return;
              }
              if (!searchOpen && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) {
                setSearchOpen(true);
                return;
              }
              if (!searchOpen || !flatSug.length) return;
              if (ev.key === "ArrowDown") {
                ev.preventDefault();
                setSearchHi((h: number) => (h + 1) % flatSug.length);
              } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                setSearchHi(
                  (h: number) => (h - 1 + flatSug.length) % flatSug.length,
                );
              } else if (ev.key === "Enter" && flatSug[searchHi]) {
                ev.preventDefault();
                pickSearchSuggestion(flatSug[searchHi]);
              }
            },
          }),
          query
            ? e(
                "button",
                {
                  type: "button",
                  className: "clear",
                  title: "Clear search",
                  onMouseDown: (ev: any) => ev.preventDefault(),
                  onClick: () => {
                    applyQuery("");
                    setMerchantFilter(null);
                    setSearchOpen(false);
                    setSearchHi(0);
                  },
                },
                "×",
              )
            : null,
        ),
        searchOpen
          ? e(
              "div",
              {
                className: "MarketPanel-searchMenu",
                onMouseDown: (ev: any) => ev.preventDefault(),
              },
              searchSug.sections.map((sec, si) =>
                e(
                  "div",
                  { className: "MarketPanel-searchMenuSec", key: "sec-" + si },
                  e("div", { className: "MarketPanel-searchMenuH" }, sec.title),
                  sec.rows.map((row) => {
                    const idx = searchSug.flat.indexOf(row);
                    return e(
                      "button",
                      {
                        type: "button",
                        key: "sug-" + idx + "-" + row.label,
                        className:
                          "MarketPanel-searchMenuRow" +
                          (idx === searchHi ? " is-hi" : ""),
                        onMouseEnter: () => setSearchHi(idx),
                        onClick: () => pickSearchSuggestion(row),
                      },
                      e(
                        "span",
                        { className: "MarketPanel-searchMenuIco" },
                        row.ico || "·",
                      ),
                      row.kind === "op"
                        ? e(
                            "span",
                            { className: "MarketPanel-searchMenuOp" },
                            row.label,
                          )
                        : e(
                            "span",
                            { className: "MarketPanel-searchMenuLabel" },
                            row.label,
                          ),
                      e(
                        "span",
                        { className: "MarketPanel-searchMenuHint" },
                        row.hint || "",
                      ),
                    );
                  }),
                ),
              ),
              e(
                "div",
                { className: "MarketPanel-searchMenuFoot" },
                "Words AND · OR / | · Quotes · -negate",
                e("kbd", null, "↵"),
              ),
            )
          : null,
      ),
      e(
        "div",
        { className: "MarketPanel-seg" },
        (["all", "sale", "wanted", "giveaway"] as Facet[]).map((f) =>
          e(
            "button",
            {
              type: "button",
              key: f,
              className: facet === f ? "is-on" : "",
              onClick: () =>
                applyToggleSync({
                  facet: f,
                  nearOnly,
                  canAfford,
                  haveStock,
                }),
            },
            f === "all"
              ? "All"
              : f === "sale"
                ? "Selling"
                : f === "wanted"
                  ? "Buying"
                  : "Giveaways",
          ),
        ),
      ),
      e(
        "div",
        { className: "MarketPanel-togs" },
        e(
          "label",
          { className: "MarketPanel-tog" },
          e("input", {
            type: "checkbox",
            checked: nearOnly,
            onChange: (ev: any) =>
              applyToggleSync({
                facet,
                nearOnly: !!ev.target.checked,
                canAfford,
                haveStock,
              }),
          }),
          "Near",
        ),
        e(
          "label",
          { className: "MarketPanel-tog" },
          e("input", {
            type: "checkbox",
            checked: canAfford,
            onChange: (ev: any) =>
              applyToggleSync({
                facet,
                nearOnly,
                canAfford: !!ev.target.checked,
                haveStock,
              }),
          }),
          "Afford",
        ),
          e(
            "label",
            { className: "MarketPanel-tog" },
            e("input", {
              type: "checkbox",
              checked: haveStock,
              onChange: (ev: any) =>
                applyToggleSync({
                  facet,
                  nearOnly,
                  canAfford,
                  haveStock: !!ev.target.checked,
                }),
            }),
            "Have",
          ),
          e(
            "label",
            { className: "MarketPanel-tog" },
            e("input", {
              type: "checkbox",
              checked: favOnly,
              onChange: (ev: any) => setFavOnly(!!ev.target.checked),
            }),
            "Fav",
          ),
        ),
      ),
    e(
      "div",
      { className: "MarketPanel-body" },
      e(
        "div",
        { className: "MarketPanel-you" },
        e(
          "div",
          { className: "MarketPanel-youBag" },
          e(
            "div",
            { className: "MarketPanel-ph" },
            "Bag ",
            e(
              "em",
              null,
              bagStacks.length
                ? bagStacks.length + " stacks"
                : bagSynced
                  ? "empty"
                  : "syncing…",
            ),
          ),
          bagStacks.length
            ? e(
                "div",
                { className: "MarketPanel-youBagScroll" },
                e(
                  "div",
                  { className: "MarketPanel-slotGrid" },
                  bagStacks.map((b: MarketBagStack) => {
                  const key = marketBagStackKey({
                    name: b.name,
                    level: b.level,
                    p: b.p,
                  });
                  const label = itemInstanceLabel(b.name, {
                    level: b.level,
                    p: b.p != null ? b.p : undefined,
                  });
                  const tip =
                    label +
                    (b.q > 1 ? " ×" + b.q : "") +
                    (b.slotCount > 1
                      ? " · " + b.slotCount + " slots"
                      : "");
                  return e(
                    "button",
                    {
                      type: "button",
                      key: key,
                      className:
                        "MarketPanel-bagSlot" +
                        (bagStackKey === key ? " is-on" : ""),
                      title: tip,
                      onClick: () => {
                        setBagStackKey(key);
                        setFocusKey(key);
                        const next = rewriteIsInFilter("item:" + b.name, {
                          facet,
                          nearOnly,
                          canAfford,
                          haveStock,
                        });
                        applyQuery(next);
                      },
                    },
                    e(ItemInstance, {
                      name: b.name,
                      skin: b.skin,
                      level: b.level,
                      q: b.q,
                      p: b.p != null ? b.p : undefined,
                      size: 40,
                      title: tip,
                    }),
                  );
                }),
                ),
              )
            : e(
                "div",
                { className: "MarketPanel-youBagScroll" },
                e(
                  "div",
                  {
                    className: "MarketPanel-empty",
                    style: { padding: "16px" },
                  },
                  !observing
                    ? "Observe a character to see bag + stand."
                    : !bagSynced
                      ? e(
                          "div",
                          null,
                          e("strong", null, "Bag not synced yet"),
                          "Open Bag once, or ",
                          e(
                            "button",
                            {
                              type: "button",
                              className:
                                "MarketPanel-btn MarketPanel-btn--ghost",
                              style: { display: "inline", height: "auto" },
                              onClick: () => refreshObservedInventory(),
                            },
                            "resync",
                          ),
                          ".",
                        )
                      : "Bag is empty.",
                ),
              ),
          e(
            "div",
            { className: "MarketPanel-youActs" },
            e(
              "button",
              {
                type: "button",
                className: "MarketPanel-btn MarketPanel-btn--sell",
                disabled: !selectedBag || !gearEditable,
                title: "List selected bag item — use stand empty slot or bag menu",
                onClick: () => {
                  window.alert(
                    "Drag the bag item onto an empty stand/trade slot, or use the bag context menu → List on Trade…",
                  );
                },
              },
              "List",
            ),
            e(
              "button",
              {
                type: "button",
                className: "MarketPanel-btn MarketPanel-btn--ghost",
                disabled: !gearEditable,
                onClick: (ev: any) => {
                  const names = observingTradeSlotNames();
                  const slots =
                    observing && observing.slots ? observing.slots : null;
                  let empty: string | null = null;
                  for (let i = 0; i < names.length; i++) {
                    if (tradeSlotIsEmpty(slots, names[i])) {
                      empty = names[i];
                      break;
                    }
                  }
                  if (!empty) {
                    window.alert("No empty trade slot for a buy order.");
                    return;
                  }
                  showTradeWishlistPicker(
                    empty,
                    ev.clientX || 40,
                    ev.clientY || 40,
                  );
                },
                style: { height: "auto", padding: "7px 8px" },
              },
              "Buy order",
            ),
          ),
        ),
        e(
          "div",
          { className: "MarketPanel-youStand" },
          (() => {
            const liveSlots =
              ownEntity && ownEntity.slots ? ownEntity.slots : null;
            const entityId =
              ownEntity && ownEntity.id != null ? String(ownEntity.id) : "";
            const slots =
              gearEditable && entityId && liveSlots
                ? mergeStandTradeSlotsForUi(entityId, liveSlots, standOpen) ||
                  liveSlots
                : liveSlots;
            const capacity = ownEntity
              ? merchantStandCapacity(ownEntity, slots || undefined)
              : 0;
            // One grid like the mockup: trade1…N (Pack = filled + one empty).
            const keys = ownEntity
              ? capacity > 0
                ? merchantStandSlotNames(slots, ownEntity, standCompact, false)
                : personalTradeSlotNames(slots, ownEntity, !!gearEditable)
              : [];
            let listed = 0;
            if (slots) {
              const sk = Object.keys(slots);
              for (let i = 0; i < sk.length; i++) {
                const k = sk[i];
                if (k.indexOf("trade") !== 0) continue;
                if (slots[k] && (slots[k] as any).name) listed += 1;
              }
            }
            const free =
              capacity > 0
                ? Math.max(0, capacity - listed)
                : Math.max(0, keys.length - listed);
            const space =
              capacity > 0
                ? free <= 0
                  ? listed + " listed"
                  : free + " free · " + listed + " listed"
                : listed
                  ? listed + " listed"
                  : "";
            // Pack + All share the same 4-col content-sized grid spacing.
            const pack = !!standCompact;
            const iconSize = 40;
            const packEntries = pack
              ? collapseMarketStandPackSlots(keys, slots)
              : keys.map((sn: string) => ({
                  slotName: sn,
                  slotNames: [sn],
                  slot: slots ? slots[sn] || null : null,
                }));
            return [
              e(
                "div",
                { key: "ph", className: "MarketPanel-ph" },
                "Stand ",
                e("em", null, space || (standOpen ? "open" : "closed")),
                e(
                  "span",
                  { className: "MarketPanel-phTools" },
                  e(
                    "span",
                    { className: "MarketPanel-seg" },
                    e(
                      "button",
                      {
                        type: "button",
                        className: standCompact ? "is-on" : "",
                        onClick: () => setStandCompact(true),
                      },
                      "Pack",
                    ),
                    e(
                      "button",
                      {
                        type: "button",
                        className: standCompact ? "" : "is-on",
                        onClick: () => setStandCompact(false),
                      },
                      "All",
                    ),
                  ),
                  e(
                    "button",
                    {
                      type: "button",
                      className: "MarketPanel-btn MarketPanel-btn--ghost",
                      disabled: !gearEditable,
                      onClick: () => {
                        if (standOpen) merchantCloseCommand();
                        else merchantOpenCommand();
                      },
                    },
                    standOpen ? "Close" : "Open",
                  ),
                ),
              ),
              e(
                "div",
                { key: "bar", className: "MarketPanel-standBar" },
                e(
                  "span",
                  { className: "st" + (standOpen ? "" : " off") },
                  standOpen ? "Open" : "Closed",
                ),
                e(
                  "span",
                  null,
                  (ownEntity && ownEntity.map
                    ? String(ownEntity.map)
                    : "—") +
                    (observing && observing.name
                      ? " · " + String(observing.name)
                      : "") +
                    (capacity ? " · " + capacity : ""),
                ),
              ),
              ownEntity && keys.length
                ? e(
                    "div",
                    {
                      key: "grid",
                      className:
                        "MarketPanel-standSlots" +
                        (pack ? " is-pack" : " is-all"),
                    },
                    packEntries.map((entry) =>
                      e(TradeSlotCell, {
                        key: entry.slotName,
                        entity: ownEntity,
                        observing,
                        slotName: entry.slotName,
                        slot: entry.slot,
                        gearEditable,
                        allSlots: slots || undefined,
                        iconSize,
                        fluid: true,
                        selected:
                          !!focusKey &&
                          entry.slotNames.indexOf(focusKey) >= 0,
                      }),
                    ),
                  )
                : e(
                    "div",
                    {
                      key: "empty",
                      className: "MarketPanel-focusColEmpty",
                    },
                    ownEntity
                      ? "No stand slots — open stand or list on trade1–4."
                      : "No stand while not observing.",
                  ),
            ];
          })(),
        ),
      ),
      e(
        "div",
        { className: "MarketPanel-col" },
        e(
          "div",
          { className: "MarketPanel-ph" },
          "Market ",
          e(
            "em",
            null,
            groups.length + " items · " + rows.length + " listings",
          ),
          e(
            "span",
            { className: "MarketPanel-phTools" },
            e(
              "label",
              { className: "MarketPanel-sort" },
              e("span", null, "Sort"),
              e(
                "select",
                {
                  value: groupSort,
                  onChange: (ev: any) => {
                    setGroupSort(String(ev.target.value) as MarketGroupSort);
                  },
                  title: "Sort market cards",
                },
                MARKET_GROUP_SORT_OPTIONS.map((opt) =>
                  e(
                    "option",
                    { key: opt.id, value: opt.id },
                    opt.label,
                  ),
                ),
              ),
            ),
          ),
        ),
        marketBody,
      ),
      e("div", { className: "MarketPanel-col" }, focusPane),
    ),
  );
}
