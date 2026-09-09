/**
 * Parse window.S for Server info chips.
 *
 * Shapes (adventureland_mongodb main):
 * - Boss / joinable: `{ live, spawn?, event?, map?, x?, y?, end? }`
 * - Joinable map events without `live`: `{ end }` (goobrawl) or
 *   `{ end, signup_end, A, B, id }` (abtesting)
 * - Classic seasonals: `S.halloween === true`
 * - Anniversary season: `{ active, live, next, target?, map?, x?, y?, expires? }`
 *   from `node/logic/anniversary_event.js` → `E.anniversary`
 * - Patron bless: `blessed_minutes` / `blessed_by` scalars
 */

import { getG } from "../../host/al";
import type { GLike, ServerInfoLike } from "../../host/globals";
import { formatDurationCompact, getTimeUntil } from "../../lib/format";

export type ServerEventChip = {
  id: string;
  label: string;
  live: boolean;
  detail: string;
  title: string;
};

export type ServerSeasonChip = {
  id: string;
  label: string;
  detail: string;
  title: string;
  live: boolean;
  accent?: string;
  sprite?: string;
  modal?: string;
  docsUrl: string;
};

export type ServerBlessingChip = {
  by: string;
  minutes: number;
  remainLabel: string;
};

type EventDef = {
  name?: string;
  type?: string;
  modal?: string;
  sprite?: string;
  duration?: number;
  announcement?: {
    title?: string;
    text?: string;
    color?: string;
    accent?: string;
  };
};

type MonsterDef = { name?: string };

type SeasonStatus = {
  active?: boolean;
  live?: boolean;
  next?: number;
  expires?: number;
  target?: string;
  id?: string | number;
  map?: string;
  x?: number;
  y?: number;
  round?: number;
};

function eventsTable(G?: GLike | null): Record<string, EventDef> {
  const src = G || getG();
  return (src?.events || {}) as Record<string, EventDef>;
}

function monstersTable(G?: GLike | null): Record<string, MonsterDef> {
  const src = G || getG();
  return (src?.monsters || {}) as Record<string, MonsterDef>;
}

function mapDisplayName(mapKey: string | undefined, G?: GLike | null): string {
  if (!mapKey) return "";
  const named = (G || getG())?.maps?.[mapKey]?.name;
  if (typeof named === "string" && named) return named;
  return mapKey;
}

/** Remaining time until an absolute ms timestamp. */
export function formatUntilMs(
  at: number | null | undefined,
  now: number = Date.now(),
): string {
  if (typeof at !== "number" || !Number.isFinite(at)) return "";
  const sec = (at - now) / 1000;
  if (!(sec > 0)) return "";
  return formatDurationCompact(sec);
}

