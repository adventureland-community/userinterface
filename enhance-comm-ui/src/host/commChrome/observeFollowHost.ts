/**
 * Host wiring for observe-follow: sticky watch + tick → observeCharacter.
 */

import { showCommToast } from "../commToast";
import {
  createObserveFollowState,
  noteClearedObserve,
  tickObserveFollow,
  type ObserveFollowChar,
  type ObserveFollowState,
} from "./observeFollow";

let state: ObserveFollowState = createObserveFollowState();

/** Test/reset helper. */
export function resetObserveFollowHost(): void {
  state = createObserveFollowState();
}

/** User left observe — stop auto-following across servers. */
export function clearObserveFollowSticky(): void {
  state = noteClearedObserve(state);
}

function findRosterChar(name: string): ObserveFollowChar | null {
  const chars = (window.X && window.X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].name === name) {
      const c = chars[i];
      return {
        name: String(c.name),
        online: !!c.online,
        server: c.server != null ? String(c.server) : null,
      };
    }
  }
  return null;
}

function serverLabel(serverKey: string): string {
  const key = String(serverKey || "");
  if (!key) return "";
  if (typeof window.server_to_ui === "function") {
    const ui = window.server_to_ui(key);
    if (ui) return String(ui);
  }
  const servers = (window.X && window.X.servers) || [];
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (s.key != null && String(s.key) === key) {
      return String(s.region) + " " + String(s.name);
    }
  }
  return key;
}

export type ObserveFollowDeps = {
  currentServerKey: () => string;
  observeCharacter: (name: string) => boolean;
};

/**
 * Call from the Comm chrome tick. Re-observes when the sticky character
 * has hopped to another realm (X.characters.server ≠ current realm).
 */
export function syncObserveFollow(
  now: number,
  deps: ObserveFollowDeps,
): void {
  const observing = window.observing;
  const observingName =
    observing && observing.name != null ? String(observing.name) : null;
  const result = tickObserveFollow(state, {
    now,
    observingName,
    currentServerKey: deps.currentServerKey(),
    findChar: findRosterChar,
  });
  state = result.state;
  if (!result.followName) return;
  const ok = deps.observeCharacter(result.followName);
  if (ok) {
    const dest = findRosterChar(result.followName);
    const where = dest && dest.server ? serverLabel(dest.server) : "";
    showCommToast(
      where
        ? `Following ${result.followName} to ${where}…`
        : `Following ${result.followName} to their server…`,
    );
  } else {
    // Allow a later tick to retry.
    state = {
      stickyName: state.stickyName,
      followInFlight: false,
      followStartedAt: 0,
    };
  }
}
