/**
 * Cross-realm live event presence for the server dropdown.
 *
 * Stock `/comm` only exposes `window.S` (events) for the *connected* realm.
 * `X.servers` has name + player count only. We poll earthiverse ALData
 * `GET /monsters/:types` (public, no key) and cache by region|identifier.
 *
 * Docs: https://github.com/earthiverse/ALData#get-monsterstypesserverregionserveridentifier
 * Base: https://aldata.earthiverse.ca
 */

import { esc } from "./types";

const ALDATA_BASE = "https://aldata.earthiverse.ca";

/** Special/event monsters that commonly appear as keys on `window.S`. */
const EVENT_MONSTER_TYPES = [
  "franky",
  "snowman",
  "icegolem",
  "grinch",
  "gooblob",
  "pinkgoo",
  "wabbit",
  "dragold",
  "tiger",
  "mrpumpkin",
  "mrgreen",
];

/** ALData rate-limits ~15 req/min; one batched GET every 45s is plenty. */
const POLL_MS = 45_000;

/** Match ALData entity window (`lastSeen` within 5 minutes). */
const LIVE_MAX_AGE_MS = 5 * 60 * 1000;

/** Cap badges so the dropdown stays scannable. */
const MAX_BADGES = 3;

export type ServerEventBadge = {
  type: string;
  live: boolean;
};

type AlDataMonsterRow = {
  type?: string;
  serverRegion?: string;
  serverIdentifier?: string;
  lastSeen?: string;
  estimatedRespawn?: string;
  hp?: number;
};

type EventsCache = {
  fetchedAt: number;
  /** `region|name` → unique live event types */
  byServer: Record<string, string[]>;
  failed: boolean;
};

let cache: EventsCache = {
  fetchedAt: 0,
  byServer: {},
  failed: false,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<void> | null = null;
let onUpdate: (() => void) | null = null;
let lastNotifyKey = "";

function serverKey(region: string, name: string): string {
  return String(region || "") + "|" + String(name || "");
}

function isLiveRow(row: AlDataMonsterRow, now: number): boolean {
  if (row.hp != null && Number.isFinite(Number(row.hp))) {
    if (!row.lastSeen) return true;
  }
  if (!row.lastSeen) return false;
  const t = Date.parse(row.lastSeen);
  if (!Number.isFinite(t)) return false;
  return now - t <= LIVE_MAX_AGE_MS;
}

function uniqueTypes(types: string[]): string[] {
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (!t || seen[t]) continue;
    seen[t] = true;
    out.push(t);
  }
  return out;
}

/** Live event keys from stock `window.S` for the connected realm only. */
function liveTypesFromLocalS(): string[] {
  const S = window.S;
  if (!S || typeof S !== "object") return [];
  const keys = Object.keys(S);
  const out: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === "schedule") continue;
    const entry = S[key];
    if (entry && entry.live) out.push(key);
  }
  return out;
}

function buildByServer(rows: AlDataMonsterRow[]): Record<string, string[]> {
  const now = Date.now();
  const acc: Record<string, string[]> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.type || !row.serverRegion || !row.serverIdentifier) continue;
    if (!isLiveRow(row, now)) continue;
    const key = serverKey(row.serverRegion, row.serverIdentifier);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row.type);
  }
  const keys = Object.keys(acc);
  for (let i = 0; i < keys.length; i++) {
    acc[keys[i]] = uniqueTypes(acc[keys[i]]);
  }
  return acc;
}

async function fetchAlDataEvents(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const url =
        ALDATA_BASE + "/monsters/" + encodeURIComponent(EVENT_MONSTER_TYPES.join(","));
      const res = await fetch(url);
      if (!res.ok) throw new Error("ALData HTTP " + res.status);
      const data = (await res.json()) as AlDataMonsterRow[];
      if (!Array.isArray(data)) throw new Error("ALData bad payload");
      cache = {
        fetchedAt: Date.now(),
        byServer: buildByServer(data),
        failed: false,
      };
    } catch (_err) {
      // Fail soft: keep prior cache if any; otherwise empty.
      cache = {
        fetchedAt: Date.now(),
        byServer: cache.byServer,
        failed: true,
      };
    } finally {
      inFlight = null;
      notifyIfChanged();
    }
  })();
  return inFlight;
}

