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
  /** Display date — required, ISO calendar day (YYYY-MM-DD). */
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
    label: "Mail",
    detail:
      "Account inbox on /comm — read, search, compose, send and take while observing.",
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
    id: "0.8.0-alpha.4",
    title: "0.8.0-alpha.4",
    date: "2026-08-16",
    summary:
      "Full account mail in Comm, plus paperdoll / meter / crypt bugfixes while observing.",
    items: [
      {
        label: "Paperdoll Luck and Goldm",
        detail:
          "Inspect no longer shows wallet gold from the stale observe snap (it looked like the wrong character’s inventory). Luck and Goldm are gear + condition estimates (mluck, sets, …) with a ~ prefix and a tooltip — same rules for the observed character or any nearby player.",
        kind: "fix",
        highlight: true,
      },
      {
        label: "Meter Current on observe hop",
        detail:
          "Switching the watched character no longer resets Current when the new observer is in the same party on the same map, or already on the live meter tape (nearby fighter in the same pull). Brief reconnect clears of watching also keep Current.",
        kind: "fix",
        highlight: true,
      },
      {
        label: "Crypt battle reset",
        detail:
          "After a crypt battle reset, bosses seen alive again show Alive (not stuck on Died). Cards only dim when dead and out of vision; HUD panels remount cleanly so leave/re-enter does not leave a faded shell.",
        kind: "fix",
      },
      {
        label: "Overall meters stay live",
        detail:
          "Overall and instance/event overalls refresh while fighting (past fights + live Current), with picker tips that say so. Crypt overall rows include server and age so multiple visits are distinct. Current still owns idle fade / camera follow.",
        kind: "fix",
        highlight: true,
      },
      {
        label: "Mail list performance",
        detail:
          "Inbox list uses content-visibility for off-screen rows and skips rewriting CSS / re-rendering on unchanged unread polls.",
        kind: "improve",
      },
      {
        label: "Mail list date column",
        detail:
          "Inbox rows show a dedicated when column before the item icon: fixed-width 24h clock if today, else a short numeric date from the browser locale (DMY/MDY/…) on the top line, and relative age underneath. From/to stays on the meta line.",
        kind: "feature",
      },
      {
        label: "Mail delete Undo",
        detail:
          "After a small delete, the Status card shows Deleted plus an Undo button with a live countdown (U still works). One clock owns the timer.",
        kind: "ui",
      },
      {
        label: "Mail / meter structure cleanup",
        detail:
          "Delete progress is a single structured channel (Status owns the ETA bar; Activity only pulses). Mail host leaves clustered; window stack owns shared z-order in lib; mail/timeline CSS split under 1k; relative-age formatting lives in lib/format.",
        kind: "improve",
      },
      {
        label: "Mail delete ETA",
        detail:
          "Large inbox cleanups show an estimated time left on the delete progress line (paced server deletes), e.g. Deleting 12 / 200 · ~2m left.",
        kind: "feature",
      },
      {
        label: "Mail window",
        detail:
          "New Mail button on the bottom bar opens a layoutable inbox: search, Load older, compose, multi-select delete (Undo on small batches; progress while larger cleanups run), and a badge for the game’s unread count (100+ when the server caps at 100). Click the badge to jump to the newest unread. Unlock or hold Alt to drag and resize; click Mail to raise it above meters.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Send and Take while observing",
        detail:
          "With a character observed, Send and Take run on that character (gold, bag space, and attach checks). Right-click a bag item for Send mail / queue attach or Item info; Shift+right-click keeps the stock menu when available. STATUS and the character log show how the send or take went.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Compose and batch mail",
        detail:
          "Queue several bag items into one send — one mail per attach, each with its own To. To chips are a recipient pool (round-robin on queue, Distribute across To, or pick per item). Plain mail still copies every To. Subject/body support {item}; empty subject uses the item name. Reply, Forward, sticky last To, and a draft that survives closing Mail.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Stacked repeats",
        detail:
          "Near-duplicates collapse into stacks (same parties + subject/body, or the same attached item). Click the row or ×N chip to expand; nested rows to read or take; “N new” jumps to the first unread. Toggle Stack for a flat list. Stacks sum untaken attachment qty; taken copies stay dim with a Taken pill.",
        kind: "feature",
      },
      {
        label: "Search and filters",
        detail:
          "Gmail-style operators (from:/to:/subject:/item:, has:attachment, is:unread|read|taken|untaken, after:/before:, newer_than:/older_than:, quotes, -exclusions) plus Show search options for From / To / Subject / words / Item / date / scope, and Has attachment / Untaken only / Taken only. Select all picks every row in the current filter for batch delete.",
        kind: "feature",
      },
      {
        label: "Inbox list",
        detail:
          "Newest mail first (flat or stacked). Two-line rows: title + chips, then from/to · time, icon on the right. Shared ItemInstance chrome for qty/level. Compact Activity / Character / Inbox / Status cards; list stays narrow so the read/compose pane has room.",
        kind: "ui",
      },
      {
        label: "Inbox cache",
        detail:
          "Mail is stored in IndexedDB per account. Opening restores instantly, then soft-merges the newest page onto the cache; older pages warm in the background while Mail is open. Closing keeps the session list. Activity shows pull / warm / command / delete.",
        kind: "feature",
      },
      {
        label: "Unread",
        detail:
          "Unread follows the game badge plus newly arrived mail. Opening a message clears it in Comm; a banner (or toast if Mail is closed) announces new mail.",
        kind: "feature",
      },
      {
        label: "Window chrome",
        detail:
          "Closable HUD windows (Mail, Threat, Command, …) put hide × on the hover arrange strip with lock and Window Control — same pattern as meters.",
        kind: "ui",
      },
    ],
  },
  {
    id: "0.8.0-alpha.3",
    title: "0.8.0-alpha.3",
    date: "2026-08-16",
    summary:
      "Paperdoll luck and gold, Time Line cooldowns that match the game, and skills that never sent an attack packet — including party buffs and short self-buffs.",
    items: [
      {
        label: "Group stretch alignment",
        detail:
          "Stretch ↕ on a grouped meter shares height without shifting anchors — unstretch shrinks back in place. Corner resize still keeps tops flush while dragging.",
        kind: "fix",
      },
      {
        label: "Threat scope",
        detail:
          "Threat meter can show Party (watched character's in-game party) or Visible (everyone with aggro on screen). Default stays Visible.",
        kind: "feature",
      },
      {
        label: "Meter bar height",
        detail:
          "Bar rows follow Options → Bar height (and Window scale). Chrome-on-hover no longer reflows the list when you hover Stretch ↕, so side-by-side meters keep row alignment.",
        kind: "fix",
      },
      {
        label: "Luck and gold on inspect",
        detail:
          "Paperdoll shows luck and gold. When /comm does not get those from the server, luck and gold-find are estimated from gear (wallet gold cannot be guessed). Compare mode uses matching units.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Time Line cooldowns",
        detail:
          "Cast bars follow each skill's real cooldown, including attack speed for auto-attack and shared skills like 3shot. Attack speed is stored when the cast happens, so reviewing an older fight no longer paints yesterday's casts with today's speed.",
        kind: "improve",
        highlight: true,
      },
      {
        label: "Time Line skills",
        detail:
          "Skills the game announces with ui / eval instead of an attack packet now show on the Time Line — stomp, scare, mluck, energize, Temporal Surge, and the rest of that set. Cleave still uses the attack packet; the extra ui ping is not a second cast (either packet order).",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Buffs and self skills on Time Line",
        detail:
          "Warcry and darkblessing show as casts from the caster (from the buff's caster field), even though the game's ui packet has no name. Hardshell, charge, and blink show from when the buff appears. Short buffs like blink are sampled often enough to usually catch them. Combat debuffs and skills that already send a named ui (mluck, energize, …) are not double-counted or mis-attributed.",
        kind: "feature",
        highlight: true,
      },
      {
        label: "Paperdoll vitals",
        detail:
          "Green XP bar under MP, red HP, and a tighter stats block with luck and gold.",
        kind: "ui",
      },
      {
        label: "Threat ghosts",
        detail:
          "Aggro and threat no longer count vanished or already-dead monsters.",
        kind: "fix",
      },
      {
        label: "Meter window size",
        detail:
          "Meter windows keep their box when Inspector target lists are long — the list scrolls instead of stretching the window.",
        kind: "fix",
      },
      {
        label: "Pack names in tooltips",
        detail:
          "Ctrl-expand on meter targets groups identical pack members (Spark Bot ×40) so the tip stays readable.",
        kind: "improve",
      },
      {
        label: "Intro combat meters",
        detail:
          "The intro tour highlights all combat meters together, not only the HPS window.",
        kind: "fix",
      },
      {
        label: "Reopen menu keys",
        detail:
          "Closing several meters with the same title (e.g. two DPS) no longer trips React duplicate-key warnings in the Window Control reopen list.",
        kind: "fix",
      },
      {
        label: "Crypt panel opacity",
        detail:
          "Crypt progress stays solid (does not follow the meter out-of-combat idle fade). The panel frame fills with an opaque background so the map no longer shows through after meters wake.",
        kind: "fix",
      },
      {
        label: "Crypt bat click",
        detail:
          "Clicking Vampireling or Bat in Crypt progress targets an aggroed one of that type (preferring the one on you) instead of the lowest-id bat in vision.",
        kind: "fix",
      },
      {
        label: "Closed meters stay closed",
        detail:
          "Closing default DPS/HPS no longer resurrects them when /comm reloads — normalize respects the closed reopen list.",
        kind: "fix",
      },
      {
        label: "Layout guide stuck on",
        detail:
          "Releasing Alt while dragging a panel no longer leaves the alignment grid stuck on (Windows often drops pointerup when Alt opens the menu bar). The drag finishes on Alt-up.",
        kind: "fix",
      },
      {
        label: "Meter rank column",
        detail:
          "Ranks 10+ keep the same name alignment as 1–9 (rank column no longer clips double-digit numbers).",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.2",
    title: "0.8.0-alpha.2",
    date: "2026-08-14",
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
    date: "2026-08-13",
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
    date: "2026-08-13",
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
    date: "2026-07-01",
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

/** True when `entryId` is newer than the last dismissed changelog id. */
export function isChangelogEntryUnseen(
  entryId: string,
  seenId: string | null | undefined,
): boolean {
  if (!CHANGELOG.length) return false;
  if (!seenId) return entryId === CHANGELOG[0].id;
  const seenIdx = CHANGELOG.findIndex((entry) => entry.id === seenId);
  if (seenIdx < 0) return entryId === CHANGELOG[0].id;
  const entryIdx = CHANGELOG.findIndex((entry) => entry.id === entryId);
  if (entryIdx < 0) return false;
  return entryIdx < seenIdx;
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
