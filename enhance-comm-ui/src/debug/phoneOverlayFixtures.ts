/**
 * Seed overlay preview with bag/bank/mail/chat/market data so phone drivers
 * exercise real panels (same IIFE as Tampermonkey) without a live hub account.
 * No-op unless window.__ecuOverlayPreview is set by the overlay host.
 */

import {
  ensurePartyConversation,
  pushLocalPartyChat,
  pushPartyChat,
  selectHubChat,
} from "../host/chat";
import { setCachedBankSnapshot } from "../host/bank";
import { commit as commitMail } from "../host/mail/mailState";
import { setCachedMarketMerchants } from "../host/market/marketMemory";
import { patchSettings } from "../lib/settings";
import type { BankSnapshot } from "../lib/bank/bankTypes";
import type { CachedMarketMerchant } from "../lib/market/marketPersistLogic";

const BAG_SYNC_STAMP_KEY = "__ecuBagSyncedAt";

function seedObservingBag(): void {
  const obs = window.observing as Record<string, unknown> | null;
  if (!obs) return;
  // Always reseed on overlay so bag shots stay dense through long drives.
  obs.items = [
    { name: "mpot1", q: 80 },
    { name: "hpot1", q: 120 },
    { name: "shoes", level: 7, q: 1 },
    { name: "helmet", level: 6, q: 1 },
    { name: "leather", q: 40 },
    { name: "fire", q: 12 },
    { name: "gloves", level: 4, q: 1 },
    { name: "pants", level: 5, q: 1 },
    { name: "scroll0", q: 30 },
    { name: "sword", level: 3, q: 1 },
    { name: "staff", level: 2, q: 1 },
    { name: "gem0", q: 2 },
    { name: "coat", level: 4, q: 1 },
    { name: "hpbelt", level: 5, q: 1 },
    { name: "cscroll0", q: 9 },
    { name: "scroll1", q: 18 },
    { name: "crabclaw", q: 14 },
    { name: "frogt", q: 6 },
    { name: "feather", q: 33 },
    { name: "wbook0", level: 2, q: 1 },
    { name: "strring", level: 3, q: 1 },
    null,
    { name: "intearring", level: 2, q: 1 },
    { name: "bow", level: 6, q: 1 },
    { name: "shield", level: 5, q: 1 },
    { name: "gem1", q: 1 },
    { name: "hpamulet", level: 3, q: 1 },
    { name: "mpamulet", level: 2, q: 1 },
    { name: "ringsj", level: 4, q: 1 },
    { name: "vitearring", level: 1, q: 1 },
    { name: "dexring", level: 2, q: 1 },
    { name: "orbofstr", level: 1, q: 1 },
    { name: "sshield", level: 3, q: 1 },
    { name: "basher", level: 5, q: 1 },
    { name: "fireblade", level: 4, q: 1 },
  ];
  obs[BAG_SYNC_STAMP_KEY] = Date.now();
  if (obs.gold == null) obs.gold = 2_450_000;
}

function seedBank(): void {
  const snap: BankSnapshot = {
    gold: 12_500_000,
    loadedAt: Date.now(),
    packs: {
      items0: [
        { name: "helmet", level: 8, q: 1 },
        { name: "shoes", level: 7, q: 1 },
        { name: "coat", level: 6, q: 1 },
        { name: "pants", level: 5, q: 1 },
        { name: "gloves", level: 4, q: 1 },
        { name: "hpbelt", level: 7, q: 1 },
        { name: "strring", level: 3, q: 1 },
        { name: "intearring", level: 2, q: 1 },
        { name: "leather", q: 220 },
        { name: "essenceoffire", q: 48 },
        { name: "scroll1", q: 18 },
        { name: "cscroll0", q: 9 },
        null,
        null,
        { name: "mpot1", q: 400 },
        { name: "hpot1", q: 400 },
        { name: "crabclaw", q: 14 },
        { name: "frogt", q: 6 },
        { name: "feather", q: 33 },
        null,
        { name: "wbook0", level: 2, q: 1 },
      ],
      items1: [
        { name: "sword", level: 8, q: 1 },
        { name: "staff", level: 7, q: 1 },
        { name: "bow", level: 6, q: 1 },
        { name: "shield", level: 5, q: 1 },
        null,
        { name: "gem0", q: 3 },
        { name: "gem1", q: 1 },
      ],
    },
  };
  setCachedBankSnapshot(snap);
}

