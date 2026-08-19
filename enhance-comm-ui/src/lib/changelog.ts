/**
 * Versioned What's New entries — newest first.
 * Bump by prepending an entry when shipping user-facing changes.
 * Users who already finished/skipped intro still see unseen entries.
 *
 * Structure per release (placement is the shape — no highlight flag):
 * - `highlights` → short teaser cards
 * - `features` → named deep-dives (cards + optional `points`)
 * - `items` → Also in this release (grouped by kind)
 */

export type ChangelogKind = "feature" | "fix" | "improve" | "ui";

/** Lead + detail card (Highlights, Also, intro overview). */
export type ChangelogCard = {
  label: string;
  detail: string;
  kind?: ChangelogKind;
};

/** Feature-section card — optional short sub-bullets. */
export type ChangelogFeatureCard = ChangelogCard & {
  points?: string[];
};

/** Deep-dive for a named feature — rendered after Highlights. */
export type ChangelogFeatureSection = {
  title: string;
  summary?: string;
  items: ChangelogFeatureCard[];
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
  /** Short teaser cards at the top. */
  highlights?: ChangelogCard[];
  /** Named feature sections with card grids. */
  features?: ChangelogFeatureSection[];
  /** Also in this release. */
  items: ChangelogCard[];
};

/**
 * Feature overview shared by first-run intro and the baseline changelog entry.
 */
export const FEATURE_OVERVIEW: ChangelogCard[] = [
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
  {
    label: "Instance HUD",
    detail: "Crypt, spider, tomb, and winter roster plus a compact run chip.",
    kind: "feature",
  },
  {
    label: "Ability Timeline",
    detail:
      "Icon rail for boss and add cooldowns, with optional Big Icon frames.",
    kind: "feature",
  },
  {
    label: "Minimap",
    detail:
      "Layoutable map with pan, zoom, and a solid / faint / clear background.",
    kind: "feature",
  },
];

