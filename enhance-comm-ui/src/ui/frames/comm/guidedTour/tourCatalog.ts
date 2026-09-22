/**
 * Guided tour definitions — short intro + contextual deep-dives.
 */

import { getSettings, patchSettings } from "../../../../lib/settings";
import type { CardPlacement, TourTargetKind } from "./tourGeometry";
import type { TourAdvanceWhen } from "./tourAdvance";
import type { TourStepEffects } from "./tourEffects";

export type GuidedTourStep = {
  title: string;
  body: string;
  section?: string;
  target: string;
  /** Explicit measure mode — no selector-string heuristics. */
  targetKind?: TourTargetKind;
  missingHint?: string;
  /** Prefer callout above/below spotlight — bottom chrome defaults to above. */
  cardPlacement?: CardPlacement;
  /** Auto-advance when the user completes the action (e.g. picks a character). */
  advanceWhen?: TourAdvanceWhen;
  enter?: TourStepEffects;
  exit?: TourStepEffects;
};

export type TourPrepare = {
  layoutEdit?: boolean;
  showMeters?: boolean;
  testBars?: boolean;
  openMarket?: boolean;
  openBank?: boolean;
};

export type GuidedTourDef = {
  id: string;
  label: string;
  steps: GuidedTourStep[];
  prepare?: TourPrepare;
};

export const INTRO_TOUR_ID = "intro";

/** Current paperdoll tour id (gear / item-info rewrite). */
export const PAPERDOLL_TOUR_ID = "paperdoll-v2";