function seedMail(): void {
  const now = Date.now();
  commitMail({
    mails: [
      {
        id: "ecu-preview-mail-1",
        fro: "Brick",
        to: "Preview",
        subject: "Mats for tonight",
        message: "Dropping leather + scrolls — grab when you can.",
        sent: new Date(now - 3_600_000).toISOString(),
        read: false,
        item: { name: "leather", q: 40 },
        canTake: true,
      },
      {
        id: "ecu-preview-mail-2",
        fro: "Ember",
        to: "Preview",
        subject: "Stand prices",
        message: "Undercut crabclaw by 5% if stock is stale.",
        sent: new Date(now - 86_400_000).toISOString(),
        read: true,
      },
      {
        id: "ecu-preview-mail-3",
        fro: "System",
        to: "Preview",
        subject: "Daily gift",
        message: "Thanks for playing.",
        sent: new Date(now - 172_800_000).toISOString(),
        read: true,
        system: true,
        item: { name: "gem0", q: 1 },
        taken: true,
      },
      {
        id: "ecu-preview-mail-4",
        fro: "MerchantAnn",
        to: "Preview",
        subject: "Stand restock",
        message: "Helmet +7 listed — undercut if you want the slot.",
        sent: new Date(now - 240_000_000).toISOString(),
        read: true,
        item: { name: "helmet", level: 7, q: 1 },
        canTake: true,
      },
      {
        id: "ecu-preview-mail-5",
        fro: "Brick",
        to: "Preview",
        subject: "Scrolls inbound",
        message: "cscroll0 x9 in the next drop.",
        sent: new Date(now - 320_000_000).toISOString(),
        read: true,
        item: { name: "cscroll0", q: 9 },
        canTake: true,
      },
      {
        id: "ecu-preview-mail-6",
        fro: "Ember",
        to: "Preview",
        subject: "Party invite reminder",
        message: "Same crypt pull after dinner.",
        sent: new Date(now - 400_000_000).toISOString(),
        read: true,
      },
      {
        id: "ecu-preview-mail-7",
        fro: "System",
        to: "Preview",
        subject: "Event reward",
        message: "Thanks for the weekend event.",
        sent: new Date(now - 500_000_000).toISOString(),
        read: true,
        system: true,
        item: { name: "gem1", q: 1 },
        taken: true,
      },
      {
        id: "ecu-preview-mail-8",
        fro: "Brick",
        to: "Preview",
        subject: "Leather bundle",
        message: "Another stack when bank opens.",
        sent: new Date(now - 600_000_000).toISOString(),
        read: true,
        item: { name: "leather", q: 80 },
        canTake: true,
      },
    ],
    nextCursor: null,
    hasMore: false,
    loading: false,
    status: "Synced just now",
    statusKind: "",
    lastHeadAt: now,
    lastHeadReason: "mail head",
    lastSeenUnread: 1,
  });
  if (window.X && typeof window.X === "object") {
    (window.X as { unread?: number }).unread = 1;
  }
}

function seedChat(): void {
  const party = ensurePartyConversation();
  selectHubChat(party.key);
  pushPartyChat("Brick", "Ready when you are — crab farm.");
  pushPartyChat("Ember", "Buffs up. Call pull.");
  pushLocalPartyChat("Preview", "omw");
  pushPartyChat("Brick", "Packing after this wave.");
  pushPartyChat("Ember", "Mp ok — keep pace.");
  pushLocalPartyChat("Preview", "heal");
  pushPartyChat("Brick", "a2 tagged, hold for Ember.");
  pushPartyChat("Ember", "pull");
  pushLocalPartyChat("Preview", "brb");
  pushPartyChat("Brick", "Back — loot then next.");
}

