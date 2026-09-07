/**
 * Parse window.S for Server info chips.
 * Only event-shaped entries (live / event) are bosses/schedules.
 * blessed_* are patron blessing scalars, not events.
 */

import type { ServerInfoLike } from "../../host/globals";
import { formatDurationCompact, getTimeUntil } from "../../lib/format";

export type ServerEventChip = {
  id: string;
  live: boolean;
  until: string;
};

export type ServerBlessingChip = {
  by: string;
  minutes: number;
  remainLabel: string;
};

/** True when a status value looks like a live/upcoming event row. */
export function isServerEventEntry(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as { live?: unknown; event?: unknown };
  return row.live != null || row.event != null;
}

export function listServerEventChips(
  S: ServerInfoLike | null | undefined,
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
    const row = value as { live?: boolean; event?: string };
    out.push({
      id,
      live: !!row.live,
      until: row.event ? getTimeUntil(row.event) : "",
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
