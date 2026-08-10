/**
 * Party roster under-chip buff density modes.
 * Persisted as CommUiSettings.partyBuffMode.
 */
export type PartyBuffMode =
  | "all"
  | "auto"
  | "observed"
  | "compact"
  | "shared"
  | "off";

export const PARTY_BUFF_MODES: readonly PartyBuffMode[] = [
  "auto",
  "all",
  "observed",
  "compact",
  "shared",
  "off",
] as const;

/** Roster size above which `auto` hides non-observed under-chip buffs. */
export const PARTY_BUFF_AUTO_THRESHOLD = 8;

/** Under-chip icons shown in `compact` mode before +N. */
export const PARTY_BUFF_COMPACT_MAX = 2;

/** Default under-chip icons for `all` / `auto` / `observed`. */
export const PARTY_BUFF_DEFAULT_MAX = 4;

export function normalizePartyBuffMode(raw: unknown): PartyBuffMode {
  if (
    raw === "all" ||
    raw === "auto" ||
    raw === "observed" ||
    raw === "compact" ||
    raw === "shared" ||
    raw === "off"
  ) {
    return raw;
  }
  return "auto";
}

export function partyBuffModeLabel(mode: PartyBuffMode): string {
  switch (mode) {
    case "all":
      return "All";
    case "auto":
      return "Auto";
    case "observed":
      return "Obs";
    case "compact":
      return "Compact";
    case "shared":
      return "Shared";
    case "off":
      return "Off";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function partyBuffModeTitle(mode: PartyBuffMode): string {
  switch (mode) {
    case "all":
      return "Party buffs: under every chip";
    case "auto":
      return `Party buffs: all when ≤${PARTY_BUFF_AUTO_THRESHOLD} chips; observed-only when larger`;
    case "observed":
      return "Party buffs: observed chip only";
    case "compact":
      return `Party buffs: max ${PARTY_BUFF_COMPACT_MAX} icons + overflow per chip`;
    case "shared":
      return "Party buffs: one shared strip per party (unique buffs)";
    case "off":
      return "Party buffs: hidden";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function nextPartyBuffMode(mode: PartyBuffMode): PartyBuffMode {
  const idx = PARTY_BUFF_MODES.indexOf(mode);
  const next = idx < 0 ? 0 : (idx + 1) % PARTY_BUFF_MODES.length;
  return PARTY_BUFF_MODES[next];
}

/**
 * Whether to render under-chip EffectsRow for this chip.
 * `shared` never uses under-chip rows (strip is separate).
 */
export function showUnderChipBuffs(
  mode: PartyBuffMode,
  visibleChipCount: number,
  isObserved: boolean,
  threshold: number = PARTY_BUFF_AUTO_THRESHOLD,
): boolean {
  switch (mode) {
    case "all":
    case "compact":
      return true;
    case "off":
    case "shared":
      return false;
    case "observed":
      return isObserved;
    case "auto":
      if (visibleChipCount <= threshold) return true;
      return isObserved;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** maxVisible for under-chip EffectsRow; 0 = unlimited (not used for party chips). */
export function underChipBuffMaxVisible(mode: PartyBuffMode): number {
  switch (mode) {
    case "compact":
      return PARTY_BUFF_COMPACT_MAX;
    case "all":
    case "auto":
    case "observed":
      return PARTY_BUFF_DEFAULT_MAX;
    case "shared":
    case "off":
      return 0;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