/** Newest first. Prepend when releasing. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "0.8.0-alpha.7",
    title: "0.8.0-alpha.7",
    date: "2026-08-19",
    summary:
      "Per-ability visibility toggles, searchable badge picker, monster icons in settings, and a disconnect overlay that no longer flashes on observer switch.",
    highlights: [
      {
        label: "Ability visibility toggles",
        detail:
          "Settings → Ability Timeline now has a per-ability table: toggle each skill on/off for the rail and Big Icon independently. Skill icons shown inline.",
        kind: "feature",
      },
      {
        label: "Min cooldown filter",
        detail:
          "New minCooldownMs setting filters short cooldowns from the rail — keeps the timeline readable when mobs spam sub-second abilities.",
        kind: "feature",
      },
      {
        label: "Disconnect overlay grace period",
        detail:
          "The DISCONNECTED banner now waits 2 seconds before appearing. Switching observers briefly drops the socket — the overlay no longer flashes on every hop. Explicit server kicks (limits, blocked) still show immediately.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Per-ability visibility",
        detail:
          "Searchable table in Ability Timeline settings. Each row shows the skill icon, name, and separate rail / BigIcon checkboxes. Persisted per-layout.",
        kind: "feature",
      },
      {
        label: "Min cooldown filter",
        detail:
          "minCooldownMs applies only to the rail; BigIcon and Highlight frames are unaffected so important imminent CDs still show.",
        kind: "improve",
      },
      {
        label: "Preview caster picker",
        detail:
          "The Ability Timeline preview caster selection is now a searchable badge picker scanning G.monsters directly, replacing the old checkbox grid.",
        kind: "ui",
      },
      {
        label: "Timeline scale fix",
        detail:
          "Fixed ability timeline scale mismatch and short-CD skipping that caused icons to land at wrong positions.",
        kind: "fix",
      },
      {
        label: "Disconnect overlay grace",
        detail:
          "Socket loss starts a 2s timer; reconnecting within that window (observer switch) cancels it. Server-sent reasons bypass the timer.",
        kind: "fix",
      },
      {
        label: "Monster icons in ability lists",
        detail:
          "Both Ability Timeline visibility and Drawings ability appearance tables now show caster monster icons (40px) with name on hover.",
        kind: "ui",
      },
      {
        label: "Ability name + key",
        detail:
          "Ability rows in both settings panes now show the display name and the raw ability key, consistent across Drawings and Ability Timeline.",
        kind: "ui",
      },
      {
        label: "Stock disconnect button hidden",
        detail:
          "The game's stock disconnect button is now fully hidden — ECU's own overlay handles disconnect display after the grace period.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.6",
    title: "0.8.0-alpha.6",
    date: "2026-08-19",
    summary:
      "Entity Inspect JSON, a full-screen /comm disconnect banner with the server reason, plus Ability Timeline hover-tip and mail Take fixes.",
    highlights: [
      {
        label: "Disconnected banner",
        detail:
          "Losing the /comm socket covers the HUD with a pulsing DISCONNECTED overlay — same idea as the in-game client. Shows the server reason when there is one. Click anywhere to reload.",
        kind: "fix",
      },
      {
        label: "Entity Inspect",
        detail:
          "Click `{}` on a unit frame, paperdoll, party chip, or aggro mob to open the stock show_json modal for that entity — same as in-game INSPECT.",
        kind: "feature",
      },
      {
        label: "Ability Timeline hover tip",
        detail:
          "Skill cooldown tooltips dismiss when the caster leaves or the timeline panel unmounts — no more stuck Healing tips after the mob is gone.",
        kind: "fix",
      },
      {
        label: "Mail Take",
        detail:
          "Take from the inbox no longer throws SyntaxError in the character log — observer commands wrap correctly for early exit.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Disconnected banner",
        detail:
          "Chrome CSS had been hiding the stock DISCONNECTED gamebutton under the character strip. Overlay sits above meters; tab title reads Disconnected. Known codes (limits, limitdc, blocked) get a readable line; other server messages show as sent.",
        kind: "fix",
      },
      {
        label: "Inspect JSON",
        detail:
          "Uses stock ui_inspect / show_json on /comm — character and monster headers, docs links, and the full soft-synced entity object.",
        kind: "feature",
      },
      {
        label: "Ability Timeline hover tip",
        detail:
          "Hover tips lived on document.body; unmounting the rail while the cursor was still over an icon never fired mouseleave. The panel now clears an open tip when casters vanish.",
        kind: "fix",
      },
      {
        label: "Observer command scripts",
        detail:
          "Mail take, send, and send-item CODE snippets are wrapped in an async function so inventory/gold guards can `return` safely under stock code_eval (fixes Illegal return statement on Take).",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.5",
    title: "0.8.0-alpha.5",
    date: "2026-08-18",
    summary:
      "Instance HUD, Ability Timeline, and a layoutable minimap — plus a searchable Settings hub, Drawings overlays on the /comm map, and nearby send.",
    highlights: [
      {
        label: "Settings hub",
        detail:
          "Movable Settings window with search. Panes: Comm UI, Ability Timeline, Drawings, and Comm HUD. Intro tour and changelog live under Comm UI.",
        kind: "feature",
      },
      {
        label: "Drawings overlays",
        detail:
          "Settings → Drawings toggles rings, labels, entity lines, and debug map helpers. Per-ability color and show-name overrides with skill icons.",
        kind: "feature",
      },
      {
        label: "Instance HUD",
        detail:
          "One Instance panel covers crypt, spider, tomb, and winter. A separate Instance run chip tracks bosses/phases cleared and last luckm.",
        kind: "feature",
      },
      {
        label: "Ability Timeline",
        detail:
          "Icon rail for visible casters’ cooldowns. Vertical or horizontal, with optional Big Icon and highlight name frames.",
        kind: "feature",
      },
      {
        label: "Minimap",
        detail:
          "Movable map: pan, zoom, click-to-target. Background cycles solid → faint → clear. Camera refits on map change, not every step.",
        kind: "feature",
      },
      {
        label: "Mail window chrome",
        detail:
          "Hover Mail for the drag strip and hide ×, same as other HUD windows. The inbox no longer clips that bar.",
        kind: "fix",
      },
    ],
    features: [
      {
        title: "Instance cards",
        summary:
          "Saved Crypt layouts migrate to Instance + Instance run. Off those maps the shells stay unmounted so they do not paint on desert.",
        items: [
          {
            label: "Glance",
            detail:
              "Idle cards show name, Aggroed / We see / Died / Cleared, and yellow/red borders. Hover shows mtype, luckm, focus, and death time.",
            points: [
              "Level is top-right; adds also show Died ×N there, including while the pack is in vision",
              "Winter/phase cards: Cleared · 3m ago when we saw the kill",
              "Dead or cleared cards out of vision dim; the panel frame stays fully opaque",
            ],
          },
          {
            label: "Per-map layout",
            detail:
              "Crypt bosses + bats; spider queens with a blocked-passage hint; tomb compass protectors; winter ordered phases (Up next / Final / Cleared).",
          },
        ],
      },
      {
        title: "Ability Timeline",
        summary:
          "Bottom-bar Settings → Ability Timeline. Dummy preview ticks on its own so the form does not hitch every 100ms.",
        items: [
          {
            label: "Icon rail",
            detail:
              "Abilities travel a window (default 10s). Flip vertical/horizontal; a mid-size user resize is not swapped away.",
            points: [
              "All visible casters, or only the current / observe target",
              "Hover an icon for caster, remaining CD, and the skill explanation",
              "Optional Big Icon and highlight frames when a CD is imminent",
              "Default rail tint is clear; ticks and ready-at-NOW stay on",
            ],
          },
        ],
      },
      {
        title: "Drawings & overlays",
        summary:
          "Settings → Drawings. Rings and lines paint on the /comm map; overlay preview has a world stage so you can see them without the live client.",
        items: [
          {
            label: "Rings & labels",
            detail:
              "Imminent ability rings, optional ghost/aura/attack-range rings, at-risk highlights, and global or per-skill name labels.",
            points: [
              "Ability appearance: pick a color and whether to show the name for each skill",
              "Color picker shows the live resolved color, not a blank auto placeholder",
            ],
          },
          {
            label: "Entity lines",
            detail:
              "Optional monster aggro, move destination, and player attack lines. Focus boss only limits lines to the focused entity.",
            points: [
              "Aggro lines are off by default — turn on Monster aggro → target when you want them",
            ],
          },
          {
            label: "Map quirks",
            detail:
              "Clickable signs, shrines, and levers on the live game map. Hover shows a Comm tooltip; click opens a Comm notice because /comm has no game log.",
            points: [
              "Hover a sign for a Comm tooltip; click to read it in a Comm card. Click the dim backdrop to close.",
              "Optional hover outline in Settings → Drawings → Debug — it only draws the quirk under the cursor",
            ],
          },
        ],
      },
      {
        title: "Minimap",
        summary:
          "Always-on chrome like party/chips. ◎ recenters and zoom-fits drawable entities.",
        items: [
          {
            label: "Camera",
            detail:
              "Fits on load and map/`in` change. Walking does not drag the camera; pan and wheel zoom still work.",
          },
          {
            label: "Background",
            detail:
              "Click the mode chip: Solid (grid), Faint, or Clear (no fill, no grid).",
          },
        ],
      },
    ],
    items: [
      {
        label: "Settings",
        detail:
          "Settings button on the bottom-right strip opens a movable, searchable hub: Comm UI, Ability Timeline, Drawings, and Comm HUD.",
        kind: "feature",
      },
      {
        label: "Nearby send",
        detail:
          "Bag right-click can send_item to a nearby player in range (trade), not only mail.",
        kind: "feature",
      },
      {
        label: "Buff / Item info size",
        detail:
          "Buff info and Item info auto-resize to content by default, same as the party roster. Corner-resize pins a size.",
        kind: "improve",
      },
      {
        label: "Boss HP marks",
        detail:
          "Boss bars show G.monsters spawn HP thresholds (e.g. pumpkin/jr waves) as marks on the bar.",
        kind: "feature",
      },
      {
        label: "Empty combat shells",
        detail:
          "Enemies, boss bar, threat, and the ability-timeline family unmount when there is nothing to show — no empty opaque boxes in town.",
        kind: "improve",
      },
      {
        label: "Window Control Auto-resize",
        detail:
          "Auto-resize is available on more HUD windows (enemies, boss bar, threat, kills, unit frames, events). Party / buff / item still default on.",
        kind: "improve",
      },
      {
        label: "Party auto-resize cap",
        detail:
          "Auto-resize on the party roster stops at three chip columns and wraps extra members down, instead of growing across the screen.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.4",
    title: "0.8.0-alpha.4",
    date: "2026-08-17",
    summary:
      "Mail UI lands on /comm, with observe/meter/crypt fixes and Time Line bars that respect known durations.",
    highlights: [
      {
        label: "Mail UI",
        detail:
          "Full account inbox on the bottom bar — read, search, compose, send and take while observing.",
        kind: "feature",
      },
      {
        label: "Observe-friendly meters",
        detail:
          "Current sticks across party observe hops; Overall stays live while fighting.",
        kind: "fix",
      },
      {
        label: "Party auto-resize",
        detail:
          "The party roster hugs its chips by default. Window Control → Auto-resize turns that on for other HUD panels; a corner-resize turns it off.",
        kind: "improve",
      },
    ],
    features: [
      {
        title: "Mail",
        summary:
          "Layoutable inbox while observing — unlock or Alt-drag to place; click Mail to raise it above meters.",
        items: [
          {
            label: "Inbox",
            detail:
              "Newest first, two-line rows with a when column and item icon. Load older when you need history.",
            points: [
              "Today: fixed-width 24h clock; older: short locale date + relative age",
              "Activity / Character / Inbox / Status cards stay compact so the read pane has room",
              "Off-screen rows use content-visibility for smoother long lists",
            ],
          },
          {
            label: "Send & Take",
            detail:
              "With a character observed, Send and Take run on that character — gold, bag space, and attach checks included.",
            points: [
              "Right-click bag → Send mail / queue attach, Send item to nearby, or Item info",
              "Nearby send uses send_item (trade), not mail — pick one recipient in range",
              "Shift+right-click keeps the stock menu when available",
              "STATUS and the character log show how the send or take went",
            ],
          },
          {
            label: "Compose & batch",
            detail:
              "Queue several bag items into one send — one mail per attach, each with its own To.",
            points: [
              "To chips: round-robin, Distribute across To, or pick per item",
              "Plain mail still copies every To; {item} in subject/body; empty subject → item name",
              "Reply, Forward, sticky last To, and a draft that survives closing Mail",
            ],
          },
          {
            label: "Stacks",
            detail:
              "Near-duplicates collapse so spam and repeats do not bury the inbox.",
            points: [
              "Same parties + subject/body, or the same attached item",
              "Expand the row or ×N chip; “N new” jumps to the first unread",
              "Toggle Stack for a flat list; taken copies stay dim with a Taken pill",
            ],
          },
          {
            label: "Search & filters",
            detail:
              "Gmail-style operators plus a guided options panel for common filters.",
            points: [
              "from:/to:/subject:/item:, has:attachment, is:unread|read|taken|untaken",
              "after:/before:, newer_than:/older_than:, quotes, and -exclusions",
              "Select all picks every row in the current filter for batch delete",
            ],
          },
          {
            label: "Cache & unread",
            detail:
              "IndexedDB per account restores instantly; unread follows the game badge plus newly arrived mail.",
            points: [
              "Soft-merge newest page on open; older pages warm while Mail is open",
              "Badge shows 100+ when the server caps at 100 — click to jump to newest unread",
              "Banner (or toast if Mail is closed) announces new mail",
            ],
          },
          {
            label: "Delete",
            detail:
              "Small batches get Undo; large cleanups show paced progress with an ETA.",
            points: [
              "Status card: Deleted + Undo with a live countdown (U still works)",
              "Large jobs: e.g. Deleting 12 / 200 · ~2m left",
            ],
          },
        ],
      },
    ],
    items: [
      {
        label: "Crypt battle reset",
        detail:
          "After a crypt battle reset, bosses seen alive again show Alive (not stuck on Died). Cards only dim when dead and out of vision; HUD panels remount cleanly so leave/re-enter does not leave a faded shell.",
        kind: "fix",
      },
      {
        label: "Time Line predicted ends",
        detail:
          "Buff/debuff and cooldown bars use known remaining duration (and skill CD length) so they draw past the yellow “now” line instead of lag-growing into it. Follow still pins the playhead to the right edge.",
        kind: "fix",
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
    highlights: [
      {
        label: "Luck and gold on inspect",
        detail:
          "Paperdoll shows luck and gold. When /comm does not get those from the server, luck and gold-find are estimated from gear (wallet gold cannot be guessed). Compare mode uses matching units.",
        kind: "feature",
      },
      {
        label: "Time Line cooldowns",
        detail:
          "Cast bars follow each skill's real cooldown, including attack speed for auto-attack and shared skills like 3shot. Attack speed is stored when the cast happens, so reviewing an older fight no longer paints yesterday's casts with today's speed.",
        kind: "improve",
      },
      {
        label: "Time Line skills",
        detail:
          "Skills the game announces with ui / eval instead of an attack packet now show on the Time Line — stomp, scare, mluck, energize, Temporal Surge, and the rest of that set. Cleave still uses the attack packet; the extra ui ping is not a second cast (either packet order).",
        kind: "feature",
      },
      {
        label: "Buffs and self skills on Time Line",
        detail:
          "Warcry and darkblessing show as casts from the caster (from the buff's caster field), even though the game's ui packet has no name. Hardshell, charge, and blink show from when the buff appears. Short buffs like blink are sampled often enough to usually catch them. Combat debuffs and skills that already send a named ui (mluck, energize, …) are not double-counted or mis-attributed.",
        kind: "feature",
      },
    ],
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
    highlights: [
      {
        label: "Changelog browser",
        detail:
          "Open Changelog anytime from the bottom bar. Browse versions one at a time — the window stays on screen.",
        kind: "ui",
      },
      {
        label: "Arrange outline",
        detail:
          "When unlocked, the blue outline wraps the whole window (including Command buttons and Kills).",
        kind: "fix",
      },
      {
        label: "Coop contribution %",
        detail:
          "Coop V2 contribution % matches the game again; Coop V1 is still the simple share.",
        kind: "fix",
      },
    ],
    items: [
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
    highlights: [
      {
        label: "Damage meter windows",
        detail:
          "Scrollable bars, pin yourself on the list, Time Line, and a detailed Inspector.",
        kind: "feature",
      },
      {
        label: "Snap windows together",
        detail:
          "Snap HUD and meters at the edges. Resize a joined group together, with green guides while arranging.",
        kind: "feature",
      },
    ],
    items: [
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
