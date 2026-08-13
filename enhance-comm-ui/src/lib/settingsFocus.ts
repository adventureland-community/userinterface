/**
 * Party / kill focus helpers (domain logic kept out of the settings store).
 *
 * Meter "Party" scope is the *subject character's in-game party* (the character
 * you play or observe) — not the account character strip / "my characters".
 * Scope also lists each party currently in vision so you can pin any of them.
 */

export type PartyScope = "watched" | "visible" | "all";

/**
 * Who the combat meter focuses on:
 * - watched: subject's in-game party (play/observe target)
 * - visible: players currently in vision (entity snapshot)
 * - all: everyone credited in this combat segment (includes people who left vision)
 * - you: subject character only
 * - party key string: one specific party key
 */
export type PartyFocus = "watched" | "visible" | "all" | "you" | string;

/** Meter query inputs derived from a PartyFocus setting. */
export type ResolvedPartyFocus = {
  scope: PartyScope;
  partyFilter: string | null;
  /** History series key: watched party key, specific party, or null for all. */
  historyKey: string | null;
};

export type PartyFocusOption = { id: PartyFocus; label: string };

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
  if (focus === "you") {
    return { scope: "watched", partyFilter: null, historyKey: null };
  }
  if (focus === "watched") {
    const key = watchedPartyKey || null;
    return { scope: "watched", partyFilter: key, historyKey: key };
  }
  return { scope: "all", partyFilter: focus, historyKey: focus };
}

/**
 * No subject character: Party / Only cannot resolve — fall back to Visible
 * (who's on screen now), not Session.
 */
export function effectivePartyFocus(
  focus: PartyFocus,
  hasObserver: boolean,
): PartyFocus {
  if (!hasObserver && (focus === "watched" || focus === "you")) {
    return "visible";
  }
  return focus;
}

/**
 * Kill scope without a subject: prefer vision over session-wide.
 */
export function effectiveKillScope(
  scope: PartyScope,
  hasObserver: boolean,
): PartyScope {
  if (!hasObserver && scope === "watched") return "visible";
  return scope;
}

/**
 * Canonical wording for a focus choice (menu row / status chip).
 * `partyLabels` maps party keys → friendly labels when listing visible parties.
 */
export function partyFocusChoiceLabel(
  focus: PartyFocus,
  watchedName?: string,
  partyLabels?: Record<string, string>,
): string {
  if (focus === "watched") {
    return watchedName ? `Party · ${watchedName}` : "Party";
  }
  if (focus === "you") {
    return watchedName ? `Only · ${watchedName}` : "You only";
  }
  if (focus === "visible") return "Visible";
  if (focus === "all") return "Session";
  if (typeof focus === "string" && focus.indexOf("solo:") === 0) {
    return focus.slice(5);
  }
  if (partyLabels && partyLabels[focus]) return partyLabels[focus];
  return String(focus);
}

/**
 * Label for the focus actually applied to meter queries.
 */
export function partyFocusLabel(
  focus: PartyFocus,
  watchedName?: string,
  hasObserver = true,
  partyLabels?: Record<string, string>,
): string {
  const eff = effectivePartyFocus(focus, hasObserver);
  return partyFocusChoiceLabel(eff, watchedName, partyLabels);
}

export function namedPartyKey(focus: PartyFocus | undefined): string | null {
  if (!focus) return null;
  if (
    focus === "watched" ||
    focus === "you" ||
    focus === "visible" ||
    focus === "all"
  ) {
    return null;
  }
  return focus;
}

/**
 * Party menu rows for the current session.
 * Live roster: Visible + Session + each visible party.
 * Archived: Session + parties on that fight (no Visible).
 * With a subject: also Party / Only (subject's party key skipped in the list).
 */
export function partyFocusMenuOptions(ctx: {
  hasObserver: boolean;
  watchedName?: string;
  /** Subject's party key — skip duplicate in the visible-party list. */
  watchedPartyKey?: string;
  /** Parties to offer as specific picks (live vision, or parties in a stored fight). */
  visibleParties?: Array<{ id: string; label: string }>;
  roster: "live" | "archived";
}): PartyFocusOption[] {
  const name = ctx.watchedName;
  const out: PartyFocusOption[] = [];
  if (ctx.hasObserver) {
    out.push({
      id: "watched",
      label: partyFocusChoiceLabel("watched", name),
    });
    out.push({
      id: "you",
      label: partyFocusChoiceLabel("you", name),
    });
  }
  if (ctx.roster === "live") {
    out.push({ id: "visible", label: partyFocusChoiceLabel("visible") });
  }
  out.push({ id: "all", label: partyFocusChoiceLabel("all") });
  const parties = ctx.visibleParties || [];
  const skipKey = ctx.watchedPartyKey || "";
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    if (skipKey && p.id === skipKey) continue;
    out.push({ id: p.id, label: p.label });
  }
  return out;
}

export function killScopeLabel(
  scope: PartyScope,
  watchedName?: string,
): string {
  if (scope === "watched") {
    return watchedName ? `Party · ${watchedName}` : "Party";
  }
  if (scope === "visible") return "Visible";
  if (scope === "all") return "Session";
  const _exhaustive: never = scope;
  return _exhaustive;
}