export function formatClockMs(at: number | null | undefined): string {
  if (typeof at !== "number" || !Number.isFinite(at)) return "";
  try {
    return new Date(at).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Remaining time from an absolute `end` (ms or ISO string). */
export function formatEndRemaining(
  end: unknown,
  now: number = Date.now(),
): string {
  if (typeof end === "number" && Number.isFinite(end)) {
    return formatUntilMs(end, now);
  }
  if (end instanceof Date) return formatUntilMs(end.getTime(), now);
  if (typeof end === "string" && end) return getTimeUntil(end);
  return "";
}

/** True when a status value looks like a live/upcoming boss/joinable row. */
export function isServerEventEntry(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as {
    live?: unknown;
    event?: unknown;
    spawn?: unknown;
    end?: unknown;
  };
  return (
    row.live != null ||
    row.event != null ||
    row.spawn != null ||
    row.end != null
  );
}

/**
 * Seasonal status: classic `true`, or anniversary-style
 * `{ active, live, next, … }` from the anniversary tick.
 */
export function isSeasonStatusEntry(
  value: unknown,
  def: EventDef | undefined,
): boolean {
  if (!def || def.type !== "seasonal") return false;
  if (value === true) return true;
  if (!value || typeof value !== "object") return false;
  const row = value as SeasonStatus;
  return row.active != null || row.next != null;
}

function untilFromRow(row: {
  event?: unknown;
  spawn?: unknown;
}): string {
  if (typeof row.event === "string" && row.event) {
    return getTimeUntil(row.event);
  }
  if (row.spawn != null) {
    if (typeof row.spawn === "number" && Number.isFinite(row.spawn)) {
      return formatUntilMs(row.spawn);
    }
    const raw =
      row.spawn instanceof Date
        ? row.spawn.toISOString()
        : typeof row.spawn === "string"
          ? row.spawn
          : "";
    if (raw) return getTimeUntil(raw);
  }
  return "";
}

function eventLabel(id: string, G?: GLike | null): string {
  const ev = eventsTable(G)[id];
  if (ev?.name) return ev.name;
  const mon = monstersTable(G)[id];
  if (mon?.name) return mon.name;
  return id;
}

export function listServerEventChips(
  S: ServerInfoLike | null | undefined,
  G?: GLike | null,
  now: number = Date.now(),
): ServerEventChip[] {
  if (!S) return [];
  const events = eventsTable(G);
  const out: ServerEventChip[] = [];
  const keys = Object.keys(S);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if (id === "schedule") continue;
    if (id === "blessed_minutes" || id === "blessed_by") continue;
    const value = S[id];
    if (isSeasonStatusEntry(value, events[id])) continue;
    if (!isServerEventEntry(value)) continue;
    const row = value as {
      live?: boolean;
      event?: string;
      spawn?: unknown;
      end?: unknown;
      map?: string;
      A?: number;
      B?: number;
    };
    const until = untilFromRow(row);
    const endLeft = formatEndRemaining(row.end, now);
    // Stock goobrawl/abtesting are `{ end }` (no `.live`). Treat as live while
    // `end` is still in the future; drop expired leftovers.
    const joinableLive = row.live !== true && row.end != null && !!endLeft;
    if (
      row.live !== true &&
      row.event == null &&
      row.spawn == null &&
      !joinableLive
    ) {
      continue;
    }
    const live = row.live === true || joinableLive;
    const label = eventLabel(id, G);
    let detail = "";
    if (live) {
      if (row.A != null || row.B != null) {
        detail =
          "live · A " +
          (row.A || 0) +
          " / B " +
          (row.B || 0) +
          (endLeft ? " · " + endLeft + " left" : "");
      } else if (row.map) {
        detail = "live · " + row.map;
      } else if (endLeft) {
        detail = "live · " + endLeft + " left";
      } else {
        detail = "live";
      }
    } else {
      detail = until ? "in " + until : endLeft ? "in " + endLeft : "upcoming";
    }
    out.push({
      id,
      label,
      live,
      detail,
      title: live
        ? label +
          " is live" +
          (row.map ? " on " + row.map : "") +
          (endLeft ? " (" + endLeft + " left)" : "")
        : until || endLeft
          ? label + " in " + (until || endLeft)
          : label + " upcoming",
    });
  }
  return out;
}

function seasonChipFromStatus(
  id: string,
  def: EventDef,
  value: true | SeasonStatus,
  G?: GLike | null,
  now: number = Date.now(),
): ServerSeasonChip {
  const announce = def.announcement;
  const label = announce?.title || def.name || id;
  const accent = announce?.color || announce?.accent || "#F0B742";
  const base: ServerSeasonChip = {
    id,
    label,
    detail: announce?.text || "active",
    title: [def.name || label, announce?.text].filter(Boolean).join(" — "),
    live: false,
    accent,
    sprite: def.sprite,
    modal: def.modal,
    docsUrl: `/docs/ref/event-${id}`,
  };

  if (value === true) return base;

  if (value.active === false) {
    return {
      ...base,
      detail: "ended",
      title: `${def.name || label} has ended — cakes and gifts still open`,
    };
  }

  if (value.live && (value.target || value.id != null)) {
    const who = value.target || String(value.id);
    const mapLabel = mapDisplayName(value.map, G);
    const left = formatUntilMs(value.expires, now);
    const where =
      mapLabel && value.x != null && value.y != null
        ? `${mapLabel} (${value.x}, ${value.y})`
        : mapLabel;
    return {
      ...base,
      live: true,
      detail: left ? `live · ${who} · ${left} left` : `live · ${who}`,
      title: [
        `Find ${who}`,
        where,
        left ? `${left} left in this round` : "",
        announce?.text || "Kiss the featured player for cake + gift",
      ]
        .filter(Boolean)
        .join(" — "),
    };
  }

  const untilNext = formatUntilMs(value.next, now);
  const clock = formatClockMs(value.next);
  if (untilNext || clock) {
    return {
      ...base,
      detail: untilNext ? `next in ${untilNext}` : "waiting",
      title: [
        def.name || label,
        untilNext ? `Next featured player in ${untilNext}` : "Waiting for a player",
        clock ? `at ${clock}` : "",
        "Every 30 minutes someone is featured; online players get an Anniversary Visit",
        announce?.text || "",
      ]
        .filter(Boolean)
        .join(" — "),
    };
  }

  return {
    ...base,
    detail: announce?.text || "waiting for a player",
    title: [
      def.name || label,
      "Waiting for a player",
      announce?.text || "",
    ]
      .filter(Boolean)
      .join(" — "),
  };
}

/**
 * Seasonal chips from `S` + `G.events` (boolean or anniversary status object).
 */
export function listServerSeasonChips(
  S: ServerInfoLike | null | undefined,
  G?: GLike | null,
  now: number = Date.now(),
): ServerSeasonChip[] {
  if (!S) return [];
  const events = eventsTable(G);
  const out: ServerSeasonChip[] = [];
  const keys = Object.keys(S);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if (id === "schedule") continue;
    if (id === "blessed_minutes" || id === "blessed_by") continue;
    const value = S[id];
    const def = events[id];
    if (!isSeasonStatusEntry(value, def)) continue;
    out.push(
      seasonChipFromStatus(
        id,
        def!,
        value === true ? true : (value as SeasonStatus),
        G,
        now,
      ),
    );
  }
  return out;
}

export function readServerBlessing(
  S: ServerInfoLike | null | undefined,
): ServerBlessingChip | null {
  if (!S) return null;
  const minutesRaw = S.blessed_minutes;
  const minutes =
    typeof minutesRaw === "number"
      ? minutesRaw
      : typeof minutesRaw === "string"
        ? Number(minutesRaw)
        : NaN;
  if (!(minutes > 0)) return null;
  const byRaw = S.blessed_by;
  const by =
    typeof byRaw === "string" && byRaw.trim() ? byRaw.trim() : "unknown";
  return {
    by,
    minutes: Math.floor(minutes),
    remainLabel: formatDurationCompact(minutes * 60) || `${Math.floor(minutes)}m`,
  };
}
