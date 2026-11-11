/**
 * Upgrade / Compound shrine dialog — Discord-style trial card + bag highlights.
 * Chance is a rough local ~estimate from the current picks.
 */

import type { ItemFingerprint } from "../../host/mail/types";
import { getObserving, resolvePlayerCtype } from "../../host/al";
import {
  isBagRefreshing,
  refreshObservedInventory,
} from "../../host/inventory";
import {
  getG,
  observingBagItems,
  observingGold,
} from "../../host/stationCommands";
import {
  compoundOfferForBagItem,
  defaultCompoundPartners,
  findShrinePickById,
  formatShrineBatchSummary,
  npcBuyPriceForItem,
  planShrineBatch,
  shrinePickId,
  upgradeOfferForBagItem,
  type BagSlotRef,
  type CompoundFromBagOffer,
  type OfferingPick,
  type ScrollPick,
  type ShrineBatchPlan,
  type UpgradeFromBagOffer,
} from "../../lib/bagUpgradeCompound";
import { itemInstanceHtml, itemInstanceLabel } from "../../lib/gameIcon";
import {
  getLuckyUpgradePref,
  luckyUpgradeCharKey,
  LUCKY_SLOT_MAX_DEFAULT,
  normalizeLuckySlot,
  setLuckyUpgradePref,
  type LuckyUpgradePref,
} from "../../lib/luckyUpgradePrefs";
import {
  estimateShrineChance,
  formatApproxChancePct,
} from "../../lib/shrineChanceEstimate";
import {
  countNameLevel,
  evaluateShrineBagWatch,
  itemTitleKey,
  listBagSlotsAtNameLevelTitle,
} from "../../lib/shrineOutcomeWatch";
import { resolveInventorySlotNum } from "./bagItemContextMenu";
import {
  clearShrineBagHighlights,
  setShrineBagHighlights,
  setShrineLuckySlotHighlight,
} from "./shrineBagHighlight";
import { ensureUpgradeCompoundDialogCss } from "./upgradeCompoundDialogCss";

export type ShrineSkillPicks = {
  massproduction?: boolean;
  massproductionpp?: boolean;
};

export type UpgradeDialogResult = {
  item: ItemFingerprint;
  scroll: ItemFingerprint | null;
  offering: ItemFingerprint | null;
  /** Vendor-buy scroll name — Confirm runs buy() first. */
  buyScroll?: string | null;
  buyOffering?: string | null;
  skills?: ShrineSkillPicks;
  /** Per-character lucky slot (swap target in before shrine). */
  lucky?: LuckyUpgradePref;
};

export type CompoundDialogResult = {
  items: [ItemFingerprint, ItemFingerprint, ItemFingerprint];
  scroll: ItemFingerprint;
  offering: ItemFingerprint | null;
  buyScroll?: string | null;
  buyOffering?: string | null;
  skills?: ShrineSkillPicks;
};

/** Session defaults for merchant shrine skill checkboxes. */
let shrineSkillMassproduction = true;
let shrineSkillMassproductionPp = true;
/** Session default — batch all same name+level copies one by one. */
let shrineBatchMode = false;
/** When batch is on: buy more of the selected scroll/offering from NPC after bag stock. */
let shrineBatchBuyExtras = false;

function bagItemLocked(it: {
  l?: unknown;
} | null | undefined): boolean {
  return !!(it && it.l != null && it.l !== false && it.l !== 0);
}

export type UpgradeDialogOptions = {
  /** Run the character command and keep the dialog open for another try. */
  execute?: (picked: UpgradeDialogResult) => boolean;
};

export type CompoundDialogOptions = {
  execute?: (picked: CompoundDialogResult) => boolean;
};

type PickFocus = "scroll" | "offering" | "partner" | null;

let openBackdrop: HTMLDivElement | null = null;
let finishOpen: ((value: unknown) => void) | null = null;
let onDialogCleanup: (() => void) | null = null;

function closeDialog(value: unknown): void {
  const cleanup = onDialogCleanup;
  onDialogCleanup = null;
  if (cleanup) {
    try {
      cleanup();
    } catch {
      /* ignore */
    }
  }
  clearShrineBagHighlights();
  const finish = finishOpen;
  finishOpen = null;
  if (openBackdrop) {
    openBackdrop.remove();
    openBackdrop = null;
  }
  finish?.(value);
}

function fpFromPick(pick: {
  slot: number;
  name: string;
  q?: number;
  level?: number;
  p?: string | null;
}): ItemFingerprint {
  const fp: ItemFingerprint = { slot: pick.slot, name: pick.name };
  if (pick.q != null) fp.q = pick.q;
  if (pick.level != null) fp.level = pick.level;
  if (pick.p != null) fp.p = String(pick.p);
  return fp;
}

function accessHint(
  access: {
    ok: boolean;
    hasComputer: boolean;
    inRange: boolean;
    reason?: string;
  },
  opts?: { buying?: boolean },
): string {
  const buying = !!(opts && opts.buying);
  if (access.hasComputer) {
    return buying
      ? "Computer — buy + shrine work on any map."
      : "Computer — works on any map.";
  }
  if (buying) {
    return access.inRange
      ? "Confirm buys at the vendor (travel if needed), then the shrine."
      : "Confirm will buy at the vendor, then smart_move to the shrine.";
  }
  if (access.inRange) return "In range of the shrine.";
  if (access.reason) return access.reason + " — Confirm will travel first.";
  return "Out of range — Confirm will smart_move to the shrine first.";
}

function formatBuyGold(n: number): string {
  if (n >= 1_000_000) return Math.floor(n / 1_000_000) + "m";
  if (n >= 10_000) return Math.floor(n / 1000) + "k";
  return String(n);
}

function mountItemIcon(
  host: HTMLElement,
  opts: {
    name: string;
    level?: number;
    q?: number;
    p?: string | null;
    size: number;
  },
): void {
  // bare: avoid nested item_container border/space that overflows our tiles.
  const html = itemInstanceHtml(opts.name, {
    level: opts.level,
    // Tile chrome paints its own ×qty — don't nest stock q pip.
    p: opts.p != null ? String(opts.p) : undefined,
    size: opts.size,
    nativeTitle: true,
    bare: true,
  });
  host.innerHTML = html || "";
  const stockBadges = host.querySelectorAll(".iqui, .iuui");
  for (let i = 0; i < stockBadges.length; i++) {
    (stockBadges[i] as HTMLElement).style.display = "none";
  }
}

function levelPlus(level: number | undefined | null): string {
  const lv = level != null && Number.isFinite(Number(level)) ? Number(level) : 0;
  return "+" + lv;
}

function stripTrailingLevelSuffix(name: string): string {
  return String(name || "").replace(/\s*\+\d+\s*$/, "").trim();
}

function levelTransitionLabel(
  fromLevel: number | undefined | null,
  displayName: string,
): string {
  const from =
    fromLevel != null && Number.isFinite(Number(fromLevel))
      ? Number(fromLevel)
      : 0;
  const base = stripTrailingLevelSuffix(displayName) || displayName;
  return levelPlus(from) + " → " + levelPlus(from + 1) + " " + base;
}

type TrialCard = {
  root: HTMLDivElement;
  result: HTMLDivElement;
  resultLevel: HTMLSpanElement;
  inputIcons: HTMLDivElement;
  usedIcons: HTMLDivElement;
  chanceVal: HTMLSpanElement;
  chanceDetail: HTMLSpanElement;
  chanceNote: HTMLSpanElement;
  chanceBox: HTMLDivElement;
};

const CHANCE_TITLE =
  "Rough ~estimate from local tables — not live calculate(). Exact odds only on the character client.";

type BagWatchHandle = { cancel: () => void };

function observingIsMerchant(): boolean {
  try {
    const obs = getObserving() || window.observing;
    if (!obs) return false;
    const id =
      obs.id != null
        ? String(obs.id)
        : obs.name != null
          ? String(obs.name)
          : undefined;
    // Live entities: class is `ctype`. `type` is entity kind ("character"), not class.
    const ctype = resolvePlayerCtype(id, obs);
    return ctype === "merchant";
  } catch {
    return false;
  }
}

type MerchantSkillChecks = {
  root: HTMLDivElement;
  read: () => ShrineSkillPicks;
};

function makeMerchantSkillChecks(): MerchantSkillChecks | null {
  if (!observingIsMerchant()) return null;
  const root = document.createElement("div");
  root.className = "ecu-upg__skills";
  const label = document.createElement("div");
  label.className = "ecu-upg__section-label";
  label.textContent = "Merchant skills";
  root.appendChild(label);
  const row = document.createElement("div");
  row.className = "ecu-upg__skills-row";

  const mk = (id: string, text: string, initial: boolean) => {
    const wrap = document.createElement("label");
    wrap.className = "ecu-upg__skill";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = initial;
    input.setAttribute("data-skill", id);
    const span = document.createElement("span");
    span.textContent = text;
    wrap.appendChild(input);
    wrap.appendChild(span);
    wrap.title = "Cast before upgrade/compound if the buff is not already up";
    row.appendChild(wrap);
    return input;
  };
  const mass = mk("massproduction", "Mass Production", shrineSkillMassproduction);
  const massPp = mk(
    "massproductionpp",
    "Mass Production PP",
    shrineSkillMassproductionPp,
  );
  mass.addEventListener("change", () => {
    shrineSkillMassproduction = mass.checked;
  });
  massPp.addEventListener("change", () => {
    shrineSkillMassproductionPp = massPp.checked;
  });
  root.appendChild(row);
  return {
    root,
    read: () => ({
      massproduction: mass.checked,
      massproductionpp: massPp.checked,
    }),
  };
}

type BatchModeCheck = {
  root: HTMLDivElement;
  read: () => boolean;
  readBuyExtras: () => boolean;
  setPlanSummary: (summary: string, detail: string) => void;
  /** Show/enable the buy-extras row when batch is on and picks are NPC-buyable. */
  syncBuyExtras: (opts: {
    batchOn: boolean;
    canBuyExtras: boolean;
  }) => void;
};

