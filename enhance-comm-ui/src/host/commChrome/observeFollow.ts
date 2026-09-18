/**
 * Keep Comm observing across server hops: when the watched character's
 * roster `server` diverges from the observer realm, re-observe them.
 */

export type ObserveFollowChar = {
  name: string;
  online?: boolean;
  server?: string | null;
};

export type ObserveFollowInput = {
  /** Name we intend to keep watching across hops. */
  stickyName: string | null;
  /** Current observer realm key (`SR_EUI`, …). */
  currentServerKey: string;
  /** Roster row for stickyName, if any. */
  char: ObserveFollowChar | null;
  /** True while a follow reconnect is already in flight. */
  followInFlight: boolean;
};

export type ObserveFollowDecision =
  | { action: "none" }
  | { action: "follow"; name: string };

export type ObserveFollowState = {
  stickyName: string | null;
  followInFlight: boolean;
  /** wall-clock ms when followInFlight was set; 0 if idle */
  followStartedAt: number;
};

const FOLLOW_IN_FLIGHT_MS = 8000;

/** Fresh follow state (no sticky watch). */
export function createObserveFollowState(): ObserveFollowState {
  return { stickyName: null, followInFlight: false, followStartedAt: 0 };
}

/** Remember who we are watching; clears in-flight when the name arrives. */
export function noteObservingName(
  state: ObserveFollowState,
  name: string | null | undefined,
  now: number,
): ObserveFollowState {
  const n = name != null && name !== "" ? String(name) : null;
  if (!n) return state;
  const next: ObserveFollowState = {
    stickyName: n,
    followInFlight: state.followInFlight,
    followStartedAt: state.followStartedAt,
  };
  if (state.followInFlight && state.stickyName === n) {
    next.followInFlight = false;
    next.followStartedAt = 0;
  }
  return next;
}

/** User left observe mode — stop auto-following. */
export function noteClearedObserve(
  state: ObserveFollowState,
): ObserveFollowState {
  return createObserveFollowState();
}

/**
 * Decide whether Comm should reconnect to keep watching stickyName.
 * Pure — no window access.
 */
export function decideObserveFollow(
  input: ObserveFollowInput,
): ObserveFollowDecision {
  if (input.followInFlight) return { action: "none" };
  const name = input.stickyName ? String(input.stickyName) : "";
  if (!name) return { action: "none" };
  const key = input.currentServerKey ? String(input.currentServerKey) : "";
  if (!key) return { action: "none" };
  const char = input.char;
  if (!char || char.name !== name) return { action: "none" };
  if (!char.online) return { action: "none" };
  const charServer = char.server != null ? String(char.server) : "";
  if (!charServer) return { action: "none" };
  if (charServer === key) return { action: "none" };
  return { action: "follow", name };
}

export type ObserveFollowTickCtx = {
  now: number;
  observingName: string | null | undefined;
  currentServerKey: string;
  findChar: (name: string) => ObserveFollowChar | null;
};

/**
 * One tick: refresh sticky from live observing, expire in-flight, maybe follow.
 */
export function tickObserveFollow(
  state: ObserveFollowState,
  ctx: ObserveFollowTickCtx,
): { state: ObserveFollowState; followName: string | null } {
  let next = noteObservingName(state, ctx.observingName, ctx.now);
  if (
    next.followInFlight &&
    next.followStartedAt > 0 &&
    ctx.now - next.followStartedAt > FOLLOW_IN_FLIGHT_MS
  ) {
    next = {
      stickyName: next.stickyName,
      followInFlight: false,
      followStartedAt: 0,
    };
  }
  const sticky = next.stickyName;
  const decision = decideObserveFollow({
    stickyName: sticky,
    currentServerKey: ctx.currentServerKey,
    char: sticky ? ctx.findChar(sticky) : null,
    followInFlight: next.followInFlight,
  });
  if (decision.action === "none") {
    return { state: next, followName: null };
  }
  return {
    state: {
      stickyName: decision.name,
      followInFlight: true,
      followStartedAt: ctx.now,
    },
    followName: decision.name,
  };
}