const INTRO_TOUR: GuidedTourDef = {
  id: INTRO_TOUR_ID,
  label: "Comm UI essentials",
  prepare: { showMeters: true },
  steps: [
    {
      section: "Observe",
      title: "Pick a character",
      body: "Click a character chip. Party frames, meters, and the action bar follow whoever is highlighted. Click the active chip again to stop observing.",
      target: '[data-ecu-tour="character-ui"]',
      targetKind: "region",
      missingHint: "Click any character chip in the strip below.",
      advanceWhen: "observing",
      enter: { refreshHud: true },
    },
    {
      section: "Observe",
      title: "Player & target frames",
      body: "HP, buffs, and resources for whoever you observe and whoever they are targeting.",
      target:
        ".comm-pos-panel.comm-pos-playerFrame, .comm-pos-panel.comm-pos-targetFrame",
      targetKind: "panel",
      missingHint: "Frames appear once someone is selected.",
    },
    {
      section: "Observe",
      title: "Server picker",
      body: "Switch realms without leaving /comm. Shows player count, ping, and live event badges.",
      target:
        '[data-ecu-tour="server-picker-dd"], [data-ecu-tour="server-picker"]',
      targetKind: "button",
      missingHint: "Server list appears at the bottom once /comm connects.",
      enter: { refreshHud: true },
    },
    {
      section: "Observe",
      title: "Action bar",
      body: "Follow centers the camera, Bag opens inventory, Command sends CODE. All of it runs on whoever you are observing.",
      target: '[data-ecu-tour="chrome-actions"]',
      targetKind: "region",
      missingHint: "Action buttons sit above the character strip.",
      enter: { refreshHud: true },
    },
    {
      section: "Observe",
      title: "Bag",
      body: "Click the bag icon to open the watched character's inventory here in the overlay.",
      target: '[data-ecu-tour="btn-bag"]',
      targetKind: "button",
      missingHint: "Click the bag icon in the action bar.",
      advanceWhen: "bagOpen",
      enter: { refreshHud: true },
    },
    {
      section: "Observe",
      title: "Bag panel",
      body: "Your inventory grid lives here while the bag is open. Drag it into place later with layout mode if you want it pinned.",
      target: ".comm-pos-panel.comm-pos-bag",
      targetKind: "panel",
      missingHint:
        "Open the bag from the action bar if the panel is not visible.",
      exit: { closeBag: true },
    },
    {
      section: "Observe",
      title: "Command",
      body: "Click the command icon to open the CODE editor for whoever you are observing.",
      target: '[data-ecu-tour="btn-command"]',
      targetKind: "button",
      missingHint: "Click the command icon in the action bar.",
      advanceWhen: "commandOpen",
      enter: { refreshHud: true },
    },
    {
      section: "Observe",
      title: "Command panel",
      body: "Type or paste CODE and press Ctrl+Enter to run it on the watched character. Saved presets live here too.",
      target: ".comm-pos-panel.comm-pos-command",
      targetKind: "panel",
      missingHint:
        "Click the command icon in the action bar to open this panel.",
      exit: { closeCommand: true, closeBag: true },
    },
    {
      section: "Overlay",
      title: "Control strip",
      body: "Bottom-right buttons for layout, meters, and adding panels.",
      target: ".comm-pos-toggles",
      targetKind: "region",
      enter: { closeBag: true, closeCommand: true },
    },
    {
      section: "Overlay",
      title: "Layout mode",
      body: "Turn this on to drag panels into place. Every panel appears at once so you can position them. It looks busy; that is normal. A short layout tour runs the first time you enable it.",
      target: '[data-ecu-tour="btn-layout"]',
      targetKind: "button",
      missingHint: "Click the Layout button in the control strip.",
    },
    {
      section: "Overlay",
      title: "Party roster",
      body: "Everyone nearby on this server. Click a party member to focus frames or inspect their gear.",
      target: ".comm-pos-players",
      targetKind: "region",
    },
    {
      section: "Overlay",
      title: "Map & events",
      body: "Server clock chips (serverInfo), closable events list, map name and instance id (mapInfo).",
      target: ".comm-pos-serverInfo, .comm-pos-mapInfo, .comm-pos-events",
      targetKind: "region",
    },
    {
      section: "Overlay",
      title: "Combat meters",
      body: "Optional rank windows for damage, healing, and fight history.",
      // Union DPS ‖ HPS (and any other rank windows) — not the single
      // top-of-stack shell the meters tour uses for a just-added window.
      target: ".ecu-meter-shell:not(.is-inspector):not(.is-report)",
      targetKind: "region",
      missingHint: "No meter yet. The next step shows how to add one.",
    },
    {
      section: "Overlay",
      title: "Add a meter",
      body: "Pick damage, healing, interrupts, deaths, or Adventure Land stats.",
      target: '[data-ecu-tour="btn-add-meter"]',
      targetKind: "button",
      enter: { meterAddOpen: true },
      exit: { meterAddOpen: false },
    },
    {
      section: "Overlay",
      title: "PDPS",
      body: "Under Adventure Land in the add dialog. Live party-DPS snapshot during combat.",
      target: '[data-ecu-tour="preset-pdps"]',
      targetKind: "button",
      missingHint: "Tap + Meter to open the preset list.",
      enter: { meterAddOpen: true },
      exit: { meterAddOpen: false },
    },
    {
      section: "Overlay",
      title: "Kill counter",
      body: "Session kill KPI in a compact strip. Change scope in the panel header.",
      target: ".comm-pos-panel.comm-pos-kills",
      targetKind: "panel",
      enter: { closeBag: true, closeCommand: true },
    },
    {
      section: "Overlay",
      title: "You're set",
      body: "Explore at your own pace. Short tours still appear for layout mode, meter tools, paperdoll, Market, Bank, buffs, and combat panels, each only once. Replay any tour from Settings → Comm UI.",
      target: ".comm-pos-toggles",
      targetKind: "region",
    },
  ],
};

const LAYOUT_TOUR: GuidedTourDef = {
  id: "layout",
  label: "Layout edit",
  prepare: { layoutEdit: true },
  steps: [
    {
      title: "Layout mode",
      body: "Every panel is visible so you can move them. It looks crowded at first. Pick one panel, drag its header, then adjust anchors and opacity below.",
      target: ".comm-pos-edit-header",
    },
    {
      title: "Anchor pad",
      body: "The 3×3 pad sets stretch direction: which corner stays fixed when the window grows.",
      target: ".comm-pos-anchor-pad",
      missingHint: "Anchor pad is on each panel header in layout mode.",
    },
    {
      title: "Opacity & hide",
      body: "Slider fades a panel. × hides closable panels (command, threat, meters…) without deleting your layout.",
      target: ".comm-pos-opacity-row",
      missingHint: "Opacity slider appears on panel headers in layout mode.",
    },
  ],
};