function notifyIfChanged(): void {
  const key = eventsCacheFingerprint();
  if (key === lastNotifyKey) return;
  lastNotifyKey = key;
  if (onUpdate) onUpdate();
}

/**
 * Stable fingerprint for render-cache invalidation (includes local S live
 * keys so the current realm updates without waiting on ALData).
 */
export function eventsCacheFingerprint(): string {
  const parts: string[] = [];
  const keys = Object.keys(cache.byServer).sort();
  for (let i = 0; i < keys.length; i++) {
    parts.push(keys[i] + "=" + cache.byServer[keys[i]].join(","));
  }
  const region = window.server_region || "";
  const ident = window.server_identifier || "";
  if (region && ident) {
    parts.push("local:" + serverKey(region, ident) + "=" + liveTypesFromLocalS().join(","));
  }
  return parts.join("|");
}

/** Live event badges for one realm; merges ALData + local `S` when connected. */
export function getServerEventBadges(
  region: string,
  name: string,
): ServerEventBadge[] {
  const key = serverKey(region, name);
  let types = cache.byServer[key] ? cache.byServer[key].slice() : [];
  if (
    region &&
    name &&
    window.server_region === region &&
    window.server_identifier === name
  ) {
    types = uniqueTypes(types.concat(liveTypesFromLocalS()));
  }
  const badges: ServerEventBadge[] = [];
  for (let i = 0; i < types.length; i++) {
    badges.push({ type: types[i], live: true });
  }
  return badges;
}

export function eventsBadgesHtml(badges: ServerEventBadge[]): string {
  if (!badges.length) return "";
  const shown = badges.slice(0, MAX_BADGES);
  const extra = badges.length - shown.length;
  let html = "<span class='ecu-server-dd-option-events'>";
  for (let i = 0; i < shown.length; i++) {
    const b = shown[i];
    html +=
      "<span class='ecu-server-dd-event" +
      (b.live ? " is-live" : "") +
      "' title='" +
      esc(b.type + (b.live ? " live" : "")) +
      "'>" +
      esc(b.type) +
      "</span>";
  }
  if (extra > 0) {
    html +=
      "<span class='ecu-server-dd-event ecu-server-dd-event-more' title='" +
      esc(
        badges
          .slice(MAX_BADGES)
          .map((b) => b.type)
          .join(", "),
      ) +
      "'>+" +
      extra +
      "</span>";
  }
  html += "</span>";
  return html;
}

/** Sync event badge DOM on existing option rows (partial re-render path). */
export function syncServerEventBadges(): void {
  const servers = (window.X && window.X.servers) || [];
  const opts = document.querySelectorAll(".ecu-server-dd-option");
  for (let i = 0; i < opts.length && i < servers.length; i++) {
    const server = servers[i];
    const badges = getServerEventBadges(server.region, server.name);
    const html = eventsBadgesHtml(badges);
    const existing = opts[i].querySelector(".ecu-server-dd-option-events");
    if (!html) {
      if (existing) existing.remove();
      continue;
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const next = wrap.firstElementChild;
    if (!next) continue;
    if (existing) existing.replaceWith(next);
    else {
      const nameEl = opts[i].querySelector(".ecu-server-dd-option-name");
      if (nameEl && nameEl.parentElement === opts[i]) {
        // Insert after name: name | events | players
        const players = opts[i].querySelector(".ecu-server-dd-option-players");
        if (players) opts[i].insertBefore(next, players);
        else opts[i].append(next);
      } else {
        opts[i].append(next);
      }
    }
  }
}

/** Start background poll; `cb` runs when the cache fingerprint changes. */
export function ensureServerEventsPolling(cb?: () => void): void {
  if (cb) onUpdate = cb;
  if (pollTimer != null) return;
  void fetchAlDataEvents();
  pollTimer = setInterval(() => {
    void fetchAlDataEvents();
  }, POLL_MS);
}