type LuckySlotCheck = {
  root: HTMLDivElement;
  read: () => LuckyUpgradePref;
  /** Sync bag outline for the lucky slot. */
  syncHighlight: () => void;
};

function bagLenForLucky(): number {
  const bag = observingBagItems();
  if (bag && bag.length > 0) return bag.length - 1;
  return LUCKY_SLOT_MAX_DEFAULT;
}

function luckyMetaSuffix(): string {
  const pref = getLuckyUpgradePref();
  if (!pref.enabled) return "";
  return " · 🍀 slot " + pref.slot;
}

/**
 * Per-character lucky inventory slot — persisted; swap-before-shrine when on.
 */
function makeLuckySlotCheck(opts: { onChange: () => void }): LuckySlotCheck {
  const charKey = luckyUpgradeCharKey();
  const initial = getLuckyUpgradePref(charKey);
  const maxSlot = bagLenForLucky();

  const root = document.createElement("div");
  root.className = "ecu-upg__skills ecu-upg__lucky";
  const label = document.createElement("div");
  label.className = "ecu-upg__section-label";
  label.textContent = charKey
    ? "🍀 Lucky slot · " + charKey
    : "🍀 Lucky slot";
  root.appendChild(label);

  const row = document.createElement("div");
  row.className = "ecu-upg__skills-row ecu-upg__lucky-row";

  const wrap = document.createElement("label");
  wrap.className = "ecu-upg__skill";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = initial.enabled;
  enabled.setAttribute("data-lucky-enabled", "1");
  const span = document.createElement("span");
  span.textContent = "Use lucky slot";
  wrap.title =
    "Swap the item into this bag index before upgrade (community lucky-slot practice). Saved per character.";
  wrap.appendChild(enabled);
  wrap.appendChild(span);
  row.appendChild(wrap);

  const slotWrap = document.createElement("label");
  slotWrap.className = "ecu-upg__lucky-slot";
  const slotLab = document.createElement("span");
  slotLab.textContent = "Slot";
  const slotInput = document.createElement("input");
  slotInput.type = "number";
  slotInput.min = "0";
  slotInput.max = String(maxSlot);
  slotInput.step = "1";
  slotInput.value = String(normalizeLuckySlot(initial.slot, maxSlot));
  slotInput.setAttribute("data-lucky-slot", "1");
  slotInput.title = "0-based inventory index (same as bag data-cnum)";
  slotWrap.appendChild(slotLab);
  slotWrap.appendChild(slotInput);
  row.appendChild(slotWrap);

  const hint = document.createElement("div");
  hint.className = "ecu-upg__lucky-hint";
  root.appendChild(row);
  root.appendChild(hint);

  const persistAndPaint = () => {
    const max = bagLenForLucky();
    slotInput.max = String(max);
    const slot = normalizeLuckySlot(slotInput.value, max);
    slotInput.value = String(slot);
    const pref = setLuckyUpgradePref(
      { enabled: enabled.checked, slot },
      charKey,
    );
    slotInput.disabled = !pref.enabled;
    hint.textContent = pref.enabled
      ? "Will swap into bag slot " + pref.slot + " before upgrade."
      : "Off — upgrade uses the item’s current bag slot.";
    setShrineLuckySlotHighlight(pref.enabled ? pref.slot : null);
    opts.onChange();
  };

  enabled.addEventListener("change", persistAndPaint);
  slotInput.addEventListener("change", persistAndPaint);
  slotInput.addEventListener("input", () => {
    // Live outline while typing; persist on change/blur.
    if (!enabled.checked) return;
    const max = bagLenForLucky();
    const slot = normalizeLuckySlot(slotInput.value, max);
    setShrineLuckySlotHighlight(slot);
  });

  persistAndPaint();

  return {
    root,
    read: () => {
      const max = bagLenForLucky();
      return {
        enabled: enabled.checked,
        slot: normalizeLuckySlot(slotInput.value, max),
      };
    },
    syncHighlight: () => {
      const pref = {
        enabled: enabled.checked,
        slot: normalizeLuckySlot(slotInput.value, bagLenForLucky()),
      };
      setShrineLuckySlotHighlight(pref.enabled ? pref.slot : null);
    },
  };
}

/**
 * Batch = run matching copies one shrine action each, capped by scrolls/offerings.
 * Inventory highlights every peer copy while batch is on.
 */
function makeBatchModeCheck(opts: {
  mode: "upgrade" | "compound";
  onChange: () => void;
}): BatchModeCheck {
  const root = document.createElement("div");
  root.className = "ecu-upg__skills ecu-upg__batch";
  const label = document.createElement("div");
  label.className = "ecu-upg__section-label";
  label.textContent = "Batch";
  root.appendChild(label);
  const row = document.createElement("div");
  row.className = "ecu-upg__skills-row";
  const wrap = document.createElement("label");
  wrap.className = "ecu-upg__skill";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = shrineBatchMode;
  input.setAttribute("data-batch", "1");
  const span = document.createElement("span");
  const verb = opts.mode === "compound" ? "Compound" : "Upgrade";
  span.textContent = "Batch " + verb.toLowerCase();
  wrap.title =
    opts.mode === "compound"
      ? "Run every full set of 3 matching copies, one compound at a time. Highlights peers in the bag."
      : "Upgrade every matching copy one by one. Highlights peers in the bag.";
  wrap.appendChild(input);
  wrap.appendChild(span);
  const count = document.createElement("span");
  count.className = "ecu-upg__batch-count";
  wrap.appendChild(count);
  row.appendChild(wrap);
  root.appendChild(row);

  const buyRow = document.createElement("div");
  buyRow.className = "ecu-upg__skills-row ecu-upg__batch-buy";
  const buyWrap = document.createElement("label");
  buyWrap.className = "ecu-upg__skill";
  const buyInput = document.createElement("input");
  buyInput.type = "checkbox";
  buyInput.checked = shrineBatchBuyExtras;
  buyInput.setAttribute("data-batch-buy", "1");
  const buySpan = document.createElement("span");
  buySpan.textContent = "Buy more scrolls / offerings";
  buyWrap.title =
    "After bag stock runs out, buy the same selected scroll and offering from an NPC until copies or gold run out.";
  buyWrap.appendChild(buyInput);
  buyWrap.appendChild(buySpan);
  buyRow.appendChild(buyWrap);
  buyRow.style.display = "none";
  root.appendChild(buyRow);

  const detail = document.createElement("div");
  detail.className = "ecu-upg__batch-detail";
  root.appendChild(detail);
  input.addEventListener("change", () => {
    shrineBatchMode = input.checked;
    opts.onChange();
  });
  buyInput.addEventListener("change", () => {
    shrineBatchBuyExtras = buyInput.checked;
    opts.onChange();
  });
  return {
    root,
    read: () => input.checked,
    readBuyExtras: () => input.checked && buyInput.checked,
    setPlanSummary: (summary: string, detailText: string) => {
      count.textContent = summary;
      detail.textContent = detailText;
      detail.style.display = detailText ? "" : "none";
    },
    syncBuyExtras: (state) => {
      const show = state.batchOn && state.canBuyExtras;
      buyRow.style.display = show ? "" : "none";
      buyInput.disabled = !show;
      // Keep shrineBatchBuyExtras preference while the row is hidden.
      buyInput.checked = show && shrineBatchBuyExtras;
    },
  };
}

function batchMaterialFromPick(
  pick: ScrollPick | OfferingPick | null,
): {
  name: string;
  displayName: string;
  q: number;
  buy?: boolean;
  buyPrice?: number;
  canBuy?: boolean;
} | null {
  if (!pick) return null;
  const out: {
    name: string;
    displayName: string;
    q: number;
    buy?: boolean;
    buyPrice?: number;
    canBuy?: boolean;
  } = {
    name: pick.name,
    displayName: pick.displayName || pick.name,
    q: pick.q != null ? Number(pick.q) : 1,
  };
  if (pick.buy) {
    out.buy = true;
    if (pick.buyPrice != null) out.buyPrice = Number(pick.buyPrice);
    return out;
  }
  const npcPrice = npcBuyPriceForItem(pick.name, getG());
  if (npcPrice != null && npcPrice > 0) {
    out.canBuy = true;
    out.buyPrice = npcPrice;
  }
  return out;
}

function describeBatchLimit(plan: ShrineBatchPlan): string {
  if (plan.attempts <= 0 && plan.wantAttempts > 0) {
    if (plan.limitedBy === "scroll") return "Not enough scrolls for a batch.";
    if (plan.limitedBy === "offering") {
      return "Not enough offerings for a batch.";
    }
    if (plan.limitedBy === "gold") return "Not enough gold to buy materials.";
    return "Nothing left to batch.";
  }
  if (plan.limitedBy === "scroll") {
    return "Stops early — only " + plan.scrollHave + " scroll(s) in bag.";
  }
  if (plan.limitedBy === "offering") {
    return "Stops early — only " + plan.offeringHave + " offering(s) in bag.";
  }
  if (plan.limitedBy === "gold") {
    return "Stops early — gold only covers " + plan.attempts + " of the batch.";
  }
  if (plan.scrollBuy > 0 || plan.offeringBuy > 0) {
    return "Uses bag stock first, then buys the rest from NPC.";
  }
  return "";
}

