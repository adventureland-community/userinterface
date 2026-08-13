/**
 * Versioned What's New entries — newest first.
 * Bump by prepending an entry when shipping user-facing changes.
 * Users who already finished/skipped intro still see unseen entries.
 */

export type ChangelogItem = { label: string; detail: string };

export type ChangelogEntry = {
  /** Stable id — usually package version for that ship. */
  id: string;
  /** Short heading shown in the modal (e.g. "0.7"). */
  title: string;
  items: ChangelogItem[];
};

/**
 * Feature overview shared by first-run intro and the initial changelog entry.
 */
export const FEATURE_OVERVIEW: ChangelogItem[] = [
  {
    label: "Movable panels",
    detail: "Drag panels and save layouts.",
  },
  {
    label: "Player & target",
    detail: "HP, resources, and buffs for who you watch and their target.",
  },
  {
    label: "Party roster",
    detail: "Party chips with vitals and buffs.",
  },
  {
    label: "Character & server",
    detail: "Reworked chips, Follow / Bag / Command, richer server picker.",
  },
  {
    label: "Command snippets",
    detail: "Save and rerun CODE presets.",
  },
  {
    label: "Damage meters",
    detail: "Add windows for damage, healing, coop, and more.",
  },
  {
    label: "Boss bars",
    detail: "Large boss HP with click-to-target.",
  },
];

/** Newest first. Prepend when releasing. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "0.7.1-windows",
    title: "Unified windows",
    items: [
      {
        label: "Lock any panel",
        detail: "HUD and meters share the same lock — unlock to drag; hold Alt to nudge while locked.",
      },
      {
        label: "Cross-group snap",
        detail: "Edge-snap meters to HUD panels (and each other) in one group graph.",
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