const METERS_TOUR: GuidedTourDef = {
  id: "meters",
  label: "Combat meters",
  prepare: { showMeters: true, testBars: true },
  steps: [
    {
      title: "Meter window",
      body: "Each window tracks its own metric. Drag the titlebar (Alt) to move without layout mode. Empty PDPS/coop stay visible while unlocked. Lock them to auto-hide until data, or use Layout to place.",
      // Prefer the meter that triggered the tour (just-added); never union all shells.
      target: '.ecu-meter-shell[data-ecu-tour-focus="1"]',
      targetKind: "button",
      missingHint: "Add a meter from the control strip first.",
    },
    {
      title: "Bar rows",
      body: "Click a row for Inspector (spells, targets). Right-click the body for bookmark slots. Empty windows show “No data” until combat fills them.",
      target: '.ecu-meter-shell[data-ecu-tour-focus="1"] .ecu-meter-body',
      targetKind: "button",
      missingHint: "Add a meter window first.",
    },
    {
      title: "Toolbar overview",
      body: "Right-side icons: Mode · Segment · Attribute · Report · Reset. Hover for menus. A toolbar tour appears when you first open one.",
      target: '.ecu-meter-shell[data-ecu-tour-focus="1"] .ecu-meter-titlebar',
      targetKind: "button",
      missingHint: "Add a meter window first.",
    },
    {
      title: "Status bar",
      body: "Segment timer and DPS/HPS readout along the bottom.",
      target: '.ecu-meter-shell[data-ecu-tour-focus="1"] .ecu-meter-statusbar',
      targetKind: "button",
      missingHint: "Add a meter window first.",
      enter: { testBars: false },
    },
  ],
};

const METER_TOOLBAR_TOUR: GuidedTourDef = {
  id: "meter-toolbar",
  label: "Meter toolbar",
  prepare: { showMeters: true },
  steps: [
    {
      title: "Mode",
      body: "Who appears (party scope), Plugins (Encounter / Deaths / Timeline), Window Control, and Options. That is the Mode menu.",
      target: '[data-ecu-tour="meter-gear"]',
    },
    {
      title: "Segment",
      body: "Fight history. Click older or newer segments. Hover for wipe/kill markers.",
      target: '[data-ecu-tour="meter-segment"]',
    },
    {
      title: "Attribute",
      body: "Switch Damage Done / DPS / Healing / Taken. Right-click for the full display grid.",
      target: '[data-ecu-tour="meter-display"]',
      missingHint: "Rank-based meters only. Snapshot meters omit this button.",
    },
    {
      title: "Report",
      body: "Copy fight summaries or open the report dialog. Reset is the last icon.",
      target: '[data-ecu-tour="meter-report"]',
      missingHint: "Rank-based meters only.",
    },
    {
      title: "Resize",
      body: "Corner grips free-resize the frame. Stretch ↕ on the titlebar toggles taller height. After fights, skull/play badges on the titlebar open Encounter / Timeline.",
      target: ".ecu-meter-resize",
      missingHint: "Unlock meters or enter layout edit to see resize grips.",
    },
  ],
};

const COMBAT_TOUR: GuidedTourDef = {
  id: "combat",
  label: "Combat panels",
  steps: [
    {
      title: "Enemies",
      body: "Nearby monsters for quick targeting. Click a bar, or the also-N trash line.",
      target: ".comm-pos-enemies",
      missingHint: "Appears when monsters are nearby.",
    },
    {
      title: "Threat table",
      body: "Who mobs are attacking. Click a row to target that player.",
      target: ".comm-pos-threat",
      missingHint: "Shows during combat when threat data exists.",
    },
    {
      title: "Boss bar",
      body: "Large HP bar during boss fights. Click to target the boss.",
      target: ".comm-pos-bossBar",
      missingHint: "Appears during boss encounters.",
    },
  ],
};