function watchLevelBump(opts: {
  name: string;
  fromLevel: number;
  beforeNext: number;
  watchedSlots: number[];
  onSuccess: () => void;
  onDestroyed: () => void;
  onTimeout: () => void;
  onProgress?: () => void;
}): BagWatchHandle {
  let done = false;
  const started = Date.now();
  const timers: number[] = [];
  let sawProgress = false;
  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    for (let i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
    fn();
  };
  const evalWatch = (failureDebounceMs?: number) =>
    evaluateShrineBagWatch({
      items: observingBagItems(),
      name: opts.name,
      fromLevel: opts.fromLevel,
      beforeNext: opts.beforeNext,
      watchedSlots: opts.watchedSlots,
      elapsedMs: Date.now() - started,
      failureDebounceMs,
      // Mid-reconnect bags look empty — do not call that a shrine fail.
      snapshotUnreliable: isBagRefreshing(),
    });
  const poll = () => {
    if (done) return;
    // Read the current observe snapshot only. Full init_socket on every kick
    // stormed reconnects, blanked the bag, and dropped watching.
    const verdict = evalWatch();
    if (verdict === "success") {
      finish(() => opts.onSuccess());
      return;
    }
    if (verdict === "failure") {
      finish(() => opts.onDestroyed());
      return;
    }
    if (verdict === "progress") {
      sawProgress = true;
      if (opts.onProgress) opts.onProgress();
    }
  };
  // At most two observe reconnects for a fresh welcome — not one per kick.
  const refreshKicks = [700, 2800];
  for (let i = 0; i < refreshKicks.length; i++) {
    timers.push(
      window.setTimeout(() => {
        if (done) return;
        try {
          refreshObservedInventory();
        } catch {
          /* best-effort */
        }
      }, refreshKicks[i]),
    );
  }
  const kicks = [500, 1000, 1800, 2800, 4200, 6500, 9000, 12000, 16000];
  for (let i = 0; i < kicks.length; i++) {
    timers.push(window.setTimeout(poll, kicks[i]));
  }
  timers.push(
    window.setTimeout(() => {
      if (done) return;
      // Still rolling (placeholder) — give more time instead of timing out.
      if (sawProgress) {
        try {
          refreshObservedInventory();
        } catch {
          /* best-effort */
        }
        const verdict = evalWatch(4000);
        if (verdict === "success") {
          finish(() => opts.onSuccess());
          return;
        }
        if (verdict === "failure") {
          finish(() => opts.onDestroyed());
          return;
        }
        if (verdict === "progress") {
          timers.push(
            window.setTimeout(() => {
              if (done) return;
              poll();
              if (!done) finish(() => opts.onTimeout());
            }, 8000),
          );
          return;
        }
      }
      finish(() => opts.onTimeout());
    }, 18000),
  );
  return {
    cancel: () => finish(() => {}),
  };
}

function chancePickDetail(
  scroll: ScrollPick | null | undefined,
  offering: OfferingPick | null | undefined,
): string {
  const parts: string[] = [];
  parts.push(scroll ? scroll.name : "no scroll");
  parts.push(offering ? offering.name : "no offering");
  return parts.join(" · ");
}

function makeTrialCard(modeLabel: string): TrialCard {
  const root = document.createElement("div");
  root.className = "ecu-upg__trial";

  const head = document.createElement("div");
  head.className = "ecu-upg__trial-head";
  const status = document.createElement("div");
  status.className = "ecu-upg__trial-status";
  const dot = document.createElement("span");
  dot.className = "ecu-upg__trial-dot";
  const statusText = document.createElement("span");
  statusText.textContent = "Ready";
  status.appendChild(dot);
  status.appendChild(statusText);
  const who = document.createElement("div");
  who.className = "ecu-upg__trial-who";
  who.textContent = modeLabel;
  head.appendChild(status);
  head.appendChild(who);

  const body = document.createElement("div");
  body.className = "ecu-upg__trial-body";

  const result = document.createElement("div");
  result.className = "ecu-upg__trial-result is-empty";
  const resultLevel = document.createElement("span");
  resultLevel.className = "ecu-upg__trial-level";

  const cols = document.createElement("div");
  cols.className = "ecu-upg__trial-cols";

  const inputCol = document.createElement("div");
  const inputLabel = document.createElement("div");
  inputLabel.className = "ecu-upg__trial-col-label";
  inputLabel.textContent = "Input";
  const inputIcons = document.createElement("div");
  inputIcons.className = "ecu-upg__trial-icons";
  inputCol.appendChild(inputLabel);
  inputCol.appendChild(inputIcons);

  const usedCol = document.createElement("div");
  const usedLabel = document.createElement("div");
  usedLabel.className = "ecu-upg__trial-col-label";
  usedLabel.textContent = "Used";
  const usedIcons = document.createElement("div");
  usedIcons.className = "ecu-upg__trial-icons";
  usedCol.appendChild(usedLabel);
  usedCol.appendChild(usedIcons);

  cols.appendChild(inputCol);
  cols.appendChild(usedCol);

  const stats = document.createElement("div");
  stats.className = "ecu-upg__trial-stats";

  const chanceBox = document.createElement("div");
  chanceBox.className = "ecu-upg__stat";
  const chanceLab = document.createElement("span");
  chanceLab.className = "ecu-upg__stat-label";
  chanceLab.textContent = "chance";
  const chanceVal = document.createElement("span");
  chanceVal.className = "ecu-upg__stat-val is-chance";
  chanceVal.textContent = "—";
  chanceVal.title = CHANCE_TITLE;
  const chanceDetail = document.createElement("span");
  chanceDetail.className = "ecu-upg__stat-detail";
  chanceDetail.textContent = "";
  const chanceNote = document.createElement("span");
  chanceNote.className = "ecu-upg__stat-note";
  chanceNote.textContent = "~ local · not calculate";
  chanceNote.title = CHANCE_TITLE;
  chanceBox.appendChild(chanceLab);
  chanceBox.appendChild(chanceVal);
  chanceBox.appendChild(chanceDetail);
  chanceBox.appendChild(chanceNote);
  stats.appendChild(chanceBox);

  body.appendChild(result);
  body.appendChild(cols);
  body.appendChild(stats);
  root.appendChild(head);
  root.appendChild(body);

  return {
    root,
    result,
    resultLevel,
    inputIcons,
    usedIcons,
    chanceVal,
    chanceDetail,
    chanceNote,
    chanceBox,
  };
}

function fillMini(
  host: HTMLElement,
  item:
    | {
        name: string;
        level?: number;
        q?: number;
        p?: string | null;
      }
    | null,
  opts?: {
    showLevel?: boolean;
    /** Show G item id under the slot (USED scroll/offering). */
    showKey?: boolean;
    emptyLabel?: string;
    title?: string;
    focused?: boolean;
    onClick?: () => void;
  },
): void {
  const wrap = document.createElement("div");
  wrap.className = "ecu-upg__mini-wrap";

  const mini = document.createElement("button");
  mini.type = "button";
  mini.className =
    "ecu-upg__mini" +
    (item ? "" : " is-empty") +
    (opts?.focused ? " is-focus" : "") +
    (opts?.onClick ? " is-clickable" : "");
  if (opts?.title) mini.title = opts.title;
  if (!item) {
    mini.textContent = opts?.emptyLabel || "+";
  } else {
    const icon = document.createElement("span");
    mountItemIcon(icon, {
      name: item.name,
      level: item.level,
      q: item.q,
      p: item.p,
      size: 36,
    });
    mini.appendChild(icon);
    if (opts?.showLevel && item.level != null) {
      const lv = document.createElement("span");
      lv.className = "ecu-upg__mini-lv";
      lv.textContent = levelPlus(item.level);
      mini.appendChild(lv);
    }
  }
  if (opts?.onClick) {
    mini.addEventListener("click", (ev) => {
      ev.preventDefault();
      opts.onClick!();
    });
  } else {
    mini.disabled = true;
  }
  wrap.appendChild(mini);
  if (opts?.showKey && item && item.name) {
    const key = document.createElement("span");
    key.className = "ecu-upg__mini-key";
    key.textContent = item.name;
    key.title = item.name;
    wrap.appendChild(key);
  }
  host.appendChild(wrap);
}

function paintTrialResult(
  trial: TrialCard,
  item: {
    name: string;
    level?: number;
    q?: number;
    p?: string | null;
  },
  nextLevel: number,
): void {
  trial.result.innerHTML = "";
  trial.result.classList.remove("is-empty");
  const icon = document.createElement("span");
  mountItemIcon(icon, {
    name: item.name,
    level: nextLevel,
    q: item.q,
    p: item.p,
    size: 56,
  });
  trial.result.appendChild(icon);
  trial.resultLevel.textContent = String(nextLevel);
  trial.result.appendChild(trial.resultLevel);
}

function findScroll(
  scrolls: ScrollPick[],
  id: string | null,
): ScrollPick | null {
  return findShrinePickById(scrolls, id);
}

function findOffering(
  offerings: OfferingPick[],
  id: string | null,
): OfferingPick | null {
  return findShrinePickById(offerings, id);
}

function fpFromShrinePick(pick: {
  slot: number;
  name: string;
  q?: number;
  buy?: boolean;
}): ItemFingerprint {
  if (pick.buy) return { slot: -1, name: pick.name };
  return fpFromPick(pick);
}

function setTilesScrollMode(host: HTMLElement, count: number): void {
  host.classList.toggle("is-scroll", count > 6);
}

