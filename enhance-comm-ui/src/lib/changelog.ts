/**
 * Versioned What's New entries — newest first.
 * Bump by prepending an entry when shipping user-facing changes.
 * Users who already finished/skipped intro still see unseen entries.
 */

export type ChangelogKind = "feature" | "fix" | "improve" | "ui";

export type ChangelogItem = {
  label: string;
  detail: string;
  /** Optional nuance for badges / grouping */
  kind?: ChangelogKind;
  /** Pin a few items at top of a release as "highlights" */
  highlight?: boolean;
};

export type ChangelogEntry = {
  /** Stable id — usually package version for that ship. */
  id: string;
  /** Short heading shown in the modal (e.g. "0.8.0-alpha.1"). */
  title: string;
  /** One-line release blurb under the version title */
  summary: string;
  /** Display date, e.g. "2026-08" */
  date: string;
  items: ChangelogItem[];
};

/**
 * Feature overview shared by first-run intro and the baseline changelog entry.
 */
export const FEATURE_OVERVIEW: ChangelogItem[] = [
  {
    label: "Movable panels",
    detail:
      "Drag, lock, snap, and save layouts for desktop, tablet, and phone.",
    kind: "feature",
  },
  {
    label: "Combat HUD",
    detail: "Player and target frames, party roster, boss bars, and threat.",
    kind: "feature",
  },
  {
    label: "Damage meters",
    detail: "DPS and HPS windows, Inspector, Time Line, and report views.",
    kind: "feature",
  },
  {
    label: "Command snippets",
    detail: "Observer COMMAND panel with saved CODE presets.",
    kind: "feature",
  },
];

/** Newest first. Prepend when releasing. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "0.8.0-alpha.2",
    title: "0.8.0-alpha.2",
    date: "2026-08",
    summary:
      "Browse Changelog anytime, clearer arrange outlines, and Coop share numbers that match the game again.",
    items: [
      {
        label: "Changelog browser",
        detail:
          "Open Changelog anytime from the bottom bar. Browse versions one at a time — the window stays on screen.",
        kind: "ui",
        highlight: true,
      },
      {
        label: "Arrange outline",
        detail:
          "When unlocked, the blue outline wraps the whole window (including Command buttons and Kills).",
        kind: "fix",
        highlight: true,
      },
      {
        label: "Coop contribution %",
        detail:
          "Coop V2 contribution % matches the game again; Coop V1 is still the simple share.",
        kind: "fix",
        highlight: true,
      },
      {
        label: "Empty damage meters",
        detail:
          "Empty damage meters stay on screen while unlocked. Lock them and they hide until they have data.",
        kind: "improve",
      },
      {
        label: "Window names while arranging",
        detail:
          "Hold Alt or unlock a window and its name appears — the same labels as in Layout.",
        kind: "ui",
      },
      {
        label: "Meter tour focus",
        detail:
          "The combat-meters tour highlights the meter you just added, not every meter at once.",
        kind: "fix",
      },
      {
        label: "Keep windows on screen",
        detail:
          "Dragging and snapping keep windows inside the screen. Layouts saved off-screen snap back when you load.",
        kind: "fix",
      },
      {
        label: "Menus near the bottom",
        detail:
          "Toolbar menus open below the buttons. Near the bottom of the screen they flip above so they stay visible.",
        kind: "fix",
      },
      {
        label: "Startup crash fix",
        detail:
          "Fixes a rare crash if Comm UI loaded before the page finished opening.",
        kind: "fix",
      },
      {
        label: "Move locked windows",
        detail:
          "Hold Alt to move locked windows that are already on screen. Closed or empty-hidden windows stay hidden — use Layout to place those. DPS and HPS start locked.",
        kind: "improve",
      },
      {
        label: "Tour and Layout fixes",
        detail:
          "Aggro lines are easier to click, the paperdoll tour only runs on players, Layout Done works reliably, and Intro replays when you ask.",
        kind: "fix",
      },
      {
        label: "Fear and aggro",
        detail:
          "Fear badges follow the server's fear levels. Aggro count only includes enemies targeting that character.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.1",
    title: "0.8.0-alpha.1",
    date: "2026-08",
    summary:
      "New meter windows, snap groups for HUD and meters, and clearer fights.",
    items: [
      {
        label: "Damage meter windows",
        detail:
          "Scrollable bars, pin yourself on the list, Time Line, and a detailed Inspector.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Snap windows together",
        detail:
          "Snap HUD and meters at the edges. Resize a joined group together, with green guides while arranging.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Clearer fight segments",
        detail:
          "Current and past fights are easier to follow in meters, bookmarks, and the status bar.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.7.1-windows",
    title: "0.7.1",
    date: "2026-07",
    summary:
      "Unified windows — same lock model for HUD and meters, plus Window Control.",
    items: [
      {
        label: "Lock any panel",
        detail:
          "HUD and meters share the same lock — unlock to drag; hold Alt to nudge while locked.",
        kind: "feature",
      },
      {
        label: "Window Control",
        detail:
          "Menu on each panel: lock, ungroup, close, and reopen closed windows.",
        kind: "feature",
      },
    ],
  },
  {
    id: "0.7.0",
    title: "0.7.0",
    date: "2026-07",
    summary:
      "First Comm UI ship — movable panels, combat HUD, meters, and commands.",
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

export function changelogKindLabel(kind: ChangelogKind): string {
  switch (kind) {
    case "feature":
      return "Feature";
    case "fix":
      return "Fix";
    case "improve":
      return "Improve";
    case "ui":
      return "UI";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