const COOP_TOUR: GuidedTourDef = {
  id: "coop",
  label: "s.coop meter",
  steps: [
    {
      title: "s.coop meter",
      body: "Tracks shared kill participation (s.coop) for party members on this server. v1 is raw points share; v2 uses the server award curve (points^0.65). Add from + Meter → Adventure Land. The window only appears once someone has coop data.",
      target: '[data-ecu-tour="meter-coop"]',
      missingHint: "Coop panels hide until participation data exists.",
    },
  ],
};

/** First open of the paperdoll (gear / stats inspect panel). */
const PAPERDOLL_TOUR: GuidedTourDef = {
  id: PAPERDOLL_TOUR_ID,
  label: "Paperdoll",
  steps: [
    {
      title: "Paperdoll",
      body: "Vitals, stats, and gear for whoever you clicked. Opens from a unit frame, party chip, or world click. Close with × or Esc.",
      target: ".comm-pos-paperdoll",
      targetKind: "panel",
      missingHint:
        "Click a player frame, party member, or entity to open the paperdoll.",
    },
    {
      title: "Gear",
      body: "Equipped slots live here. Click any filled slot to open Item info. The tour continues when you do.",
      target: '[data-ecu-tour="paperdoll-gear"]',
      targetKind: "region",
      missingHint: "Click a filled gear slot on the paperdoll.",
      advanceWhen: "itemInfoOpen",
    },
    {
      title: "Item info",
      body: "Stock item details park in this panel: stats, lore, grade. It stays here so you can compare while looking at gear.",
      target: ".comm-pos-itemInfo",
      targetKind: "panel",
      missingHint: "Click a filled gear slot if Item info is not open yet.",
    },
  ],
};

/**
 * Market hub — first open of the Market panel (chrome or merchant inspect).
 */
export const MARKET_TOUR_ID = "market";

const MARKET_TOUR: GuidedTourDef = {
  id: MARKET_TOUR_ID,
  label: "Market hub",
  prepare: { openMarket: true },
  steps: [
    {
      section: "Market",
      title: "Market hub",
      body: "Three columns: You (bag + stand), item grid, Focus. Open from the chrome Market button, or by inspecting a merchant with a stand.",
      target: '[data-ecu-tour="market-panel"]',
      targetKind: "region",
      missingHint: "Open Market from the chrome strip, or inspect a merchant stand.",
      enter: { openMarket: true },
    },
    {
      section: "Market",
      title: "Observe a character",
      body: "Bag and stand need a watched character. Click a chip in the strip below. The tour continues when you are observing.",
      target: '[data-ecu-tour="character-ui"]',
      targetKind: "region",
      missingHint: "Click any character chip in the strip below.",
      advanceWhen: "observing",
      enter: { refreshHud: true, openMarket: true },
    },
    {
      section: "Market",
      title: "You: bag & stand",
      body: "Select a bag stack, then List, Giveaway, Deposit, or Buy order. Deposit travels to the vault when needed. Drop onto the stand to list. Shift+drop for giveaway.",
      target: '[data-ecu-tour="market-you"]',
      targetKind: "region",
      missingHint: "Open Market. The You column is on the left.",
    },
    {
      section: "Market",
      title: "Search & filters",
      body: "Selling, Buying, Giveaways. Near keeps live entities. Search takes item:, merchant:, is:sell, and the same style as Bank.",
      target: '[data-ecu-tour="market-tools"]',
      targetKind: "region",
      missingHint: "Open Market. Search sits under the header.",
    },
    {
      section: "Market",
      title: "Pick an item",
      body: "Cards show sell / buy / giveaway counts and best prices. Click one to fill Focus. The tour advances when Focus has an item. ★ favorites; Arb sorts by buy−sell spread.",
      target: '[data-ecu-tour="market-grid"]',
      targetKind: "region",
      missingHint: "Click any item card in the Market grid.",
      advanceWhen: "marketFocus",
    },
    {
      section: "Market",
      title: "Focus offers",
      body: "In range: Buy, Sell, or Join. Out of range: Travel. ⋯ or right-click for Mirror / Undercut on foreign sales, Reprice / Delist on yours. Shift+click Buy/Sell takes the full stack when it can.",
      target: '[data-ecu-tour="market-focus"]',
      targetKind: "region",
      missingHint: "Pick an item card, bag stack, or stand slot to fill Focus.",
    },
  ],
};