function pulseSection(section: HTMLElement | null): void {
  if (!section) return;
  section.classList.remove("is-pulse");
  // Force reflow so the animation can replay.
  void section.offsetWidth;
  section.classList.add("is-pulse");
  section.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function appendTileKey(wrap: HTMLElement, name: string): void {
  const key = document.createElement("span");
  key.className = "ecu-upg__tile-key";
  key.textContent = name;
  key.title = name;
  wrap.appendChild(key);
}

function appendScrollTiles(
  host: HTMLElement,
  scrolls: ScrollPick[],
  selectedId: string | null,
  onPick: (id: string | null) => void,
  gold: number,
  opts?: { allowNone?: boolean },
): void {
  host.innerHTML = "";
  const allowNone = !!(opts && opts.allowNone);
  setTilesScrollMode(host, scrolls.length + (allowNone ? 1 : 0));
  if (allowNone) {
    const noneWrap = document.createElement("div");
    noneWrap.className = "ecu-upg__tile-wrap";
    const none = document.createElement("button");
    none.type = "button";
    none.className =
      "ecu-upg__tile is-none" + (selectedId == null ? " is-on" : "");
    none.title = "No scroll — offering-only / primstack";
    none.textContent = "None";
    none.addEventListener("click", () => onPick(null));
    noneWrap.appendChild(none);
    host.appendChild(noneWrap);
  }
  if (!scrolls.length) {
    if (!allowNone) {
      const empty = document.createElement("div");
      empty.className = "ecu-upg__empty";
      empty.textContent =
        "No compatible scrolls in bag or at a vendor.";
      host.appendChild(empty);
    }
    return;
  }
  for (let i = 0; i < scrolls.length; i++) {
    const s = scrolls[i];
    const id = shrinePickId(s);
    const wrap = document.createElement("div");
    wrap.className = "ecu-upg__tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    const cantAfford =
      !!s.buy && s.buyPrice != null && gold < s.buyPrice;
    btn.className =
      "ecu-upg__tile" +
      (s.recommended ? " is-rec" : "") +
      (s.buy ? " is-buy" : "") +
      (selectedId === id ? " is-on" : "");
    btn.disabled = cantAfford;
    btn.title =
      s.displayName +
      " · " +
      s.name +
      " · grade " +
      s.grade +
      (s.recommended ? " · best match" : "") +
      (s.buy
        ? " · buy " +
          formatBuyGold(s.buyPrice || 0) +
          "g" +
          (cantAfford ? " · not enough gold" : "")
        : " · ×" + s.q);
    const icon = document.createElement("span");
    mountItemIcon(icon, {
      name: s.name,
      q: s.buy ? undefined : s.q,
      size: 40,
    });
    btn.appendChild(icon);
    if (s.buy) {
      const badge = document.createElement("span");
      badge.className = "ecu-upg__tile-badge is-buy";
      badge.textContent = "BUY";
      btn.appendChild(badge);
    } else if (s.recommended) {
      const badge = document.createElement("span");
      badge.className = "ecu-upg__tile-badge";
      badge.textContent = "BEST";
      btn.appendChild(badge);
    }
    const grade = document.createElement("span");
    grade.className = "ecu-upg__tile-grade";
    grade.textContent = String(s.grade);
    btn.appendChild(grade);
    const qty = document.createElement("span");
    qty.className = "ecu-upg__tile-qty";
    qty.textContent = s.buy
      ? formatBuyGold(s.buyPrice || 0) + "g"
      : "×" + s.q;
    btn.appendChild(qty);
    btn.addEventListener("click", () => {
      if (cantAfford) return;
      onPick(id);
    });
    wrap.appendChild(btn);
    appendTileKey(wrap, s.name);
    host.appendChild(wrap);
  }
}

function appendOfferingTiles(
  host: HTMLElement,
  offerings: OfferingPick[],
  selectedId: string | null,
  onPick: (id: string | null) => void,
  gold: number,
): void {
  host.innerHTML = "";
  setTilesScrollMode(host, offerings.length + 1);
  const noneWrap = document.createElement("div");
  noneWrap.className = "ecu-upg__tile-wrap";
  const none = document.createElement("button");
  none.type = "button";
  none.className =
    "ecu-upg__tile is-none" + (selectedId == null ? " is-on" : "");
  none.title = "No offering";
  none.textContent = "None";
  none.addEventListener("click", () => onPick(null));
  noneWrap.appendChild(none);
  host.appendChild(noneWrap);

  for (let i = 0; i < offerings.length; i++) {
    const o = offerings[i];
    const id = shrinePickId(o);
    const wrap = document.createElement("div");
    wrap.className = "ecu-upg__tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    const cantAfford =
      !!o.buy && o.buyPrice != null && gold < o.buyPrice;
    btn.className =
      "ecu-upg__tile" +
      (o.buy ? " is-buy" : "") +
      (selectedId === id ? " is-on" : "");
    btn.disabled = cantAfford;
    btn.title =
      o.displayName +
      " · " +
      o.name +
      (o.grade != null ? " · grade " + o.grade : "") +
      (o.buy
        ? " · buy " +
          formatBuyGold(o.buyPrice || 0) +
          "g" +
          (cantAfford ? " · not enough gold" : "")
        : " · ×" + o.q);
    const icon = document.createElement("span");
    mountItemIcon(icon, {
      name: o.name,
      q: o.buy ? undefined : o.q,
      size: 40,
    });
    btn.appendChild(icon);
    if (o.buy) {
      const badge = document.createElement("span");
      badge.className = "ecu-upg__tile-badge is-buy";
      badge.textContent = "BUY";
      btn.appendChild(badge);
    }
    const qty = document.createElement("span");
    qty.className = "ecu-upg__tile-qty";
    qty.textContent = o.buy
      ? formatBuyGold(o.buyPrice || 0) + "g"
      : "×" + o.q;
    btn.appendChild(qty);
    btn.addEventListener("click", () => {
      if (cantAfford) return;
      onPick(id);
    });
    wrap.appendChild(btn);
    appendTileKey(wrap, o.name);
    host.appendChild(wrap);
  }
}

function appendPartnerTiles(
  host: HTMLElement,
  partners: BagSlotRef[],
  selected: Set<number>,
  onToggle: (slot: number) => void,
): void {
  host.innerHTML = "";
  setTilesScrollMode(host, partners.length);
  for (let i = 0; i < partners.length; i++) {
    const p = partners[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ecu-upg__tile" + (selected.has(p.slot) ? " is-on" : "");
    btn.title =
      itemInstanceLabel(p.name, {
        level: p.level,
        p: p.p != null ? String(p.p) : undefined,
      }) +
      " · bag slot " +
      p.slot;
    const icon = document.createElement("span");
    mountItemIcon(icon, {
      name: p.name,
      level: p.level,
      q: p.q,
      p: p.p,
      size: 40,
    });
    btn.appendChild(icon);
    btn.addEventListener("click", () => onToggle(p.slot));
    host.appendChild(btn);
  }
}

/** Enter confirms only when ~chance is below this (risky tries). */
const ENTER_CONFIRM_BELOW = 0.5;

function wireDialogChrome(
  backdrop: HTMLDivElement,
  panel: HTMLElement,
  opts?: {
    onEnter?: () => void;
    /** When false/undefined, Enter is ignored. */
    canEnter?: () => boolean;
  },
): void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      document.removeEventListener("keydown", onKey, true);
      closeDialog(null);
      return;
    }
    if (
      ev.key === "Enter" &&
      opts &&
      opts.onEnter &&
      (!opts.canEnter || opts.canEnter())
    ) {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      ev.preventDefault();
      opts.onEnter();
    }
  };
  document.addEventListener("keydown", onKey, true);
  backdrop.addEventListener("mousedown", (ev) => {
    if (ev.target === backdrop) closeDialog(null);
  });
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  openBackdrop = backdrop;
}

function setHintWithBagRefresh(
  hint: HTMLElement,
  lead: string,
): void {
  hint.textContent = "";
  hint.appendChild(document.createTextNode(lead + " "));
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ecu-upg__hint-link";
  btn.textContent = "Refresh bag";
  btn.title = "Pull a fresh inventory snapshot from the observed character";
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
  });
  hint.appendChild(btn);
}

function installBagPickClick(
  onSlot: (slot: number) => boolean,
): () => void {
  const host = document.getElementById("bottomleftcorner");
  if (!host) return () => {};
  const onClick = (ev: MouseEvent) => {
    if (ev.button !== 0) return;
    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    const num = resolveInventorySlotNum(t, host);
    if (num == null || !Number.isFinite(num)) return;
    if (!onSlot(num)) return;
    ev.preventDefault();
    ev.stopPropagation();
  };
  host.addEventListener("click", onClick, true);
  return () => host.removeEventListener("click", onClick, true);
}

type ChanceUi = {
  setApprox: (
    chance: number,
    detail?: string,
  ) => void;
  setEmpty: (why: string) => void;
};

function bindChanceUi(trial: TrialCard): ChanceUi {
  return {
    setApprox: (chance: number, detail?: string) => {
      trial.chanceVal.textContent = formatApproxChancePct(chance);
      trial.chanceVal.title = CHANCE_TITLE;
      trial.chanceDetail.textContent = detail || "";
      trial.chanceDetail.title = detail || "";
      trial.chanceNote.style.display = "";
      trial.chanceBox.classList.remove("is-loading");
    },
    setEmpty: (why: string) => {
      trial.chanceVal.textContent = "—";
      trial.chanceVal.title = why;
      trial.chanceDetail.textContent = "";
      trial.chanceNote.style.display = "none";
      trial.chanceBox.classList.remove("is-loading");
    },
  };
}

/**
 * Pick scroll + optional offering for upgrade. Resolves null on cancel.
 * With `options.execute`, Confirm keeps the dialog open for another attempt
 * after bag sync (game_log is character-only, so outcome is inferred from bag).
 */
