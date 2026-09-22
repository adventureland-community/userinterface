/**
 * Market merchant / listing types + directory status.
 */

export type MerchantStatus =
  | "you"
  | "inRange"
  | "sameMap"
  | "otherMap"
  | "otherServer"
  | "catalogOnly";

export type MarketSlotListing = {
  slot: string;
  name: string;
  rid?: string;
  price: number;
  /** true = buy order (merchant wants to buy). */
  buyOrder: boolean;
  /** Free giveaway (join_giveaway), not a priced sale. */
  giveaway?: boolean;
  /** Entrant count when catalog/live exposes a registry. */
  giveawayEntries?: number;
  /** Participant character names (from registry / list). */
  giveawayNames?: string[];
  /** Minutes remaining on the giveaway (slot.giveaway from the server). */
  giveawayMinutes?: number;
  q?: number;
  level?: number;
  p?: string | null;
  stat_type?: string;
  /** ms epoch — last pull / open-stand refresh for this rid. */
  lastRefreshedAt?: number;
};

export type MarketMerchant = {
  name: string;
  level?: number;
  map?: string;
  x?: number;
  y?: number;
  server?: string;
  stand?: string | boolean | null;
  afk?: boolean | string;
  skin?: string;
  /** Live entity id when merged from entities. */
  entityId?: string;
  status: MerchantStatus;
  slots: MarketSlotListing[];
  fromCatalog: boolean;
  fromLive: boolean;
};

export type MarketListingRow = MarketSlotListing & {
  merchant: string;
  merchantStatus: MerchantStatus;
  map?: string;
  x?: number;
  y?: number;
  server?: string;
  standOpen: boolean;
  catalogOnly: boolean;
  /** Merchant is currently in `entities` (visible / loaded). */
  fromLive: boolean;
};