/** Account Bank — first open of the Bank panel. */
export const BANK_TOUR_ID = "bank";

const BANK_TOUR: GuidedTourDef = {
  id: BANK_TOUR_ID,
  label: "Account Bank",
  prepare: { openBank: true },
  steps: [
    {
      section: "Bank",
      title: "Account Bank",
      body: "Shared account vault, not one character's bag. Open from the chrome Bank button. The header shows gold and how stale the last load is.",
      target: '[data-ecu-tour="bank-panel"]',
      targetKind: "region",
      missingHint: "Open Bank from the chrome strip.",
      enter: { openBank: true },
    },
    {
      section: "Bank",
      title: "Observe a character",
      body: "Withdraw and deposit run on the watched character. Click a chip below. The tour continues when you are observing.",
      target: '[data-ecu-tour="character-ui"]',
      targetKind: "region",
      missingHint: "Click any character chip in the strip below.",
      advanceWhen: "observing",
      enter: { refreshHud: true, openBank: true },
    },
    {
      section: "Bank",
      title: "Refresh",
      body: "Reloads the vault from the server. When something changed, a strip lists Added / Removed / ±qty with All · Gear · Quantity filters.",
      target: '[data-ecu-tour="bank-refresh"]',
      targetKind: "button",
      missingHint: "Open Bank. Refresh sits in the header.",
      enter: { openBank: true },
    },
    {
      section: "Bank",
      title: "Search",
      body: "Same style as Market: item:, type:, pack:, title:, level:, is:compound|upgrade|craft|exchange, OR and negation. Suggestions appear while you type.",
      target: '[data-ecu-tour="bank-search"]',
      targetKind: "region",
      missingHint: "Open Bank. Search sits under the header.",
      enter: { openBank: true },
    },
    {
      section: "Bank",
      title: "Views",
      body: "All merges stacks across packs. Packs shows each vault board. Types groups by item type. Ready lists Combine and Craft you can finish from bank + bag.",
      target: '[data-ecu-tour="bank-views"]',
      targetKind: "region",
      missingHint: "Open Bank. View tabs sit under search.",
      enter: { openBank: true, bankView: "all" },
    },
    {
      section: "Bank",
      title: "Packs",
      body: "Every vault pack as a slot board (like the explorer). Search dims non-matches. Click a stack to inspect; right-click to withdraw.",
      target: '[data-ecu-tour="bank-body"]',
      targetKind: "region",
      missingHint: "Open Bank and switch to Packs.",
      enter: { openBank: true, bankView: "packs" },
    },
    {
      section: "Bank",
      title: "Ready",
      body: "Combine and Craft tabs, Ready vs Almost. Recipe cards show result ← inputs from bank + bag stock.",
      target: '[data-ecu-tour="bank-body"]',
      targetKind: "region",
      missingHint: "Open Bank and switch to Ready.",
      enter: { openBank: true, bankView: "ready" },
    },
    {
      section: "Bank",
      title: "Sort",
      body: "On All and Types: Category, Quantity, or Stack. Packs and Ready hide sort because layout is fixed.",
      target: '[data-ecu-tour="bank-sort"]',
      targetKind: "region",
      missingHint: "Open Bank on All or Types to see sort.",
      enter: { openBank: true, bankView: "all" },
    },
    {
      section: "Bank",
      title: "Browse & withdraw",
      body: "Click or right-click a stack to pull it into the watched bag. Away from the vault, the character travels there first.",
      target: '[data-ecu-tour="bank-body"]',
      targetKind: "region",
      missingHint: "Open Bank. The item grid fills the body.",
      enter: { openBank: true, bankView: "all" },
    },
  ],
};

