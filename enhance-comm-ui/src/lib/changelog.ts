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
    id: "0.9.1",
    title: "0.9.1",
    date: "2026-09-02",
    summary: "Party roster Buffs mode toggle works again on click-through HUD shells.",
    highlights: [
      {
        label: "Buffs mode button",
        detail:
          "The gold Buffs · Auto/Off chip on the party roster accepts clicks again — cycle All, Auto, Obs, Compact, Shared, and Off.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Roster hit target",
        detail:
          "ecu-roster-buffs joins ecu-chip on the panel pointer-events allowlist so the mode chip is not buried under a click-through shell.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.9.0",
    title: "0.9.0",
    date: "2026-08-30",
    summary:
      "Trade and bag workflows for merchants and non-merchants — split stacks, smarter list pricing, drag-and-drop fixes, and grep-friendly bot logs.",
    highlights: [
      {
        label: "Bag stack split",
        detail:
          "Middle-click a stackable bag item to split — modifier keys pick quick presets (half, quarter, …); plain middle-click opens a custom quantity dialog. Context menu Split… too.",
        kind: "feature",
      },
      {
        label: "Trade price dialog",
        detail:
          "List, reprice, wishlist, and buy-order prompts use an async ECU dialog — item icon, vendor floor chip, nearby listing chips, last price, and undercut suggestions instead of stock prompt().",
        kind: "feature",
      },
      {
        label: "Non-merchant trade row",
        detail:
          "Characters without a merchant stand can list on their personal trade1–4 row — drag bag → slot, bag menu List on Trade…, and reprice/delist work the same as on a stand.",
        kind: "feature",
      },
      {
        label: "Drag-and-drop",
        detail:
          "Bag → trade slot, bag → paperdoll equip, and bag internal swap highlight targets correctly. Trade slot drop glow sits on the icon, not the price label.",
        kind: "improve",
      },
      {
        label: "Vendor floor + tax",
        detail:
          "Default list price and Vendor chip account for sales tax — list price is high enough that net gold after tax is at least NPC vendor gold.",
        kind: "improve",
      },
      {
        label: "[ECU/comm] bot logs",
        detail:
          "Observer COMMAND scripts log a grep-friendly [ECU/comm] line at start and on trade success/failure — docker logs al-bots-bot-official-1 | rg ECU/comm.",
        kind: "improve",
      },
    ],
    features: [
      {
        title: "Trade & bag on /comm",
        summary:
          "Full trade and inventory editing for the character you are observing — merchants and regular players.",
        items: [
          {
            label: "Personal trade row",
            detail:
              "trade1–4 always visible in the Trade panel for your character; list/reprice/delist without opening a merchant stand.",
            kind: "feature",
            points: [
              "Auto-opens personal row before list commands when closed",
              "Stand slots (trade5+) unchanged for merchants",
            ],
          },
          {
            label: "Price dialog chips",
            detail:
              "Vendor (tax-adjusted), last listed, nearby listings, undercut −1, and manual entry.",
            kind: "feature",
          },
          {
            label: "Bag split",
            detail:
              "split() via o:command — middle-click or context menu; respects stack cap and observed-character guard.",
            kind: "feature",
          },
        ],
      },
    ],
    items: [
      {
        label: "Trade socket fix",
        detail:
          "CODE runner uses get_socket().emit for trade show/hide/list — fixes silent failure listing on non-merchant characters.",
        kind: "fix",
      },
      {
        label: "Stock on_drop guard",
        detail:
          "Strip native bag drop handlers on /comm so observed drag-and-drop does not crash when character.items is null.",
        kind: "fix",
      },
      {
        label: "Active drag slot cache",
        detail:
          "dragover highlights work when getData() is empty — slot number cached at dragstart.",
        kind: "fix",
      },
      {
        label: "Trade panel cell size",
        detail:
          "Fixed cell footprint so long price labels do not widen the slot grid.",
        kind: "ui",
      },
      {
        label: "Entity tax field",
        detail: "Observed character tax rate drives vendor-floor list price math.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.16",
    title: "0.8.0-alpha.16",
    date: "2026-08-30",
    summary:
      "Equip, trade, and sort inventory on the character you are observing — plus clearer item labels.",
    highlights: [
      {
        label: "Observer gear editing",
        detail:
          "Right-click bag items to Equip or Swap slots; right-click paperdoll gear to Unequip. Commands run on the watched character via o:command.",
        kind: "feature",
      },
      {
        label: "Trade window",
        detail:
          "Trade row and merchant stand controls live in a separate Trade panel — Yours/Inspected toggle, left-click to buy, drag listings to bag to delist.",
        kind: "feature",
      },
      {
        label: "Bag sort",
        detail:
          "Sort button on the bag chrome runs sequential swap()/imove on the watched character. Configure priority rules in Settings → Bag (AdiBags-style keys, empty-last).",
        kind: "feature",
      },
      {
        label: "Trade panel layout",
        detail:
          "Fixed-size Trade window with opaque background — default trade1–4 always shown (yours and inspected merchants); stand extras (trade5+) stay visible for your character after the stand closes (game hides them from sync until reopen); Compact slots / All slots toggles grid density; Open/Close stand is separate.",
        kind: "improve",
      },
      {
        label: "Trade UX",
        detail:
          "Buy/sell badges, compact gold prices, confirm dialogs, last-price memory, bag menu Sell to buy order… (B badge on matching bag items), Giveaway on trade…, Shift+drag giveaway, giveaways, auto-open when inspecting a merchant, and Updating… bag feedback while commands run.",
        kind: "improve",
      },
      {
        label: "Item hover labels",
        detail:
          "Bag slots and paperdoll gear show full item names on hover — title prefix (G.titles) and upgrade/compound level suffixes match stock item info.",
        kind: "improve",
      },
      {
        label: "Title-prefix borders",
        detail:
          "Titled items (Festive, Gooped, Lucky, etc.) show the colored outer border from item.p — same palette as market-tracker and data-explorer.",
        kind: "improve",
      },
      {
        label: "Free bag space",
        detail:
          "Send-to-nearby and trade menus show free inventory slots on the receiver when the game exposes esize.",
        kind: "improve",
      },
    ],
    items: [
      {
        label: "Bag equip menu",
        detail:
          "Context menu picks main/off hand, rings, earrings, etc. Server validates class and slot rules.",
        kind: "feature",
      },
      {
        label: "Paperdoll unequip",
        detail: "Right-click an equipped slot on your watched paperdoll to unequip (elixir excluded).",
        kind: "feature",
      },
      {
        label: "Inventory swap",
        detail:
          "Swap with… flyout on bag right-click — pick an occupied slot or enter any slot number. Drag bag slots or onto paperdoll to equip.",
        kind: "improve",
      },
      {
        label: "Trade slot listing",
        detail:
          "Bag menu List on Trade… and Sell to buy order…, drag bag → empty trade slot, drag listing → bag to delist, wishlist picker, fingerprint-aware reprice, left-click buy with confirm.",
        kind: "feature",
      },
      {
        label: "Watched character only",
        detail:
          "Gear and sort actions apply only when observing your own character — other players stay inspect-only.",
        kind: "fix",
      },
      {
        label: "Paperdoll click-through",
        detail:
          "Paperdoll and Trade panel shells pass clicks through empty padding — only headers, gear, and trade slots capture hits.",
        kind: "fix",
      },
      {
        label: "Sort script safety",
        detail:
          "One locked sequential script per batch, placeholder slots skipped, then refreshObservedInventory when finished.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.15",
    title: "0.8.0-alpha.15",
    date: "2026-08-29",
    summary:
      "Every dismissible panel closes from the same yellow window chrome × — paperdoll, buff/item tips, player frame, bag, and meters.",
    highlights: [
      {
        label: "Unified window chrome close",
        detail:
          "Hover a panel for the yellow arrange strip — × closes paperdoll, buff/item tips, player/target frames, bag, and meters the same way.",
        kind: "fix",
      },
      {
        label: "No duplicate inner ×",
        detail:
          "Paperdoll header and adopted buff/item tips no longer show a second close button inside the panel body.",
        kind: "ui",
      },
    ],
    items: [
      {
        label: "Content vs visibility close",
        detail:
          "Tips and paperdoll dismiss their content; inventory/threat/mail hide via panelVisible; player frame can be hidden and reopened.",
        kind: "fix",
      },
      {
        label: "Player / target frame closable",
        detail: "Character and target unit frames join the closable panel set.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.14",
    title: "0.8.0-alpha.14",
    date: "2026-08-29",
    summary:
      "Closed buff/item tips no longer leave an invisible click box — paperdoll × and bag slots work again after dismissing a tip.",
    highlights: [
      {
        label: "Ghost click box gone",
        detail:
          "Empty buff/item hosts hide and pass clicks through. Idle tip panels collapse to zero size instead of keeping a saved frame box.",
        kind: "fix",
      },
      {
        label: "Paperdoll × / bag",
        detail:
          "Paperdoll sits above tip stack; tip shells stay click-through until content is actually open.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Empty dialog hosts",
        detail:
          "#ecu-buff-dialog / #ecu-item-dialog use display:none and pointer-events:none when empty; only adopted :not(:empty) hosts accept clicks.",
        kind: "fix",
      },
      {
        label: "Tip panel hit targets",
        detail:
          "buffInfo/itemInfo body frames are pointer-events:none; data-ecu-info-open=\"1\" re-enables the open tip shell.",
        kind: "fix",
      },
      {
        label: "Force tip autoSize",
        detail:
          "Saved fixed buff/item frame sizes no longer leave a leftover invisible box after close.",
        kind: "fix",
      },
      {
        label: "Paperdoll z-index",
        detail: "Paperdoll frame raised to z 56 so × and gear stay above tip raise stack.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.13",
    title: "0.8.0-alpha.13",
    date: "2026-08-29",
    summary:
      "Ghost Buff info strip no longer parks above bag/paperdoll or blocks closing them — tips stay tips, not unlocked windows.",
    highlights: [
      {
        label: "Ghost buff chrome",
        detail:
          "Unlocked Buff/Item info no longer leave a floating arrange strip when empty. Hold Alt to move tips; empty/close-only hosts count as closed.",
        kind: "fix",
      },
      {
        label: "Paperdoll / bag clicks",
        detail:
          "Buff/item tips no longer raise above paperdoll or inventory, and tip shells stay click-through outside the tip content.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Stricter info hasContent",
        detail:
          "Close-button-only / whitespace hosts are treated as closed and scrubbed so open-state cannot stick.",
        kind: "fix",
      },
      {
        label: "Tip panels Alt-only arrange",
        detail:
          "buffInfo/itemInfo play-arrange only while Alt is held — no persistent unlocked chrome strip.",
        kind: "fix",
      },
      {
        label: "Tips do not raise",
        detail:
          "Buff/item panels skip click-to-front so they cannot jump above paperdoll × or bag slots.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.12",
    title: "0.8.0-alpha.12",
    date: "2026-08-29",
    summary:
      "HUD panels pass clicks through empty box area — player frame, buff strips, and boss bar no longer block map character clicks.",
    highlights: [
      {
        label: "Player frame click-through",
        detail:
          "Only the HP bar, inspect, and buff icons capture clicks — not the whole min-width frame box over the map.",
        kind: "fix",
      },
      {
        label: "Panel shell pass-through",
        detail:
          "Idle HUD panel shells use pointer-events: none; fill windows (Mail, Command, …) still capture normally.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Unit frame hit targets",
        detail:
          "ObservedUnit / vitals row / EffectsRow / shared party buffs — container none, controls auto.",
        kind: "fix",
      },
      {
        label: "Boss bar stack",
        detail: "Stack container passes clicks; each boss row stays clickable.",
        kind: "fix",
      },
      {
        label: "panelStyle shells",
        detail: "Default panelStyle pointer-events: none; party chips and fill-panel bodies stay interactive.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.11",
    title: "0.8.0-alpha.11",
    date: "2026-08-28",
    summary:
      "Mainframe back on the action bar (/mainframe, like stock comm) and bottom chrome no longer blocks update notes, buff info, or other /comm UI at the screen edge.",
    highlights: [
      {
        label: "Mainframe button",
        detail:
          "Terminal icon beside Docs opens /mainframe (same as the stock MAINFRAME button beside TOGGLE). Not the old cyberland render_mainframe map quirk.",
        kind: "feature",
      },
      {
        label: "Bottom chrome click-through",
        detail:
          "Character strip and action bar no longer steal clicks from update notes, buff info, and other /comm UI that overlaps the bottom edge.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Mainframe on action bar",
        detail:
          "Navigates to /mainframe like stock comm.html (<a href=\"/mainframe\">MAINFRAME</a> beside TOGGLE).",
        kind: "feature",
      },
      {
        label: "Chrome z-index + pointer-events",
        detail:
          "#bottom chrome drops to z-index 201 (below #comm-ui 220). Only buttons/chips/server menu are hittable — empty flex gutters pass clicks through.",
        kind: "fix",
      },
      {
        label: "Modals portaled to body",
        detail:
          "Setup wizard, What's New, and server update notes render outside the #comm-ui stacking context so footers stay above the strip.",
        kind: "fix",
      },
    ],
  },
  {
    id: "0.8.0-alpha.10",
    title: "0.8.0-alpha.10",
    date: "2026-08-26",
    summary:
      "Adventure.land deploy notes on /comm, a Docs button beside Bag and Mail, and click-to-front that no longer bounces back.",
    highlights: [
      {
        label: "Server update notes",
        detail:
          "See Adventure.land's own deploy notes on /comm (welcome and history), separate from the ECU changelog. Settings → Comm UI → Server update notes. Opens once per unseen deploy.",
        kind: "feature",
      },
      {
        label: "Docs on the action bar",
        detail:
          "Docs icon next to Bag, Mail, and Command opens the same menu as adventure.land/docs: Game Guide, CODE Docs, and Other Systems.",
        kind: "feature",
      },
      {
        label: "Window focus sticks",
        detail:
          "Clicking Mail no longer flashes in front then loses to Encounter Details. Bring-to-front survives the resize/snap commits that used to clear it.",
        kind: "fix",
      },
      {
        label: "Locked title chrome",
        detail:
          "Hovering a locked window shows the dark title chip again, not bare text without the arrange strip.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Server update notes",
        detail:
          "Pulls page globals and /update-notes, hooks add_update_notes / show_update_notes, groups by deploy day with soft kind tags, and inlines GameIcon chips when names match live G data.",
        kind: "feature",
      },
      {
        label: "Docs button",
        detail:
          "Calls stock render_guide / render_code_docs / render_others when the client kit is present. Otherwise opens /docs in a new tab.",
        kind: "feature",
      },
      {
        label: "Click-to-front raise",
        detail:
          "HUD and meter windows share one raise path. Stack z on the panel style is kept after panelStyle merge, so idle z 20/40 no longer wipes bring-to-front.",
        kind: "fix",
      },
      {
        label: "Raise z survives layout commits",
        detail:
          "Edge-group resize and scale used to drop ephemeral HUD raise z from the window graph, so Mail fell back to idle z a beat after you clicked it.",
        kind: "fix",
      },
      {
        label: "Locked hover title",
        detail:
          "Locked panels reuse the arrange-title chip look from the unlocked drag grip when chrome opens on hover.",
        kind: "ui",
      },
      {
        label: "Hide meters mid-tour",
        detail:
          "Hide meters during a spotlight tour dismisses the tour, then hides. The click is no longer ignored.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.9",
    title: "0.8.0-alpha.9",
    date: "2026-08-20",
    summary:
      "Kills and paperdoll arrange chrome — hide × and Alt-drag work again on framed HUD windows.",
    highlights: [
      {
        label: "Kills window chrome",
        detail:
          "Autosize is on by default and the shell keeps overflow visible, so hover/Alt shows the drag strip and hide × instead of a bare blue outline.",
        kind: "fix",
      },
      {
        label: "Paperdoll Alt-drag",
        detail:
          "Hold Alt and drag the green title bar (or the arrange strip) to move the paperdoll. Overflow no longer eats the move chrome.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Arrange chrome unclip",
        detail:
          "PositionedPanel always clears shell overflow while the arrange strip or layout-edit header is active, so above-frame drag / lock / × are not clipped by saved frameW/H.",
        kind: "fix",
      },
      {
        label: "In-panel drag handles",
        detail:
          "Title bars marked data-comm-drag-handle (paperdoll header, Kills title) start an Alt-arrange drag without needing the thin strip above the frame.",
        kind: "improve",
      },
      {
        label: "Kills autosize default",
        detail:
          "Catalog default-on plus desktop layout seeds autoSize: true so the short fixed kill box no longer traps chrome.",
        kind: "improve",
      },
    ],
  },
  {
    id: "0.8.0-alpha.8",
    title: "0.8.0-alpha.8",
    date: "2026-08-20",
    summary:
      "Command gets real window chrome and a wider CODE editor, and player-frame aggro no longer opens scrollbars.",
    highlights: [
      {
        label: "Command window chrome",
        detail:
          "Hover Command for the drag strip, lock, and hide × — same arrange chrome as Mail. Autosize is on by default so the panel hugs the editor and snippet list.",
        kind: "fix",
      },
      {
        label: "Wider CODE editor",
        detail:
          "Fixed 320px-tall CodeMirror pane in a 720px Command window. No more mid-editor scrollbar from height:auto.",
        kind: "improve",
      },
      {
        label: "Player frame scrollbars",
        detail:
          "Aggro count badge stays inside the unit box, so the red target indicator no longer opens horizontal and vertical scrollbars.",
        kind: "fix",
      },
    ],
    items: [
      {
        label: "Command arrange chrome",
        detail:
          "Saved frames used to clip the above-frame drag strip. Autosize clears those frames; with autosize off the body scrolls inside the frame so Alt outline matches the box.",
        kind: "fix",
      },
      {
        label: "Command autosize default",
        detail:
          "Catalog default-on, layout defaults seed autoSize: true, and a one-shot migration flips old 560×300 shells (including autosize-off) onto the wider 720 default. Window Control can still turn autosize off.",
        kind: "improve",
      },
      {
        label: "CodeMirror sizing",
        detail:
          "Stock-style setSize(100%, 320) — fixed height fills the typing area edge to edge. Panel max width is 720px.",
        kind: "fix",
      },
      {
        label: "Unit-frame overflow",
        detail:
          "Player/target frames keep overflow:visible for the buff overlay. Hug-frame scroll wrappers skip panels that opt into overflow:visible, so AggroSpark and effects do not create scrollbars.",
        kind: "fix",
      },
    ],
  },
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