export function showUpgradeDialog(
  offer: UpgradeFromBagOffer,
  options?: UpgradeDialogOptions,
): Promise<UpgradeDialogResult | null> {
  if (offer.locked || offer.maxLevel) return Promise.resolve(null);
  closeDialog(null);
  ensureUpgradeCompoundDialogCss();

  return new Promise((resolve) => {
    finishOpen = resolve as (value: unknown) => void;

    let liveOffer = offer;
    let scrollId: string | null = liveOffer.scrolls[0] ? shrinePickId(liveOffer.scrolls[0]) : null;
    let offeringId: string | null = null;
    let pickFocus: PickFocus = scrollId == null ? "scroll" : null;
    let fromLevel =
      liveOffer.item.level != null &&
      Number.isFinite(Number(liveOffer.item.level))
        ? Number(liveOffer.item.level)
        : 0;
    let watch: BagWatchHandle | null = null;
    let busy = false;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-upg-backdrop";
    backdrop.setAttribute("data-ecu-upg", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-upg";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Upgrade");

    const title = document.createElement("h2");
    title.className = "ecu-upg__title";
    title.textContent = "Upgrade";

    const itemName = document.createElement("p");
    itemName.className = "ecu-upg__item-name";
    itemName.textContent = levelTransitionLabel(
      fromLevel,
      liveOffer.displayName,
    );

    const meta = document.createElement("p");
    meta.className = "ecu-upg__meta";
    meta.textContent =
      "Grade " +
      liveOffer.grade +
      " · " +
      accessHint(liveOffer.access) +
      luckyMetaSuffix();

    const trial = makeTrialCard("Upgrade");
    paintTrialResult(trial, liveOffer.item, fromLevel + 1);

    const scrollSection = document.createElement("div");
    scrollSection.className = "ecu-upg__section";
    const scrollLabel = document.createElement("div");
    scrollLabel.className = "ecu-upg__section-label";
    scrollLabel.textContent = "Scroll";
    const scrollTiles = document.createElement("div");
    scrollTiles.className = "ecu-upg__tiles";
    scrollSection.appendChild(scrollLabel);
    scrollSection.appendChild(scrollTiles);

    const offerSection = document.createElement("div");
    offerSection.className = "ecu-upg__section";
    const offerLabel = document.createElement("div");
    offerLabel.className = "ecu-upg__section-label";
    offerLabel.textContent = "Offering (optional)";
    const offerTiles = document.createElement("div");
    offerTiles.className = "ecu-upg__tiles";
    offerSection.appendChild(offerLabel);
    offerSection.appendChild(offerTiles);

    const hint = document.createElement("p");
    hint.className = "ecu-upg__hint";

    const actions = document.createElement("div");
    actions.className = "ecu-upg__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ecu-upg__btn";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "ecu-upg__btn is-primary";
    okBtn.textContent = liveOffer.access.ok ? "Upgrade" : "Travel & upgrade";
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);

    const chanceUi = bindChanceUi(trial);
    let lastChance: number | null = null;

    const refreshChanceEstimate = () => {
      const scroll = findScroll(liveOffer.scrolls, scrollId);
      const offering = findOffering(liveOffer.offerings, offeringId);
      if (!scroll && !offering) {
        lastChance = null;
        chanceUi.setEmpty("Pick a scroll or offering to estimate chance");
        return;
      }
      lastChance = estimateShrineChance({
        mode: "upgrade",
        level: fromLevel,
        itemGrade: liveOffer.grade,
        scrollGrade: scroll ? scroll.grade : null,
        offeringGrade:
          offering && offering.grade != null ? offering.grade : null,
        grace: liveOffer.item.grace,
      });
      chanceUi.setApprox(lastChance, chancePickDetail(scroll, offering));
      if (
        !busy &&
        pickFocus == null &&
        lastChance < ENTER_CONFIRM_BELOW
      ) {
        hint.textContent = "Enter confirms (low ~chance).";
      }
    };

    const batchCheck = makeBatchModeCheck({
      mode: "upgrade",
      onChange: () => paint(),
    });

    const paint = () => {
      const scroll = findScroll(liveOffer.scrolls, scrollId);
      const offering = findOffering(liveOffer.offerings, offeringId);
      const bagNow = observingBagItems();
      const peerSlots = listBagSlotsAtNameLevelTitle(
        bagNow,
        liveOffer.item.name,
        fromLevel,
        liveOffer.item.p,
      );
      const goldNow = observingGold();
      const scrollMat = batchMaterialFromPick(scroll);
      const offeringMat = batchMaterialFromPick(offering);
      const batchOn = batchCheck.read();
      const canBuyExtras = !!(
        (scrollMat && (scrollMat.buy || scrollMat.canBuy)) ||
        (offeringMat && (offeringMat.buy || offeringMat.canBuy))
      );
      batchCheck.syncBuyExtras({ batchOn, canBuyExtras });
      const buyExtras = batchCheck.readBuyExtras();
      const batchPlan = planShrineBatch({
        mode: "upgrade",
        peerCount: peerSlots.length,
        scroll: scrollMat,
        offering: offeringMat,
        gold: goldNow,
        buyExtras,
      });
      if (batchOn) {
        batchCheck.setPlanSummary(
          formatShrineBatchSummary(batchPlan, {
            mode: "upgrade",
            scroll: scrollMat,
            offering: offeringMat,
          }),
          describeBatchLimit(batchPlan),
        );
      } else {
        batchCheck.setPlanSummary(
          peerSlots.length > 1
            ? " · " + peerSlots.length + " copies"
            : peerSlots.length === 1
              ? " · 1 copy"
              : "",
          "",
        );
      }

      const highlight: number[] = batchOn
        ? peerSlots.slice()
        : [liveOffer.item.slot];
      if (scroll && !scroll.buy && scroll.slot >= 0) {
        highlight.push(scroll.slot);
      }
      if (offering && !offering.buy && offering.slot >= 0) {
        highlight.push(offering.slot);
      }
      setShrineBagHighlights(highlight);

      trial.inputIcons.innerHTML = "";
      fillMini(trial.inputIcons, liveOffer.item, {
        showLevel: true,
        title: "Item being upgraded",
      });

      trial.usedIcons.innerHTML = "";
      if (scroll) {
        fillMini(trial.usedIcons, scroll, {
          showKey: true,
          title: "Click to change scroll",
          onClick: () => {
            if (busy) return;
            pickFocus = "scroll";
            paint();
            pulseSection(scrollSection);
          },
        });
      } else {
        fillMini(trial.usedIcons, null, {
          emptyLabel: "Scr",
          title: "Click, then pick a scroll — or None for primstack",
          focused: pickFocus === "scroll",
          onClick: () => {
            if (busy) return;
            pickFocus = "scroll";
            paint();
            pulseSection(scrollSection);
          },
        });
      }
      if (offering) {
        fillMini(trial.usedIcons, offering, {
          showKey: true,
          title: "Click to change offering",
          onClick: () => {
            if (busy) return;
            pickFocus = "offering";
            paint();
            pulseSection(offerSection);
          },
        });
      } else {
        fillMini(trial.usedIcons, null, {
          emptyLabel: "Off",
          title: "Click, then pick an offering (or None)",
          focused: pickFocus === "offering",
          onClick: () => {
            if (busy) return;
            pickFocus = "offering";
            paint();
            pulseSection(offerSection);
          },
        });
      }

      appendScrollTiles(
        scrollTiles,
        liveOffer.scrolls,
        scrollId,
        (id) => {
          if (busy) return;
          scrollId = id;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
        goldNow,
        { allowNone: true },
      );
      appendOfferingTiles(
        offerTiles,
        liveOffer.offerings,
        offeringId,
        (id) => {
          if (busy) return;
          offeringId = id;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
        goldNow,
      );
      const ready = scrollId != null || offeringId != null;
      const buying =
        !!(scroll && scroll.buy) ||
        !!(offering && offering.buy) ||
        batchPlan.scrollBuy > 0 ||
        batchPlan.offeringBuy > 0;
      const batchN = batchPlan.attempts;
      okBtn.disabled =
        busy || !ready || (batchOn && batchPlan.wantAttempts > 0 && batchN <= 0);
      okBtn.textContent = buying
        ? liveOffer.access.hasComputer
          ? batchOn && batchN > 1
            ? "Buy & upgrade all (" + batchN + ")"
            : "Buy & upgrade"
          : batchOn && batchN > 1
            ? "Buy, travel & upgrade all (" + batchN + ")"
            : "Buy, travel & upgrade"
        : batchOn && batchN > 1
          ? liveOffer.access.ok
            ? "Upgrade all (" + batchN + ")"
            : "Travel & upgrade all (" + batchN + ")"
          : liveOffer.access.ok
            ? "Upgrade"
            : "Travel & upgrade";
      meta.textContent =
        "Grade " +
        liveOffer.grade +
        " · " +
        accessHint(liveOffer.access, { buying }) +
        luckyMetaSuffix();
      if (!busy) {
        if (pickFocus === "scroll") {
          hint.textContent =
            "Pick a scroll (tiles, bag, buy) or None for offering-only / primstack.";
        } else if (pickFocus === "offering") {
          hint.textContent =
            "Pick an offering from the tiles, bag, vendor (or None).";
        } else if (!ready) {
          hint.textContent = "Pick a scroll and/or an offering.";
        } else if (batchOn && batchPlan.wantAttempts > 1) {
          hint.textContent =
            "Batch: " +
            batchN +
            " upgrade" +
            (batchN === 1 ? "" : "s") +
            " at +" +
            fromLevel +
            (batchN < batchPlan.wantAttempts
              ? " (materials limit " +
                batchPlan.wantAttempts +
                " copies)"
              : "") +
            ".";
        } else {
          hint.textContent = "";
        }
      }

      scrollSection.classList.toggle("is-focus", pickFocus === "scroll");
      offerSection.classList.toggle("is-focus", pickFocus === "offering");
    };

    const applyOfferPicks = (
      nextOffer: UpgradeFromBagOffer,
      keptScrollName: string | null,
      keptOfferingName: string | null,
      readyHint: string,
    ) => {
      liveOffer = nextOffer;
      fromLevel =
        liveOffer.item.level != null &&
        Number.isFinite(Number(liveOffer.item.level))
          ? Number(liveOffer.item.level)
          : fromLevel;
      const keepScroll = keptScrollName
        ? liveOffer.scrolls.find((s) => s.name === keptScrollName)
        : null;
      scrollId = keepScroll
        ? shrinePickId(keepScroll)
        : liveOffer.scrolls[0]
          ? shrinePickId(liveOffer.scrolls[0])
          : null;
      const keepOffering = keptOfferingName
        ? liveOffer.offerings.find((o) => o.name === keptOfferingName)
        : null;
      offeringId = keepOffering ? shrinePickId(keepOffering) : null;
      pickFocus = scrollId == null ? "scroll" : null;
      itemName.textContent = levelTransitionLabel(
        fromLevel,
        liveOffer.displayName,
      );
      meta.textContent =
        "Grade " +
        liveOffer.grade +
        " · " +
        accessHint(liveOffer.access) +
        luckyMetaSuffix();
      paintTrialResult(trial, liveOffer.item, fromLevel + 1);
      busy = false;
      hint.textContent = readyHint;
      paint();
      refreshChanceEstimate();
    };

    /** Next unlocked copy still at the batch level (same name + level + title). */
    const rebindBatchPeer = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
      afterFail: boolean,
    ) => {
      const bag = observingBagItems();
      const G = getG();
      const wantTitle = itemTitleKey(liveOffer.item.p);
      let nextSlot = -1;
      let nextItem: {
        name?: string;
        level?: number;
        p?: string | null;
        l?: unknown;
      } | null = null;
      if (bag) {
        for (let i = 0; i < bag.length; i++) {
          const it = bag[i];
          if (!it || it.name !== liveOffer.item.name) continue;
          if (bagItemLocked(it)) continue;
          const lv = it.level != null ? Number(it.level) : 0;
          if (lv !== fromLevel) continue;
          if (itemTitleKey(it.p) !== wantTitle) continue;
          nextSlot = i;
          nextItem = it;
          break;
        }
      }
      if (!nextItem || nextSlot < 0 || !G) {
        hint.textContent = afterFail
          ? "Batch done — no more +" + fromLevel + " copies."
          : "Batch done — all +" + fromLevel + " copies upgraded.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      const nextOffer = upgradeOfferForBagItem(nextItem, nextSlot, bag, G);
      if (!nextOffer || nextOffer.locked || nextOffer.maxLevel) {
        hint.textContent = "Batch stopped — cannot continue.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      applyOfferPicks(
        nextOffer,
        keptScrollName,
        keptOfferingName,
        afterFail
          ? "Failed — continuing batch…"
          : "Success — next copy in batch…",
      );
      window.setTimeout(() => {
        if (busy) return;
        if (okBtn.disabled) {
          hint.textContent = "Batch stopped — out of scrolls or offerings.";
          window.setTimeout(() => closeDialog(null), 1600);
          return;
        }
        tryConfirm();
      }, 280);
    };

    const rebindAfterSuccess = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
    ) => {
      if (batchCheck.read()) {
        rebindBatchPeer(keptScrollName, keptOfferingName, false);
        return;
      }
      const bag = observingBagItems();
      const G = getG();
      const nextLevel = fromLevel + 1;
      let nextSlot = -1;
      let nextItem: { name?: string; level?: number } | null = null;
      if (bag) {
        for (let i = 0; i < bag.length; i++) {
          const it = bag[i];
          if (!it || it.name !== liveOffer.item.name) continue;
          const lv = it.level != null ? Number(it.level) : 0;
          if (lv === nextLevel) {
            nextSlot = i;
            nextItem = it;
            break;
          }
        }
      }
      if (!nextItem || nextSlot < 0 || !G) {
        hint.textContent = "Upgraded — open again for the next level.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1400);
        return;
      }
      const nextOffer = upgradeOfferForBagItem(nextItem, nextSlot, bag, G);
      if (!nextOffer || nextOffer.locked || nextOffer.maxLevel) {
        hint.textContent = nextOffer?.maxLevel
          ? "Max level — done."
          : "Upgraded — cannot continue.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      applyOfferPicks(
        nextOffer,
        keptScrollName,
        keptOfferingName,
        "Ready for next upgrade.",
      );
    };

    const unsubBagClick = installBagPickClick((slot) => {
      if (busy) return false;
      if (pickFocus === "scroll") {
        const s = liveOffer.scrolls.find((x) => !x.buy && x.slot === slot);
        if (!s) return false;
        scrollId = shrinePickId(s);
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      if (pickFocus === "offering") {
        const o = liveOffer.offerings.find((x) => !x.buy && x.slot === slot);
        if (!o) return false;
        offeringId = shrinePickId(o);
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      const s = liveOffer.scrolls.find((x) => !x.buy && x.slot === slot);
      if (s) {
        scrollId = shrinePickId(s);
        paint();
        refreshChanceEstimate();
        return true;
      }
      const o = liveOffer.offerings.find((x) => !x.buy && x.slot === slot);
      if (o) {
        offeringId = shrinePickId(o);
        paint();
        refreshChanceEstimate();
        return true;
      }
      return false;
    });

    onDialogCleanup = () => {
      if (watch) watch.cancel();
      watch = null;
      unsubBagClick();
    };

    const skillChecks = makeMerchantSkillChecks();
    const luckyCheck = makeLuckySlotCheck({
      onChange: () => {
        paint();
      },
    });

    const tryConfirm = () => {
      if (okBtn.disabled || busy) return;
      const scroll = findScroll(liveOffer.scrolls, scrollId);
      const offering = findOffering(liveOffer.offerings, offeringId);
      const skills = skillChecks ? skillChecks.read() : undefined;
      const lucky = luckyCheck.read();
      const picked: UpgradeDialogResult = {
        item: fpFromPick(liveOffer.item),
        scroll: scroll ? fpFromShrinePick(scroll) : null,
        offering: offering ? fpFromShrinePick(offering) : null,
        buyScroll: scroll && scroll.buy ? scroll.name : null,
        buyOffering: offering && offering.buy ? offering.name : null,
        skills,
        lucky,
      };
      if (!options || !options.execute) {
        closeDialog(picked);
        return;
      }
      const bag = observingBagItems();
      const beforeNext = countNameLevel(
        bag,
        liveOffer.item.name,
        fromLevel + 1,
      );
      busy = true;
      okBtn.disabled = true;
      hint.textContent = "Running on character…";
      const sent = options.execute(picked);
      if (!sent) {
        busy = false;
        hint.textContent = "Command failed to send.";
        paint();
        return;
      }
      if (watch) watch.cancel();
      const watchSlots = [liveOffer.item.slot];
      if (lucky.enabled) watchSlots.push(lucky.slot);
      watch = watchLevelBump({
        name: liveOffer.item.name,
        fromLevel,
        beforeNext,
        watchedSlots: watchSlots,
        onSuccess: () => {
          watch = null;
          hint.textContent = "Success — preparing next…";
          rebindAfterSuccess(
            scroll ? scroll.name : null,
            offering ? offering.name : null,
          );
        },
        onDestroyed: () => {
          watch = null;
          if (batchCheck.read()) {
            hint.textContent = "Failed — continuing batch…";
            rebindBatchPeer(
              scroll ? scroll.name : null,
              offering ? offering.name : null,
              true,
            );
            return;
          }
          busy = false;
          hint.textContent = "Failed — item gone.";
          window.setTimeout(() => closeDialog(null), 1600);
        },
        onProgress: () => {
          hint.textContent = "Rolling…";
        },
        onTimeout: () => {
          watch = null;
          busy = false;
          paint();
          setHintWithBagRefresh(
            hint,
            "No bag change yet — check the character, or",
          );
        },
      });
    };

    cancelBtn.addEventListener("click", () => closeDialog(null));
    okBtn.addEventListener("click", () => tryConfirm());

    panel.appendChild(title);
    panel.appendChild(itemName);
    panel.appendChild(meta);
    panel.appendChild(trial.root);
    panel.appendChild(scrollSection);
    panel.appendChild(offerSection);
    panel.appendChild(batchCheck.root);
    panel.appendChild(luckyCheck.root);
    if (skillChecks) panel.appendChild(skillChecks.root);
    panel.appendChild(hint);
    panel.appendChild(actions);
    paint();
    refreshChanceEstimate();
    luckyCheck.syncHighlight();
    wireDialogChrome(backdrop, panel, {
      onEnter: () => tryConfirm(),
      canEnter: () =>
        !busy &&
        !okBtn.disabled &&
        lastChance != null &&
        lastChance < ENTER_CONFIRM_BELOW,
    });
  });
}

/**
 * Pick two partners (if >2 copies), scroll, and optional offering.
 * With `options.execute`, Confirm keeps the dialog open for another attempt.
 */
export function showCompoundDialog(
  offer: CompoundFromBagOffer,
  options?: CompoundDialogOptions,
): Promise<CompoundDialogResult | null> {
  if (offer.locked || offer.maxLevel) return Promise.resolve(null);
  if (offer.partners.length < 2) return Promise.resolve(null);
  closeDialog(null);
  ensureUpgradeCompoundDialogCss();

  return new Promise((resolve) => {
    finishOpen = resolve as (value: unknown) => void;

    let liveOffer = offer;
    const defaults = defaultCompoundPartners(
      liveOffer.partners,
      liveOffer.item,
    )!;
    let selected = new Set<number>([defaults[0].slot, defaults[1].slot]);
    let scrollId: string | null = liveOffer.scrolls[0] ? shrinePickId(liveOffer.scrolls[0]) : null;
    let offeringId: string | null = null;
    let pickFocus: PickFocus =
      selected.size < 2 ? "partner" : scrollId == null ? "scroll" : null;
    let fromLevel =
      liveOffer.item.level != null &&
      Number.isFinite(Number(liveOffer.item.level))
        ? Number(liveOffer.item.level)
        : 0;
    let watch: BagWatchHandle | null = null;
    let busy = false;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-upg-backdrop";
    backdrop.setAttribute("data-ecu-upg", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-upg";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Compound");

    const title = document.createElement("h2");
    title.className = "ecu-upg__title";
    title.textContent = "Compound";

    const itemName = document.createElement("p");
    itemName.className = "ecu-upg__item-name";
    itemName.textContent = levelTransitionLabel(
      fromLevel,
      liveOffer.displayName,
    );

    const meta = document.createElement("p");
    meta.className = "ecu-upg__meta";
    meta.textContent =
      "Grade " +
      liveOffer.grade +
      " · 3 → 1 · " +
      accessHint(liveOffer.access);

    const trial = makeTrialCard("Compound");
    paintTrialResult(trial, liveOffer.item, fromLevel + 1);

    const partnerSection = document.createElement("div");
    partnerSection.className = "ecu-upg__section";
    const partnerLabel = document.createElement("div");
    partnerLabel.className = "ecu-upg__section-label";
    partnerLabel.textContent = "Other copies (pick 2)";
    const partnerTiles = document.createElement("div");
    partnerTiles.className = "ecu-upg__tiles";
    partnerSection.appendChild(partnerLabel);
    partnerSection.appendChild(partnerTiles);

    const scrollSection = document.createElement("div");
    scrollSection.className = "ecu-upg__section";
    const scrollLabel = document.createElement("div");
    scrollLabel.className = "ecu-upg__section-label";
    scrollLabel.textContent = "Compound scroll";
    const scrollTiles = document.createElement("div");
    scrollTiles.className = "ecu-upg__tiles";
    scrollSection.appendChild(scrollLabel);
    scrollSection.appendChild(scrollTiles);

    const offerSection = document.createElement("div");
    offerSection.className = "ecu-upg__section";
    const offerLabel = document.createElement("div");
    offerLabel.className = "ecu-upg__section-label";
    offerLabel.textContent = "Offering (optional)";
    const offerTiles = document.createElement("div");
    offerTiles.className = "ecu-upg__tiles";
    offerSection.appendChild(offerLabel);
    offerSection.appendChild(offerTiles);

    const hint = document.createElement("p");
    hint.className = "ecu-upg__hint";

    const actions = document.createElement("div");
    actions.className = "ecu-upg__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ecu-upg__btn";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "ecu-upg__btn is-primary";
    okBtn.textContent = liveOffer.access.ok ? "Compound" : "Travel & compound";
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);

    const chanceUi = bindChanceUi(trial);
    let lastChance: number | null = null;

    const refreshChanceEstimate = () => {
      if (selected.size !== 2 || scrollId == null) {
        lastChance = null;
        chanceUi.setEmpty("Need 3 copies + scroll to estimate chance");
        return;
      }
      const scroll = findScroll(liveOffer.scrolls, scrollId);
      if (!scroll) {
        lastChance = null;
        chanceUi.setEmpty("Need a compound scroll to estimate chance");
        return;
      }
      const offering = findOffering(liveOffer.offerings, offeringId);
      lastChance = estimateShrineChance({
        mode: "compound",
        level: fromLevel,
        itemGrade: liveOffer.grade,
        scrollGrade: scroll.grade,
        offeringGrade:
          offering && offering.grade != null ? offering.grade : null,
        grace: liveOffer.item.grace,
      });
      chanceUi.setApprox(lastChance, chancePickDetail(scroll, offering));
      if (
        !busy &&
        pickFocus == null &&
        lastChance < ENTER_CONFIRM_BELOW
      ) {
        hint.textContent = "Enter confirms (low ~chance).";
      }
    };

    const batchCheck = makeBatchModeCheck({
      mode: "compound",
      onChange: () => paint(),
    });

    const paint = () => {
      const partnerList: BagSlotRef[] = [];
      const keys = Array.from(selected.values()).sort((a, b) => a - b);
      for (let i = 0; i < keys.length; i++) {
        const found = liveOffer.partners.find((p) => p.slot === keys[i]);
        if (found) partnerList.push(found);
      }

      const scroll = findScroll(liveOffer.scrolls, scrollId);
      const offering = findOffering(liveOffer.offerings, offeringId);
      const bagNow = observingBagItems();
      const peerSlots = listBagSlotsAtNameLevelTitle(
        bagNow,
        liveOffer.item.name,
        fromLevel,
        liveOffer.item.p,
      );
      const goldNow = observingGold();
      const scrollMat = batchMaterialFromPick(scroll);
      const offeringMat = batchMaterialFromPick(offering);
      const batchOn = batchCheck.read();
      const canBuyExtras = !!(
        (scrollMat && (scrollMat.buy || scrollMat.canBuy)) ||
        (offeringMat && (offeringMat.buy || offeringMat.canBuy))
      );
      batchCheck.syncBuyExtras({ batchOn, canBuyExtras });
      const buyExtras = batchCheck.readBuyExtras();
      const batchPlan = planShrineBatch({
        mode: "compound",
        peerCount: peerSlots.length,
        scroll: scrollMat,
        offering: offeringMat,
        gold: goldNow,
        buyExtras,
      });
      if (batchOn) {
        batchCheck.setPlanSummary(
          formatShrineBatchSummary(batchPlan, {
            mode: "compound",
            scroll: scrollMat,
            offering: offeringMat,
          }),
          describeBatchLimit(batchPlan),
        );
      } else {
        const sets = Math.floor(peerSlots.length / 3);
        batchCheck.setPlanSummary(
          peerSlots.length > 0
            ? " · " +
                peerSlots.length +
                " copies · " +
                sets +
                " set" +
                (sets === 1 ? "" : "s")
            : "",
          "",
        );
      }

      const highlight: number[] = batchOn
        ? peerSlots.slice()
        : [liveOffer.item.slot];
      if (!batchOn) {
        for (let i = 0; i < partnerList.length; i++) {
          highlight.push(partnerList[i].slot);
        }
      }
      if (scroll && !scroll.buy && scroll.slot >= 0) {
        highlight.push(scroll.slot);
      }
      if (offering && !offering.buy && offering.slot >= 0) {
        highlight.push(offering.slot);
      }
      setShrineBagHighlights(highlight);

      trial.inputIcons.innerHTML = "";
      fillMini(trial.inputIcons, liveOffer.item, {
        showLevel: true,
        title: "Primary copy",
      });
      fillMini(trial.inputIcons, partnerList[0] || null, {
        showLevel: true,
        emptyLabel: "2",
        title: "Click, then pick a matching copy from tiles or bag",
        focused: pickFocus === "partner" && !partnerList[0],
        onClick: () => {
          if (busy) return;
          pickFocus = "partner";
          paint();
          pulseSection(partnerSection);
        },
      });
      fillMini(trial.inputIcons, partnerList[1] || null, {
        showLevel: true,
        emptyLabel: "3",
        title: "Click, then pick a matching copy from tiles or bag",
        focused: pickFocus === "partner" && !!partnerList[0] && !partnerList[1],
        onClick: () => {
          if (busy) return;
          pickFocus = "partner";
          paint();
          pulseSection(partnerSection);
        },
      });

      trial.usedIcons.innerHTML = "";
      if (scroll) {
        fillMini(trial.usedIcons, scroll, {
          showKey: true,
          title: "Click to change scroll",
          onClick: () => {
            if (busy) return;
            pickFocus = "scroll";
            paint();
            pulseSection(scrollSection);
          },
        });
      } else {
        fillMini(trial.usedIcons, null, {
          emptyLabel: "Scr",
          title: "Click, then pick a compound scroll",
          focused: pickFocus === "scroll",
          onClick: () => {
            if (busy) return;
            pickFocus = "scroll";
            paint();
            pulseSection(scrollSection);
          },
        });
      }
      if (offering) {
        fillMini(trial.usedIcons, offering, {
          showKey: true,
          title: "Click to change offering",
          onClick: () => {
            if (busy) return;
            pickFocus = "offering";
            paint();
            pulseSection(offerSection);
          },
        });
      } else {
        fillMini(trial.usedIcons, null, {
          emptyLabel: "Off",
          title: "Click, then pick an offering (or None)",
          focused: pickFocus === "offering",
          onClick: () => {
            if (busy) return;
            pickFocus = "offering";
            paint();
            pulseSection(offerSection);
          },
        });
      }

      appendPartnerTiles(partnerTiles, liveOffer.partners, selected, (slot) => {
        if (busy) return;
        if (selected.has(slot)) {
          selected.delete(slot);
        } else if (selected.size < 2) {
          selected.add(slot);
        } else {
          const arr = Array.from(selected.values()).sort((a, b) => a - b);
          selected.delete(arr[1]);
          selected.add(slot);
        }
        if (selected.size === 2) pickFocus = null;
        else pickFocus = "partner";
        paint();
        refreshChanceEstimate();
      });
      appendScrollTiles(
        scrollTiles,
        liveOffer.scrolls,
        scrollId,
        (id) => {
          if (busy) return;
          scrollId = id;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
        goldNow,
      );
      appendOfferingTiles(
        offerTiles,
        liveOffer.offerings,
        offeringId,
        (id) => {
          if (busy) return;
          offeringId = id;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
        goldNow,
      );

      const ready = selected.size === 2 && scrollId != null;
      const buying =
        !!(scroll && scroll.buy) ||
        !!(offering && offering.buy) ||
        batchPlan.scrollBuy > 0 ||
        batchPlan.offeringBuy > 0;
      const batchSets = batchPlan.attempts;
      okBtn.disabled =
        busy ||
        !ready ||
        (batchOn && batchPlan.wantAttempts > 0 && batchSets <= 0);
      okBtn.textContent = buying
        ? liveOffer.access.hasComputer
          ? batchOn && batchSets > 1
            ? "Buy & compound all (" + batchSets + ")"
            : "Buy & compound"
          : batchOn && batchSets > 1
            ? "Buy, travel & compound all (" + batchSets + ")"
            : "Buy, travel & compound"
        : batchOn && batchSets > 1
          ? liveOffer.access.ok
            ? "Compound all (" + batchSets + ")"
            : "Travel & compound all (" + batchSets + ")"
          : liveOffer.access.ok
            ? "Compound"
            : "Travel & compound";
      meta.textContent =
        "Need 3 copies · Grade " +
        liveOffer.grade +
        " · " +
        accessHint(liveOffer.access, { buying });
      if (!busy) {
        if (pickFocus === "partner" || selected.size !== 2) {
          hint.textContent = "Select exactly two other copies (tiles or bag).";
        } else if (pickFocus === "scroll" || scrollId == null) {
          hint.textContent =
            "Pick a compound scroll (tiles, bag, or buy from vendor).";
        } else if (pickFocus === "offering") {
          hint.textContent =
            "Pick an offering from the tiles, bag, vendor (or None).";
        } else if (batchOn && batchPlan.wantAttempts > 1) {
          hint.textContent =
            "Batch: " +
            batchSets +
            " set" +
            (batchSets === 1 ? "" : "s") +
            " at +" +
            fromLevel +
            (batchSets < batchPlan.wantAttempts
              ? " (materials limit " +
                batchPlan.wantAttempts +
                " sets)"
              : "") +
            ".";
        } else {
          hint.textContent = "";
        }
      }

      partnerSection.classList.toggle("is-focus", pickFocus === "partner");
      scrollSection.classList.toggle("is-focus", pickFocus === "scroll");
      offerSection.classList.toggle("is-focus", pickFocus === "offering");
    };

    const applyCompoundOffer = (
      nextOffer: CompoundFromBagOffer,
      keptScrollName: string | null,
      keptOfferingName: string | null,
      readyHint: string,
    ) => {
      liveOffer = nextOffer;
      fromLevel =
        liveOffer.item.level != null &&
        Number.isFinite(Number(liveOffer.item.level))
          ? Number(liveOffer.item.level)
          : fromLevel;
      const nextDefaults = defaultCompoundPartners(
        liveOffer.partners,
        liveOffer.item,
      )!;
      selected = new Set<number>([
        nextDefaults[0].slot,
        nextDefaults[1].slot,
      ]);
      const keepScroll = keptScrollName
        ? liveOffer.scrolls.find((s) => s.name === keptScrollName)
        : null;
      scrollId = keepScroll
        ? shrinePickId(keepScroll)
        : liveOffer.scrolls[0]
          ? shrinePickId(liveOffer.scrolls[0])
          : null;
      const keepOffering = keptOfferingName
        ? liveOffer.offerings.find((o) => o.name === keptOfferingName)
        : null;
      offeringId = keepOffering ? shrinePickId(keepOffering) : null;
      pickFocus =
        selected.size < 2 ? "partner" : scrollId == null ? "scroll" : null;
      itemName.textContent = levelTransitionLabel(
        fromLevel,
        liveOffer.displayName,
      );
      meta.textContent =
        "Grade " +
        liveOffer.grade +
        " · 3 → 1 · " +
        accessHint(liveOffer.access);
      paintTrialResult(trial, liveOffer.item, fromLevel + 1);
      busy = false;
      hint.textContent = readyHint;
      paint();
      refreshChanceEstimate();
    };

    /** Next full set of 3 still at the batch level (same name + level + title). */
    const rebindBatchPeer = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
      afterFail: boolean,
    ) => {
      const bag = observingBagItems();
      const G = getG();
      const wantTitle = itemTitleKey(liveOffer.item.p);
      let nextSlot = -1;
      let nextItem: {
        name?: string;
        level?: number;
        p?: string | null;
        l?: unknown;
      } | null = null;
      if (bag) {
        for (let i = 0; i < bag.length; i++) {
          const it = bag[i];
          if (!it || it.name !== liveOffer.item.name) continue;
          if (bagItemLocked(it)) continue;
          const lv = it.level != null ? Number(it.level) : 0;
          if (lv !== fromLevel) continue;
          if (itemTitleKey(it.p) !== wantTitle) continue;
          const probe = compoundOfferForBagItem(it, i, bag, G);
          if (!probe || probe.partners.length < 2) continue;
          nextSlot = i;
          nextItem = it;
          break;
        }
      }
      if (!nextItem || nextSlot < 0 || !G) {
        hint.textContent = afterFail
          ? "Batch done — no full set left at +" + fromLevel + "."
          : "Batch done — all +" + fromLevel + " sets compounded.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      const nextOffer = compoundOfferForBagItem(nextItem, nextSlot, bag, G);
      if (
        !nextOffer ||
        nextOffer.locked ||
        nextOffer.maxLevel ||
        nextOffer.partners.length < 2
      ) {
        hint.textContent = "Batch stopped — need 3 matching copies.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      applyCompoundOffer(
        nextOffer,
        keptScrollName,
        keptOfferingName,
        afterFail
          ? "Failed — continuing batch…"
          : "Success — next set in batch…",
      );
      window.setTimeout(() => {
        if (busy) return;
        if (okBtn.disabled) {
          hint.textContent = "Batch stopped — out of scrolls or offerings.";
          window.setTimeout(() => closeDialog(null), 1600);
          return;
        }
        tryConfirm();
      }, 280);
    };

    const rebindAfterSuccess = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
    ) => {
      if (batchCheck.read()) {
        rebindBatchPeer(keptScrollName, keptOfferingName, false);
        return;
      }
      const bag = observingBagItems();
      const G = getG();
      const nextLevel = fromLevel + 1;
      let nextSlot = -1;
      let nextItem: { name?: string; level?: number; p?: string } | null =
        null;
      if (bag) {
        for (let i = 0; i < bag.length; i++) {
          const it = bag[i];
          if (!it || it.name !== liveOffer.item.name) continue;
          const lv = it.level != null ? Number(it.level) : 0;
          if (lv === nextLevel) {
            nextSlot = i;
            nextItem = it;
            break;
          }
        }
      }
      if (!nextItem || nextSlot < 0 || !G) {
        hint.textContent = "Compounded — open again when you have more copies.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1600);
        return;
      }
      const nextOffer = compoundOfferForBagItem(nextItem, nextSlot, bag, G);
      if (
        !nextOffer ||
        nextOffer.locked ||
        nextOffer.maxLevel ||
        nextOffer.partners.length < 2
      ) {
        hint.textContent = nextOffer?.maxLevel
          ? "Max level — done."
          : "Compounded — need 3 copies for the next level.";
        busy = false;
        window.setTimeout(() => closeDialog(null), 1800);
        return;
      }
      applyCompoundOffer(
        nextOffer,
        keptScrollName,
        keptOfferingName,
        "Ready for next compound.",
      );
    };

    const unsubBagClick = installBagPickClick((slot) => {
      if (busy) return false;
      if (slot === liveOffer.item.slot) return false;
      if (pickFocus === "partner" || selected.size < 2) {
        const found = liveOffer.partners.find((p) => p.slot === slot);
        if (!found) return false;
        if (selected.has(slot)) {
          selected.delete(slot);
        } else if (selected.size < 2) {
          selected.add(slot);
        } else {
          const arr = Array.from(selected.values()).sort((a, b) => a - b);
          selected.delete(arr[1]);
          selected.add(slot);
        }
        pickFocus = selected.size === 2 ? null : "partner";
        paint();
        refreshChanceEstimate();
        return true;
      }
      if (pickFocus === "scroll") {
        const s = liveOffer.scrolls.find((x) => !x.buy && x.slot === slot);
        if (!s) return false;
        scrollId = shrinePickId(s);
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      if (pickFocus === "offering") {
        const o = liveOffer.offerings.find((x) => !x.buy && x.slot === slot);
        if (!o) return false;
        offeringId = shrinePickId(o);
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      const partner = liveOffer.partners.find((p) => p.slot === slot);
      if (partner) {
        if (selected.has(slot)) selected.delete(slot);
        else if (selected.size < 2) selected.add(slot);
        else {
          const arr = Array.from(selected.values()).sort((a, b) => a - b);
          selected.delete(arr[1]);
          selected.add(slot);
        }
        paint();
        refreshChanceEstimate();
        return true;
      }
      const s = liveOffer.scrolls.find((x) => !x.buy && x.slot === slot);
      if (s) {
        scrollId = shrinePickId(s);
        paint();
        refreshChanceEstimate();
        return true;
      }
      const o = liveOffer.offerings.find((x) => !x.buy && x.slot === slot);
      if (o) {
        offeringId = shrinePickId(o);
        paint();
        refreshChanceEstimate();
        return true;
      }
      return false;
    });

    onDialogCleanup = () => {
      if (watch) watch.cancel();
      watch = null;
      unsubBagClick();
    };

    const skillChecks = makeMerchantSkillChecks();

    const tryConfirm = () => {
      if (okBtn.disabled || busy) return;
      const scroll = findScroll(liveOffer.scrolls, scrollId);
      if (!scroll || selected.size !== 2) return;
      const partnerSlots = Array.from(selected.values()).sort((a, b) => a - b);
      const p0 = liveOffer.partners.find((p) => p.slot === partnerSlots[0]);
      const p1 = liveOffer.partners.find((p) => p.slot === partnerSlots[1]);
      if (!p0 || !p1) return;
      const offering = findOffering(liveOffer.offerings, offeringId);
      const skills = skillChecks ? skillChecks.read() : undefined;
      const picked: CompoundDialogResult = {
        items: [fpFromPick(liveOffer.item), fpFromPick(p0), fpFromPick(p1)],
        scroll: fpFromShrinePick(scroll),
        offering: offering ? fpFromShrinePick(offering) : null,
        buyScroll: scroll.buy ? scroll.name : null,
        buyOffering: offering && offering.buy ? offering.name : null,
        skills,
      };
      if (!options || !options.execute) {
        closeDialog(picked);
        return;
      }
      const bag = observingBagItems();
      const beforeNext = countNameLevel(
        bag,
        liveOffer.item.name,
        fromLevel + 1,
      );
      busy = true;
      okBtn.disabled = true;
      hint.textContent = "Running on character…";
      const sent = options.execute(picked);
      if (!sent) {
        busy = false;
        hint.textContent = "Command failed to send.";
        paint();
        return;
      }
      if (watch) watch.cancel();
      watch = watchLevelBump({
        name: liveOffer.item.name,
        fromLevel,
        beforeNext,
        watchedSlots: [liveOffer.item.slot, p0.slot, p1.slot],
        onSuccess: () => {
          watch = null;
          hint.textContent = "Success — preparing next…";
          rebindAfterSuccess(
            scroll.name,
            offering ? offering.name : null,
          );
        },
        onDestroyed: () => {
          watch = null;
          if (batchCheck.read()) {
            hint.textContent = "Failed — continuing batch…";
            rebindBatchPeer(
              scroll.name,
              offering ? offering.name : null,
              true,
            );
            return;
          }
          busy = false;
          hint.textContent = "Failed — copies gone.";
          window.setTimeout(() => closeDialog(null), 1600);
        },
        onProgress: () => {
          hint.textContent = "Rolling…";
        },
        onTimeout: () => {
          watch = null;
          busy = false;
          paint();
          setHintWithBagRefresh(
            hint,
            "No bag change yet — check the character, or",
          );
        },
      });
    };

    cancelBtn.addEventListener("click", () => closeDialog(null));
    okBtn.addEventListener("click", () => tryConfirm());

    panel.appendChild(title);
    panel.appendChild(itemName);
    panel.appendChild(meta);
    panel.appendChild(trial.root);
    panel.appendChild(partnerSection);
    panel.appendChild(scrollSection);
    panel.appendChild(offerSection);
    panel.appendChild(batchCheck.root);
    if (skillChecks) panel.appendChild(skillChecks.root);
    panel.appendChild(hint);
    panel.appendChild(actions);
    paint();
    refreshChanceEstimate();
    wireDialogChrome(backdrop, panel, {
      onEnter: () => tryConfirm(),
      canEnter: () =>
        !busy &&
        !okBtn.disabled &&
        lastChance != null &&
        lastChance < ENTER_CONFIRM_BELOW,
    });
  });
}
