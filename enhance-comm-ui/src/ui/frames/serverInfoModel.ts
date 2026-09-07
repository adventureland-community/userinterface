/**
 * Parse window.S for Server info chips.
 * - Event objects (live / event / spawn) → boss & schedule rows
 * - Truthy seasonal G.events flags → named season chips (anniversary, …)
 * - blessed_* scalars → patron blessing (separate helper)
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

function eventsTable(G?: GLike | null): Record<string, EventDef> {
  const src = G || getG();
  return (src?.events || {}) as Record<string, EventDef>;
}

function monstersTable(G?: GLike | null): Record<string, MonsterDef> {
  const src = G || getG();
  return (src?.monsters || {}) as Record<string, MonsterDef>;
}

/** True when a status value looks like a live/upcoming event row. */
export function isServerEventEntry(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as { live?: unknown; event?: unknown; spawn?: unknown };
  return row.live != null || row.event != null || row.spawn != null;
}

function untilFromRow(row: {
  event?: unknown;
  spawn?: unknown;
}): string {
  if (typeof row.event === "string" && row.event) {
    return getTimeUntil(row.event);
  }
  if (row.spawn != null) {
    const raw =
      row.spawn instanceof Date
        ? row.spawn.toISOString()
        : typeof row.spawn === "string" || typeof row.spawn === "number"
          ? String(row.spawn)
          : "";
    if (raw) return getTimeUntil(raw);
  }
  return "";
}

function eventLabel(
  id: string,
  G?: GLike | null,
): string {
  const ev = eventsTable(G)[id];
  if (ev?.name) return ev.name;
  const mon = monstersTable(G)[id];
  if (mon?.name) return mon.name;
  return id;
}

export function listServerEventChips(
  S: ServerInfoLike | null | undefined,
  G?: GLike | null,
): ServerEventChip[] {
  if (!S) return [];
  const out: ServerEventChip[] = [];
  const keys = Object.keys(S);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if (id === "schedule") continue;
    if (id === "blessed_minutes" || id === "blessed_by") continue;
    const value = S[id];
    if (!isServerEventEntry(value)) continue;
    const row = value as {
      live?: boolean;
      event?: string;
      spawn?: unknown;
      map?: string;
    };
    const live = !!row.live;
    const until = untilFromRow(row);
    const label = eventLabel(id, G);
    let detail = "";
    if (live) {
      detail = row.map ? `live · ${row.map}` : "live";
    } else {
      detail = until ? `in ${until}` : "upcoming";
    }
    out.push({
      id,
      label,
      live,
      detail,
      title: live
        ? `${label} is live` + (row.map ? ` on ${row.map}` : "")
        : until
          ? `${label} in ${until}`
          : `${label} upcoming`,
    });
  }
  return out;
}

/**
 * Seasonal flags are usually `S.anniversary === true` (not event objects).
 * Pull name / blurb / accent from G.events.
 */
export function listServerSeasonChips(
  S: ServerInfoLike | null | undefined,
  G?: GLike | null,
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
    // Already covered as live/spawn rows.
    if (isServerEventEntry(value)) continue;
    if (!value) continue;
    const def = events[id];
    if (!def || def.type !== "seasonal") continue;
    const announce = def.announcement;
    const label = announce?.title || def.name || id;
    const detail = announce?.text || "active";
    const titleParts = [
      def.name || label,
      announce?.text,
      def.duration
        ? `typical window ~${formatDurationCompact(def.duration)}`
        : "",
    ].filter(Boolean);
    out.push({
      id,
      label,
      detail,
      title: titleParts.join(" — "),
      accent: announce?.color || announce?.accent,
      sprite: def.sprite,
      modal: def.modal,
      docsUrl: `/docs/ref/${id}`,
    });
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
