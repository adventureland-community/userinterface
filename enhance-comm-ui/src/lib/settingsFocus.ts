/**
 * Party / kill focus helpers (domain logic kept out of the settings store).
 */

export type PartyScope = "watched" | "visible" | "all";

/**
 * Who the combat meter focuses on:
 * - watched: observed character's party
 * - visible: players currently in the comm entity snapshot (vision)
 * - all: every player credited in the combat session
 * - party key string: one specific party key
 */
export type PartyFocus = "watched" | "visible" | "all" | string;

/** Meter query inputs derived from a PartyFocus setting. */
export type ResolvedPartyFocus = {
  scope: PartyScope;
  partyFilter: string | null;
  /** History series key: watched party key, specific party, or null for all. */
  historyKey: string | null;
};

/**
 * Map persisted partyFocus into meter scope/filter/history keys.
 */
export function resolvePartyFocus(
  focus: PartyFocus,
  watchedPartyKey: string,
): ResolvedPartyFocus {
  if (focus === "all") {
    return { scope: "all", partyFilter: null, historyKey: null };
  }
  if (focus === "visible") {
    return { scope: "visible", partyFilter: null, historyKey: null };
  }
  if (focus === "watched") {
    const key = watchedPartyKey || null;
    return { scope: "watched", partyFilter: key, historyKey: key };
  }
  return { scope: "all", partyFilter: focus, historyKey: focus };
}

/**
 * Spectator mode has no watched party — treat the default "watched" focus as
 * visible parties without overwriting a persisted preference.
 */
export function effectivePartyFocus(
  focus: PartyFocus,
  hasObserver: boolean,
): PartyFocus {
  if (!hasObserver && focus === "watched") return "visible";
  return focus;
}

/**
 * Kill scope "all" already tracks visible players; mirror the combat spectator
 * default without persisting unless the user picks a scope explicitly.
 */
export function effectiveKillScope(
  scope: PartyScope,
  hasObserver: boolean,
): PartyScope {
  if (!hasObserver && scope === "watched") return "all";
  return scope;
}

export function partyFocusLabel(focus: PartyFocus, watchedName?: string): string {
  if (focus === "watched") {
    return watchedName ? `Watched · ${watchedName}` : "Watched party";
  }
  if (focus === "visible") return "Visible parties";
  if (focus === "all") return "All parties";
  if (focus.indexOf("solo:") === 0) return focus.slice(5);
  return focus;
}

export function killScopeLabel(scope: PartyScope, watchedName?: string): string {
  if (scope === "watched") {
    return watchedName ? `Watched · ${watchedName}` : "Watched party";
  }
  if (scope === "visible" || scope === "all") return "Visible parties";
  const _exhaustive: never = scope;
  return _exhaustive;
}