function seedMarket(): void {
  const now = Date.now();
  const merchants: CachedMarketMerchant[] = [
    {
      name: "MerchantAnn",
      level: 60,
      map: "main",
      x: 40,
      y: -20,
      server: "EU_I",
      stand: true,
      skin: "mmerchant",
      lastSeenAt: now,
      slots: [
        {
          slot: "trade1",
          name: "hpot1",
          q: 999,
          price: 120,
          buyOrder: false,
          rid: "ecu-preview-rid-hpot",
          lastRefreshedAt: now,
        },
        {
          slot: "trade2",
          name: "mpot1",
          q: 999,
          price: 140,
          buyOrder: false,
          rid: "ecu-preview-rid-mpot",
          lastRefreshedAt: now,
        },
        {
          slot: "trade3",
          name: "helmet",
          level: 7,
          q: 1,
          price: 850_000,
          buyOrder: false,
          rid: "ecu-preview-rid-helm",
          lastRefreshedAt: now,
        },
        {
          slot: "trade4",
          name: "shoes",
          level: 6,
          q: 1,
          price: 420_000,
          buyOrder: false,
          rid: "ecu-preview-rid-shoes",
          lastRefreshedAt: now,
        },
      ],
    },
    {
      name: "Preview",
      level: 80,
      map: "main",
      x: 0,
      y: 0,
      server: "EU_I",
      stand: true,
      skin: "fpriest",
      lastSeenAt: now,
      slots: [
        {
          slot: "trade1",
          name: "crabclaw",
          q: 8,
          price: 42_000,
          buyOrder: false,
          rid: "ecu-preview-rid-you-claw",
          lastRefreshedAt: now,
        },
        {
          slot: "trade2",
          name: "leather",
          q: 40,
          price: 2_500,
          buyOrder: false,
          rid: "ecu-preview-rid-you-leather",
          lastRefreshedAt: now,
        },
      ],
    },
    {
      name: "Ember",
      level: 72,
      map: "main",
      x: 80,
      y: 10,
      server: "EU_I",
      stand: true,
      skin: "fmage",
      lastSeenAt: now,
      slots: [
        {
          slot: "trade1",
          name: "scroll0",
          q: 50,
          price: 8_000,
          buyOrder: false,
          rid: "ecu-preview-rid-scroll",
          lastRefreshedAt: now,
        },
        {
          slot: "trade2",
          name: "wbook0",
          level: 2,
          q: 1,
          price: 55_000,
          buyOrder: true,
          rid: "ecu-preview-rid-wbook-buy",
          lastRefreshedAt: now,
        },
        {
          slot: "trade3",
          name: "gem0",
          q: 1,
          price: 120_000,
          buyOrder: false,
          rid: "ecu-preview-rid-gem",
          lastRefreshedAt: now,
        },
      ],
    },
  ];
  setCachedMarketMerchants(merchants);
}

function seedCommandDraft(): void {
  patchSettings({
    // Single home page — hide page-dot chrome for cleaner map-first shots.
    phoneHomeScreens: [{ id: "home", label: "Home", panels: [], meters: [] }],
    commandDraft:
      "// Preview — phone Command sheet\n" +
      "loot();\n" +
      "use_skill('town');\n" +
      "stop('move');\n" +
      "say('pull');\n",
    commandSnippets: [
      { id: "loot", name: "Loot", code: "loot()" },
      { id: "town", name: "Town", code: "use_skill('town')" },
      { id: "stop", name: "Stop move", code: "stop('move')" },
      { id: "say-hi", name: "Say hi", code: "say('hi')" },
      { id: "pull", name: "Call pull", code: "say('pull')" },
      { id: "heal", name: "Ask heal", code: "say('heal')" },
      { id: "omw", name: "OMW", code: "say('omw')" },
      { id: "use-mp", name: "Use MP pot", code: "use('mpot1')" },
      { id: "use-hp", name: "Use HP pot", code: "use('hpot1')" },
      { id: "stop-all", name: "Stop all", code: "stop()" },
    ],
  });
}

/** Call once after ECU host installs when running under /overlay. */
export function seedPhoneOverlayFixtures(): void {
  if (!(window as { __ecuOverlayPreview?: boolean }).__ecuOverlayPreview) {
    return;
  }
  try {
    if ((window as { user_id?: unknown }).user_id == null) {
      (window as { user_id?: string }).user_id = "ecu-overlay-preview";
    }
    if ((window as { user_auth?: unknown }).user_auth == null) {
      (window as { user_auth?: string }).user_auth = "ecu-overlay-preview";
    }
    seedObservingBag();
    seedBank();
    seedMail();
    seedChat();
    seedMarket();
    seedCommandDraft();
  } catch (err) {
    console.warn("[ecu] phone overlay fixtures failed", err);
  }
  (window as { __ecuReseedPhoneFixtures?: () => void }).__ecuReseedPhoneFixtures =
    seedPhoneOverlayFixtures;
}