/** Buff / condition info — from unit or party frame icons. */
const BUFF_INFO_TOUR: GuidedTourDef = {
  id: "buff-info",
  label: "Buff info",
  steps: [
    {
      title: "Buff info",
      body: "Stock condition details for the buff you clicked: what it does and how long it lasts.",
      target: ".comm-pos-buffInfo",
      targetKind: "panel",
      missingHint: "Click a buff icon on a unit or party frame.",
    },
    {
      title: "Where to click",
      body: "Buff and condition icons on player/target frames and party chips open this panel. Click another icon anytime to switch.",
      target: '[data-ecu-tour="buff-icons"]',
      targetKind: "region",
      missingHint:
        "Buff icons appear under unit frames and on party chips when someone has effects.",
    },
  ],
};

export const GUIDED_TOURS: GuidedTourDef[] = [
  INTRO_TOUR,
  LAYOUT_TOUR,
  METERS_TOUR,
  METER_TOOLBAR_TOUR,
  COOP_TOUR,
  COMBAT_TOUR,
  PAPERDOLL_TOUR,
  MARKET_TOUR,
  BANK_TOUR,
  BUFF_INFO_TOUR,
];

/** First-run spotlight from the setup wizard. */
export const INTRO_TOUR_CHAIN = [INTRO_TOUR_ID];

export type GuidedTourListItem = {
  id: string;
  label: string;
  completed: boolean;
};

/** Settings list — every registered tour with completion state. */
export function listGuidedTours(): GuidedTourListItem[] {
  const out: GuidedTourListItem[] = [];
  for (let i = 0; i < GUIDED_TOURS.length; i++) {
    const t = GUIDED_TOURS[i];
    out.push({
      id: t.id,
      label: t.label,
      completed: isTourCompleted(t.id),
    });
  }
  return out;
}

export function tourById(id: string): GuidedTourDef | null {
  for (let i = 0; i < GUIDED_TOURS.length; i++) {
    if (GUIDED_TOURS[i].id === id) return GUIDED_TOURS[i];
  }
  return null;
}

export function tourPrepare(id: string): TourPrepare {
  const tour = tourById(id);
  return tour?.prepare || {};
}

export function isTourCompleted(id: string): boolean {
  const done = getSettings().toursCompleted || {};
  return !!done[id];
}

export function markTourCompleted(id: string): void {
  const prev = getSettings().toursCompleted || {};
  patchSettings({ toursCompleted: { ...prev, [id]: true } });
}

/** Clear a completion flag (Settings Replay / Reset). */
export function clearTourCompleted(id: string): void {
  const prev = getSettings().toursCompleted || {};
  if (!prev[id]) return;
  const next: Record<string, boolean> = {};
  const keys = Object.keys(prev);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k === id) continue;
    next[k] = prev[k];
  }
  patchSettings({ toursCompleted: next });
}

/** Map old completion flags from earlier tour shapes. */
export function migrateLegacyTourFlags(): void {
  const done = getSettings().toursCompleted || {};
  const next = { ...done };
  let changed = false;
  if (done.full && !done[INTRO_TOUR_ID]) {
    next[INTRO_TOUR_ID] = true;
    changed = true;
  }
  if (done.toggles && done.party && done.meters && !done[INTRO_TOUR_ID]) {
    next[INTRO_TOUR_ID] = true;
    changed = true;
  }
  // Buff-era `paperdoll` → gear/item rewrite at PAPERDOLL_TOUR_ID.
  // `paperdoll-gear-v1` meant they already saw the rewrite under the old id.
  if (!done[PAPERDOLL_TOUR_ID] && done["paperdoll-gear-v1"]) {
    next[PAPERDOLL_TOUR_ID] = true;
    changed = true;
  }
  if (done.paperdoll != null) {
    delete next.paperdoll;
    changed = true;
  }
  if (done["paperdoll-gear-v1"] != null) {
    delete next["paperdoll-gear-v1"];
    changed = true;
  }
  // Drop old merchant / paperdoll-trade flags — Market hub tour is a new id
  // so users who only saw the thin predecessor still get the expanded tour once.
  if (done["paperdoll-trade"] != null) {
    delete next["paperdoll-trade"];
    changed = true;
  }
  if (done.merchant != null) {
    delete next.merchant;
    changed = true;
  }
  if (changed) patchSettings({ toursCompleted: next });
}
