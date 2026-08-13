/**
 * Versioned What's New entries — newest first.
 * Bump by prepending an entry when shipping user-facing changes.
 * Users who already finished/skipped intro still see unseen entries.
 */

export type ChangelogItem = { label: string; detail: string };

export type ChangelogEntry = {
  /** Stable id — usually package version for that ship. */
  id: string;
  /** Short heading shown in the modal (e.g. "0.8.0-alpha.1"). */
  title: string;
  items: ChangelogItem[];
};

/**
 * Feature overview shared by first-run intro and the baseline changelog entry.
 */
export const FEATURE_OVERVIEW: ChangelogItem[] = [
  {
    label: "Movable panels",
    detail: "Drag, lock, snap, and save layouts (desktop / tablet / phone).",
  },
  {
    label: "Combat HUD",
    detail: "Player & target frames, party roster, boss bars, threat.",
  },
  {
    label: "Damage meters",
    detail: "DPS / HPS windows, Inspector, Time Line, and report views.",
  },
  {
    label: "Command snippets",
    detail: "Observer COMMAND panel with saved CODE presets.",
  },
];

/** Newest first. Prepend when releasing. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "0.8.0-alpha.1",
    title: "0.8.0-alpha.1",
    items: [
      {
        label: "Alpha meters",
        detail:
          "WoW-style meter shell: native bar scroll, Always-show-me pin, Time Line, and Details-like Inspector.",
      },
      {
        label: "Unified window groups",
        detail:
          "Edge-snap HUD + meters, flush group resize, and green join guides while arranging.",
      },
      {
        label: "Session segments",
        detail:
          "Clearer current / past fight binding for meters, bookmarks, and statusbar plugins.",
      },
    ],
  },
  {
    id: "0.7.1-windows",
    title: "Unified windows",
    items: [
      {
        label: "Lock any panel",
        detail:
          "HUD and meters share the same lock — unlock to drag; hold Alt to nudge while locked.",
      },
      {
        label: "Window Control",
        detail: "☰ menu on panels: lock, ungroup, close, and reopen closed windows.",
      },
    ],
  },
  {
    id: "0.7.0",
    title: "0.7",
    items: FEATURE_OVERVIEW,
  },
];

export function latestChangelogId(): string {
  return CHANGELOG[0] ? CHANGELOG[0].id : "";
}

/**
 * Entries newer than `seenId` (CHANGELOG is newest-first).
 * Unknown / missing seen → only the latest entry (avoid dumping full history).
 */
export function unseenChangelogEntries(
  seenId: string | null | undefined,
): ChangelogEntry[] {
  if (!CHANGELOG.length) return [];
  if (!seenId) return [CHANGELOG[0]];
  const idx = CHANGELOG.findIndex((entry) => entry.id === seenId);
  if (idx < 0) return [CHANGELOG[0]];
  if (idx === 0) return [];
  return CHANGELOG.slice(0, idx);
}

export function hasUnseenChangelog(seenId: string | null | undefined): boolean {
  return unseenChangelogEntries(seenId).length > 0;
}
