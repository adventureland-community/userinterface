/**
 * Compact list-column date via the user's locale for day/month order,
 * always 24h clock for today (dense column; avoids AM/PM width jitter).
 * - same calendar day → 23:51
 * - same year → 16/08 or 08/16
 * - older → 16/08/25 …
 */
import { formatRelativeAge } from "../../../lib/format";

export function formatMailDate(sent: string, now = Date.now()): string {
  const t = Date.parse(sent);
  if (!Number.isFinite(t)) return String(sent || "");
  const d = new Date(t);
  const n = new Date(now);
  try {
    if (
      d.getFullYear() === n.getFullYear() &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate()
    ) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    if (d.getFullYear() === n.getFullYear()) {
      return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return String(sent);
  }
}

/** Full local datetime for tooltips. */
export function formatMailDateTime(sent: string): string {
  const t = Date.parse(sent);
  if (!Number.isFinite(t)) return String(sent || "");
  try {
    return new Date(t).toLocaleString();
  } catch {
    return String(sent);
  }
}

export function formatMailRelative(sent: string, now = Date.now()): string {
  const t = Date.parse(sent);
  if (!Number.isFinite(t)) return String(sent || "");
  return formatRelativeAge(t, now);
}

export function selfCharacterNames(): string[] {
  const out: string[] = [];
  const chars = (window.X && window.X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    const n = chars[i] && chars[i].name;
    if (n) out.push(String(n));
  }
  return out;
}

export function visiblePlayerNames(): string[] {
  const out: string[] = [];
  const raw = window.entities;
  if (!raw) return out;
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  for (let i = 0; i < list.length; i++) {
    const ent = list[i] as {
      name?: string;
      player?: boolean;
      type?: string;
      npc?: boolean;
    };
    if (!ent || !ent.name) continue;
    if (ent.npc) continue;
    if (ent.player || ent.type === "character") out.push(String(ent.name));
  }
  return out;
}
