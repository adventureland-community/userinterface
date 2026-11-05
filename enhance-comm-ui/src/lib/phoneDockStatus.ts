/**
 * Live observe + realm labels for the phone Material dock.
 */

import {
  currentServerKey,
  formatServerKeyLabel,
} from "../host/commChrome/chromeActions";
import {
  averagePingMs,
  pingColor,
  pingSparkBars,
  readPingSamples,
  type PingSparkBar,
} from "../host/commChrome/pingHud";
import { isPlayerClass } from "./colors";

export type PhoneDockStatus = {
  observingName: string;
  /** True when watching a character (name present). */
  observing: boolean;
  /** Observed level as display string, or empty. */
  observingLevel: string;
  /** Observed class/ctype, or empty. */
  observingType: string;
  /** Observed character is dead. */
  observingRip: boolean;
  /** Human realm label (`EU I`), or empty when unknown. */
  serverLabel: string;
  /** Players on the connected realm, or null when unknown. */
  serverPlayers: number | null;
  /** Average RTT ms from stock `pings[]`, or null when no samples. */
  pingMs: number | null;
  /** CSS color for ping (matches desktop dropdown). */
  pingColor: string;
  /** Recent RTT spark bars (same as desktop server dropdown). */
  pingBars: PingSparkBar[];
  /** True when a game socket exists. */
  connected: boolean;
};

function readObservingExtras(name: string): {
  level: string;
  type: string;
  rip: boolean;
} {
  if (!name) return { level: "", type: "", rip: false };
  const chars = (window.X && window.X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (String(c.name || "") !== name) continue;
    return {
      level: c.level != null ? String(c.level) : "",
      type: c.type != null ? String(c.type) : "",
      rip: !!c.rip,
    };
  }
  const obs = window.observing as
    | { level?: number; ctype?: string; rip?: boolean }
    | null
    | undefined;
  if (!obs) return { level: "", type: "", rip: false };
  // Live observe snap: class is `ctype`. Do not use entity `type` (kind).
  const ctype =
    obs.ctype != null && isPlayerClass(obs.ctype) ? String(obs.ctype) : "";
  return {
    level: obs.level != null ? String(obs.level) : "",
    type: ctype,
    rip: !!obs.rip,
  };
}

function readCurrentServerPlayers(): number | null {
  const region = window.server_region;
  const ident = window.server_identifier;
  if (!region || !ident) return null;
  const servers = (window.X && window.X.servers) || [];
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (s.region === region && s.name === ident) {
      const n = Number(s.players);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

/** Snapshot of observe name + current server for dock buttons. */
export function readPhoneDockStatus(): PhoneDockStatus {
  const obs = typeof window !== "undefined" ? window.observing : null;
  const observingName =
    obs && obs.name != null && String(obs.name) !== ""
      ? String(obs.name)
      : "";
  const extras = readObservingExtras(observingName);
  const key = currentServerKey();
  let serverLabel = formatServerKeyLabel(key);
  if (!serverLabel && typeof window !== "undefined") {
    const region = window.server_region;
    const ident = window.server_identifier;
    if (region) {
      serverLabel = String(region) + (ident ? " " + String(ident) : "");
    }
  }
  const connected =
    typeof window !== "undefined" && !!(window as { socket?: unknown }).socket;
  const samples = typeof window !== "undefined" ? readPingSamples() : [];
  const avg = averagePingMs(samples);
  const pingMs = avg == null ? null : Math.round(avg);
  return {
    observingName,
    observing: observingName !== "",
    observingLevel: extras.level,
    observingType: extras.type,
    observingRip: extras.rip,
    serverLabel,
    serverPlayers: readCurrentServerPlayers(),
    pingMs,
    pingColor: pingMs == null ? "#8ab4c9" : pingColor(pingMs),
    pingBars: pingSparkBars(samples),
    connected,
  };
}

/** Truncate a dock label so two cells stay readable. */
export function shortPhoneDockLabel(text: string, max = 12): string {
  const s = String(text || "");
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

/** One-line dock meta under the Character title. */
export function formatPhoneCharDockMeta(status: PhoneDockStatus): string {
  if (!status.observing) return "Tap to watch";
  const parts: string[] = [];
  if (status.observingLevel) parts.push("Lv." + status.observingLevel);
  if (status.observingType) parts.push(status.observingType);
  if (status.observingRip) parts.push("RIP");
  return parts.length ? parts.join(" · ") : "Watching";
}

/** One-line dock meta under the Server title (players; ping rendered separately). */
export function formatPhoneServerDockPlayers(
  status: PhoneDockStatus,
): string {
  if (status.serverPlayers == null) return "";
  const n = status.serverPlayers;
  return String(n) + " player" + (n === 1 ? "" : "s");
}
