/**
 * Observer-orchestrated travel for Market (change_server then smart_move).
 * Overlay owns the itinerary — never pack hop+move in one CODE script.
 */

import {
  emitObserverCommand,
  getObserving,
  getServerIdentifier,
  getServerRegion,
} from "../al";
import { showCommToast } from "../commToast";

export type MarketTravelPhase = "idle" | "server" | "move" | "done" | "cancel";

export type MarketTravelItinerary = {
  name: string;
  region?: string;
  identifier?: string;
  map: string;
  x: number;
  y: number;
  phase: MarketTravelPhase;
  startedAt: number;
};

let pending: MarketTravelItinerary | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

type Listener = (it: MarketTravelItinerary | null) => void;
const listeners: Listener[] = [];

function notify(): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](pending);
  }
}

export function subscribeMarketTravel(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getMarketTravel(): MarketTravelItinerary | null {
  return pending;
}

export function cancelMarketTravel(reason?: string): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (pending) {
    pending = { ...pending, phase: "cancel" };
    notify();
    if (reason) showCommToast(reason);
  }
  pending = null;
  notify();
}

function currentServerKey(): string {
  const r = String(getServerRegion() || "");
  const i = String(getServerIdentifier() || "");
  return r && i ? r + i : r || i;
}

function targetServerKey(it: MarketTravelItinerary): string {
  const r = String(it.region || "");
  const i = String(it.identifier || "");
  if (r && i) return r + i;
  return "";
}

function emitMove(it: MarketTravelItinerary): boolean {
  const code = `smart_move({ map: ${JSON.stringify(it.map)}, x: ${it.x}, y: ${it.y} })`;
  return emitObserverCommand(code, "market-travel");
}

function emitServerHop(it: MarketTravelItinerary): boolean {
  if (!it.region || !it.identifier) return false;
  const code = `change_server(${JSON.stringify(it.region)}, ${JSON.stringify(it.identifier)})`;
  return emitObserverCommand(code, "market-travel-server");
}

function parseCatalogServer(
  server?: string | null,
): { region?: string; identifier?: string } {
  const raw = String(server || "");
  // SR_EUI / SR_USIII / EU I style — best-effort
  const m = /^SR_([A-Z]+)([IVX0-9]+)$/i.exec(raw.replace(/\s+/g, ""));
  if (m) return { region: m[1].toUpperCase(), identifier: m[2].toUpperCase() };
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { region: parts[0], identifier: parts.slice(1).join("") };
  }
  return {};
}

export function startMarketTravel(opts: {
  name: string;
  map: string;
  x: number;
  y: number;
  server?: string | null;
  region?: string;
  identifier?: string;
}): boolean {
  if (!getObserving()) {
    showCommToast("Observe a character first");
    return false;
  }
  if (!opts.map || !Number.isFinite(opts.x) || !Number.isFinite(opts.y)) {
    showCommToast("Missing travel destination");
    return false;
  }
  cancelMarketTravel();
  const parsed = parseCatalogServer(opts.server);
  const it: MarketTravelItinerary = {
    name: opts.name,
    map: opts.map,
    x: opts.x,
    y: opts.y,
    region: opts.region || parsed.region,
    identifier: opts.identifier || parsed.identifier,
    phase: "idle",
    startedAt: Date.now(),
  };
  const want = targetServerKey(it);
  const here = currentServerKey();
  if (want && here && want !== here) {
    it.phase = "server";
    pending = it;
    notify();
    if (!emitServerHop(it)) {
      cancelMarketTravel("No socket — cannot change server");
      return false;
    }
    showCommToast(`Travel: hopping to ${want}…`);
    pollTimer = setInterval(() => {
      tickMarketTravel();
    }, 500);
    return true;
  }
  it.phase = "move";
  pending = it;
  notify();
  if (!emitMove(it)) {
    cancelMarketTravel("No socket — cannot smart_move");
    return false;
  }
  showCommToast(`Travel: moving to ${it.name}…`);
  pollTimer = setInterval(() => {
    tickMarketTravel();
  }, 800);
  return true;
}

/** Advance pending travel after server hop or clear when timed out. */
export function tickMarketTravel(): void {
  if (!pending) return;
  const it = pending;
  const age = Date.now() - it.startedAt;
  if (age > 120000) {
    cancelMarketTravel("Travel timed out");
    return;
  }
  if (it.phase === "server") {
    const want = targetServerKey(it);
    const here = currentServerKey();
    if (want && here && (here === want || here.indexOf(want) >= 0)) {
      it.phase = "move";
      pending = { ...it };
      notify();
      if (!emitMove(it)) {
        cancelMarketTravel("No socket — cannot smart_move");
        return;
      }
      showCommToast(`Travel: moving to ${it.name}…`);
    }
    return;
  }
  if (it.phase === "move" && age > 45000) {
    // soft complete — CODE may still be pathing
    pending = { ...it, phase: "done" };
    notify();
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    pending = null;
    notify();
  }
}
