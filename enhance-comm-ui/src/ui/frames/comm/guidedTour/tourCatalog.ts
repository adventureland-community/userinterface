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
      body: "Click a character chip — party frames, meters, and the action bar all follow whoever is highlighted. Click the active chip again to stop observing.",
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
      body: "Follow centers the camera, Bag opens inventory, Command sends CODE — all for whoever you are observing.",
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
      body: "Turn this on to drag panels into place. Every panel appears at once so you can position them — it looks busy, and that's normal. A short layout tour runs the first time you enable it.",
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
      body: "In-game map plus server clock and live/world events at the top of the overlay.",
      target: ".comm-pos-topCenter",
      targetKind: "region",
    },
    {
      section: "Overlay",
      title: "Combat meters",
      body: "Optional rank windows for damage, healing, and fight history.",
      target: ".ecu-meter-shell",
      targetKind: "region",
      missingHint: "No meter yet — the next step shows how to add one.",
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
      body: "Under Adventure Land in the add dialog — live party-DPS snapshot during combat.",
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
      body: "Explore at your own pace. Short tours still appear for layout mode, meter tools, paperdoll, trade slots, buffs, and combat panels — each only once.",
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
      body: "Every panel is visible so you can move them — it looks crowded at first. Pick one panel, drag its header, then adjust anchors and opacity below.",
      target: ".comm-pos-edit-header",
    },
    {
      title: "Anchor pad",
      body: "The 3×3 pad sets stretch direction — which corner stays fixed when the window grows.",
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
      body: "Each window tracks its own metric. Drag the titlebar (Alt) to move without layout mode.",
      target: ".ecu-meter-shell",
      missingHint: "Add a meter from the control strip first.",
    },
    {
      title: "Bar rows",
      body: "Click a row for Inspector (spells, targets). Right-click the body for bookmark slots.",
      target: ".ecu-meter-body",
      missingHint: "Add a meter window first.",
    },
    {
      title: "Toolbar overview",
      body: "Right-side icons: Mode · Segment · Attribute · Report · Reset. Hover for menus — a toolbar tour appears when you first open one.",
      target: ".ecu-meter-titlebar",
      missingHint: "Add a meter window first.",
    },
    {
      title: "Status bar",
      body: "Segment timer and DPS/HPS readout along the bottom.",
      target: ".ecu-meter-statusbar",
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
      body: "Who appears (party scope), Plugins (Encounter / Deaths / Timeline), Window Control, and Options — the Mode menu.",
      target: '[data-ecu-tour="meter-gear"]',
    },
    {
      title: "Segment",
      body: "Fight history — click older/newer segments. Hover for wipe/kill markers.",
      target: '[data-ecu-tour="meter-segment"]',
    },
    {
      title: "Attribute",
      body: "Switch Damage Done / DPS / Healing / Taken. Right-click for the full display grid.",
      target: '[data-ecu-tour="meter-display"]',
      missingHint: "Rank-based meters only — snapshot meters omit this button.",
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
      body: "Nearby monsters for quick targeting — click a row to select.",
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
      body: "Large HP bar during boss fights — click to target the boss.",
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
      body: "Tracks shared kill participation (s.coop) for party members on this server. v1 and v2 use different formulas — add from + Meter → Adventure Land. The window only appears once someone has coop data.",
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
      body: "Equipped slots live here. Click any filled slot to open Item info — the tour continues when you do.",
      target: '[data-ecu-tour="paperdoll-gear"]',
      targetKind: "region",
      missingHint: "Click a filled gear slot on the paperdoll.",
      advanceWhen: "itemInfoOpen",
    },
    {
      title: "Item info",
      body: "Stock item details park in this panel — stats, lore, grade. It stays here so you can compare while looking at gear.",
      target: ".comm-pos-itemInfo",
      targetKind: "panel",
      missingHint: "Click a filled gear slot if Item info is not open yet.",
    },
  ],
};

/**
 * Trade-slot add-on for the paperdoll — first time you inspect someone
 * with filled trade listings (merchant or player stand). Independent of
 * the base paperdoll tour: finishing paperdoll does not skip this.
 */
const PAPERDOLL_TRADE_TOUR: GuidedTourDef = {
  id: "paperdoll-trade",
  label: "Paperdoll · trade slots",
  steps: [
    {
      title: "Trade slots",
      body: "This paperdoll has a TRADE row under gear — shop listings with prices (merchants and player stands).",
      target: '[data-ecu-tour="paperdoll-trade"]',
      targetKind: "region",
      missingHint:
        "Inspect a merchant or player stand that has trade items listed.",
    },
    {
      title: "Inspect a listing",
      body: "Click a trade item to open Item info — same panel as equipped gear. The tour continues when you do.",
      target: '[data-ecu-tour="paperdoll-trade"]',
      targetKind: "region",
      missingHint: "Click a filled trade slot.",
      advanceWhen: "itemInfoOpen",
    },
    {
      title: "Item info",
      body: "Listing details park here so you can compare while browsing the paperdoll.",
      target: ".comm-pos-itemInfo",
      targetKind: "panel",
      missingHint: "Click a filled trade slot if Item info is not open yet.",
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
      body: "Stock condition details for the buff you clicked — what it does and how long it lasts.",
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
  PAPERDOLL_TRADE_TOUR,
  BUFF_INFO_TOUR,
];

/** First-run spotlight from the setup wizard. */
export const INTRO_TOUR_CHAIN = [INTRO_TOUR_ID];

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
  // Renamed merchant tour → paperdoll-trade (trade slots only; not base paperdoll).
  if (done.merchant && !done["paperdoll-trade"]) {
    next["paperdoll-trade"] = true;
    delete next.merchant;
    changed = true;
  }
  if (changed) patchSettings({ toursCompleted: next });
}
