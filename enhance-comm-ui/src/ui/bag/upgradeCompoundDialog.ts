/**
 * Upgrade / Compound shrine dialog — Discord-style trial card + bag highlights.
 * Chance is a rough local ~estimate from the current picks.
 */

import type { ItemFingerprint } from "../../host/mail/types";
import { refreshObservedInventory } from "../../host/inventory";
import {
  getG,
  observingBagItems,
} from "../../host/stationCommands";
import {
  compoundOfferForBagItem,
  defaultCompoundPartners,
  upgradeOfferForBagItem,
  type BagSlotRef,
  type CompoundFromBagOffer,
  type OfferingPick,
  type ScrollPick,
  type UpgradeFromBagOffer,
} from "../../lib/bagUpgradeCompound";
import { itemInstanceHtml, itemInstanceLabel } from "../../lib/gameIcon";
import {
  estimateShrineChance,
  formatApproxChancePct,
} from "../../lib/shrineChanceEstimate";
import { resolveInventorySlotNum } from "./bagItemContextMenu";
import {
  clearShrineBagHighlights,
  setShrineBagHighlights,
} from "./shrineBagHighlight";
import { ensureUpgradeCompoundDialogCss } from "./upgradeCompoundDialogCss";

export type UpgradeDialogResult = {
  item: ItemFingerprint;
  scroll: ItemFingerprint | null;
  offering: ItemFingerprint | null;
};

export type CompoundDialogResult = {
  items: [ItemFingerprint, ItemFingerprint, ItemFingerprint];
  scroll: ItemFingerprint;
  offering: ItemFingerprint | null;
};

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

function accessHint(access: {
  ok: boolean;
  hasComputer: boolean;
  inRange: boolean;
  reason?: string;
}): string {
  if (access.hasComputer) return "Computer — works on any map.";
  if (access.inRange) return "In range of the shrine.";
  if (access.reason) return access.reason + " — Confirm will travel first.";
  return "Out of range — Confirm will smart_move to the shrine first.";
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

function countNameLevel(
  items: Array<{ name?: string; level?: number } | null | undefined> | null,
  name: string,
  level: number,
): number {
  if (!items) return 0;
  let n = 0;
  const want = Number(level) || 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || it.name !== name) continue;
    const lv = it.level != null ? Number(it.level) : 0;
    if (lv === want) n += 1;
  }
  return n;
}

type BagWatchHandle = { cancel: () => void };

function watchLevelBump(opts: {
  name: string;
  fromLevel: number;
  beforeAtLevel: number;
  beforeNext: number;
  onSuccess: () => void;
  onDestroyed: () => void;
  onTimeout: () => void;
}): BagWatchHandle {
  let done = false;
  const started = Date.now();
  const timers: number[] = [];
  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    for (let i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
    fn();
  };
  const poll = () => {
    if (done) return;
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
    const items = observingBagItems();
    const atLevel = countNameLevel(items, opts.name, opts.fromLevel);
    const atNext = countNameLevel(items, opts.name, opts.fromLevel + 1);
    if (atNext > opts.beforeNext) {
      finish(() => opts.onSuccess());
      return;
    }
    if (
      atLevel < opts.beforeAtLevel &&
      atNext <= opts.beforeNext &&
      Date.now() - started > 1600
    ) {
      finish(() => opts.onDestroyed());
      return;
    }
  };
  const kicks = [700, 1400, 2800, 5200, 9000];
  for (let i = 0; i < kicks.length; i++) {
    timers.push(window.setTimeout(poll, kicks[i]));
  }
  timers.push(
    window.setTimeout(() => {
      finish(() => opts.onTimeout());
    }, 12000),
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
  slot: number | null,
): ScrollPick | null {
  if (slot == null) return null;
  for (let i = 0; i < scrolls.length; i++) {
    if (scrolls[i].slot === slot) return scrolls[i];
  }
  return null;
}

function findOffering(
  offerings: OfferingPick[],
  slot: number | null,
): OfferingPick | null {
  if (slot == null) return null;
  for (let i = 0; i < offerings.length; i++) {
    if (offerings[i].slot === slot) return offerings[i];
  }
  return null;
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
  selectedSlot: number | null,
  onPick: (slot: number) => void,
): void {
  host.innerHTML = "";
  setTilesScrollMode(host, scrolls.length);
  if (!scrolls.length) {
    const empty = document.createElement("div");
    empty.className = "ecu-upg__empty";
    empty.textContent = "No compatible scrolls in bag.";
    host.appendChild(empty);
    return;
  }
  for (let i = 0; i < scrolls.length; i++) {
    const s = scrolls[i];
    const wrap = document.createElement("div");
    wrap.className = "ecu-upg__tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ecu-upg__tile" +
      (s.recommended ? " is-rec" : "") +
      (selectedSlot === s.slot ? " is-on" : "");
    btn.title =
      s.displayName +
      " · " +
      s.name +
      " · grade " +
      s.grade +
      (s.recommended ? " · best match" : "") +
      " · ×" +
      s.q;
    const icon = document.createElement("span");
    mountItemIcon(icon, { name: s.name, q: s.q, size: 40 });
    btn.appendChild(icon);
    if (s.recommended) {
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
    qty.textContent = "×" + s.q;
    btn.appendChild(qty);
    btn.addEventListener("click", () => onPick(s.slot));
    wrap.appendChild(btn);
    appendTileKey(wrap, s.name);
    host.appendChild(wrap);
  }
}

function appendOfferingTiles(
  host: HTMLElement,
  offerings: OfferingPick[],
  selectedSlot: number | null,
  onPick: (slot: number | null) => void,
): void {
  host.innerHTML = "";
  setTilesScrollMode(host, offerings.length + 1);
  const noneWrap = document.createElement("div");
  noneWrap.className = "ecu-upg__tile-wrap";
  const none = document.createElement("button");
  none.type = "button";
  none.className =
    "ecu-upg__tile is-none" + (selectedSlot == null ? " is-on" : "");
  none.title = "No offering";
  none.textContent = "None";
  none.addEventListener("click", () => onPick(null));
  noneWrap.appendChild(none);
  host.appendChild(noneWrap);

  for (let i = 0; i < offerings.length; i++) {
    const o = offerings[i];
    const wrap = document.createElement("div");
    wrap.className = "ecu-upg__tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ecu-upg__tile" + (selectedSlot === o.slot ? " is-on" : "");
    btn.title =
      o.displayName +
      " · " +
      o.name +
      (o.grade != null ? " · grade " + o.grade : "") +
      " · ×" +
      o.q;
    const icon = document.createElement("span");
    mountItemIcon(icon, { name: o.name, q: o.q, size: 40 });
    btn.appendChild(icon);
    const qty = document.createElement("span");
    qty.className = "ecu-upg__tile-qty";
    qty.textContent = "×" + o.q;
    btn.appendChild(qty);
    btn.addEventListener("click", () => onPick(o.slot));
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
    let scrollSlot: number | null = liveOffer.scrolls[0]
      ? liveOffer.scrolls[0].slot
      : null;
    let offeringSlot: number | null = null;
    let pickFocus: PickFocus = scrollSlot == null ? "scroll" : null;
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
      "Grade " + liveOffer.grade + " · " + accessHint(liveOffer.access);

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
      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      const offering = findOffering(liveOffer.offerings, offeringSlot);
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

    const paint = () => {
      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      const offering = findOffering(liveOffer.offerings, offeringSlot);

      const highlight: number[] = [liveOffer.item.slot];
      if (scroll) highlight.push(scroll.slot);
      if (offering) highlight.push(offering.slot);
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
          title: "Click, then pick a scroll (tiles or bag)",
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

      appendScrollTiles(scrollTiles, liveOffer.scrolls, scrollSlot, (slot) => {
        if (busy) return;
        scrollSlot = slot;
        pickFocus = null;
        paint();
        refreshChanceEstimate();
      });
      appendOfferingTiles(
        offerTiles,
        liveOffer.offerings,
        offeringSlot,
        (slot) => {
          if (busy) return;
          offeringSlot = slot;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
      );
      const ready = scrollSlot != null || offeringSlot != null;
      okBtn.disabled = busy || !ready;
      okBtn.textContent = liveOffer.access.ok ? "Upgrade" : "Travel & upgrade";
      if (!busy) {
        if (pickFocus === "scroll") {
          hint.textContent = "Pick a scroll from the tiles or bag.";
        } else if (pickFocus === "offering") {
          hint.textContent =
            "Pick an offering from the tiles or bag (or None).";
        } else if (!ready) {
          hint.textContent = "Pick a scroll (or an offering).";
        } else {
          hint.textContent = "";
        }
      }

      scrollSection.classList.toggle("is-focus", pickFocus === "scroll");
      offerSection.classList.toggle("is-focus", pickFocus === "offering");
    };

    const rebindAfterSuccess = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
    ) => {
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
      liveOffer = nextOffer;
      fromLevel =
        liveOffer.item.level != null &&
        Number.isFinite(Number(liveOffer.item.level))
          ? Number(liveOffer.item.level)
          : nextLevel;
      const keepScroll = keptScrollName
        ? liveOffer.scrolls.find((s) => s.name === keptScrollName)
        : null;
      scrollSlot = keepScroll
        ? keepScroll.slot
        : liveOffer.scrolls[0]
          ? liveOffer.scrolls[0].slot
          : null;
      const keepOffering = keptOfferingName
        ? liveOffer.offerings.find((o) => o.name === keptOfferingName)
        : null;
      offeringSlot = keepOffering ? keepOffering.slot : null;
      pickFocus = scrollSlot == null ? "scroll" : null;
      itemName.textContent = levelTransitionLabel(
        fromLevel,
        liveOffer.displayName,
      );
      meta.textContent =
        "Grade " + liveOffer.grade + " · " + accessHint(liveOffer.access);
      paintTrialResult(trial, liveOffer.item, fromLevel + 1);
      busy = false;
      hint.textContent = "Ready for next upgrade.";
      paint();
      refreshChanceEstimate();
    };

    const unsubBagClick = installBagPickClick((slot) => {
      if (busy) return false;
      if (pickFocus === "scroll") {
        const s = findScroll(liveOffer.scrolls, slot);
        if (!s) return false;
        scrollSlot = s.slot;
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      if (pickFocus === "offering") {
        const o = findOffering(liveOffer.offerings, slot);
        if (!o) return false;
        offeringSlot = o.slot;
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      const s = findScroll(liveOffer.scrolls, slot);
      if (s) {
        scrollSlot = s.slot;
        paint();
        refreshChanceEstimate();
        return true;
      }
      const o = findOffering(liveOffer.offerings, slot);
      if (o) {
        offeringSlot = o.slot;
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

    const tryConfirm = () => {
      if (okBtn.disabled || busy) return;
      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      const offering = findOffering(liveOffer.offerings, offeringSlot);
      const picked: UpgradeDialogResult = {
        item: fpFromPick(liveOffer.item),
        scroll: scroll ? fpFromPick(scroll) : null,
        offering: offering ? fpFromPick(offering) : null,
      };
      if (!options || !options.execute) {
        closeDialog(picked);
        return;
      }
      const bag = observingBagItems();
      const beforeAtLevel = countNameLevel(
        bag,
        liveOffer.item.name,
        fromLevel,
      );
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
        beforeAtLevel,
        beforeNext,
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
          busy = false;
          hint.textContent = "Failed — item gone.";
          window.setTimeout(() => closeDialog(null), 1600);
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
    let scrollSlot: number | null = liveOffer.scrolls[0]
      ? liveOffer.scrolls[0].slot
      : null;
    let offeringSlot: number | null = null;
    let pickFocus: PickFocus =
      selected.size < 2 ? "partner" : scrollSlot == null ? "scroll" : null;
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
      if (selected.size !== 2 || scrollSlot == null) {
        lastChance = null;
        chanceUi.setEmpty("Need 3 copies + scroll to estimate chance");
        return;
      }
      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      if (!scroll) {
        lastChance = null;
        chanceUi.setEmpty("Need a compound scroll to estimate chance");
        return;
      }
      const offering = findOffering(liveOffer.offerings, offeringSlot);
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

    const paint = () => {
      const partnerList: BagSlotRef[] = [];
      const keys = Array.from(selected.values()).sort((a, b) => a - b);
      for (let i = 0; i < keys.length; i++) {
        const found = liveOffer.partners.find((p) => p.slot === keys[i]);
        if (found) partnerList.push(found);
      }

      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      const offering = findOffering(liveOffer.offerings, offeringSlot);

      const highlight: number[] = [liveOffer.item.slot];
      for (let i = 0; i < partnerList.length; i++) {
        highlight.push(partnerList[i].slot);
      }
      if (scroll) highlight.push(scroll.slot);
      if (offering) highlight.push(offering.slot);
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
      appendScrollTiles(scrollTiles, liveOffer.scrolls, scrollSlot, (slot) => {
        if (busy) return;
        scrollSlot = slot;
        pickFocus = null;
        paint();
        refreshChanceEstimate();
      });
      appendOfferingTiles(
        offerTiles,
        liveOffer.offerings,
        offeringSlot,
        (slot) => {
          if (busy) return;
          offeringSlot = slot;
          pickFocus = null;
          paint();
          refreshChanceEstimate();
        },
      );

      const ready = selected.size === 2 && scrollSlot != null;
      okBtn.disabled = busy || !ready;
      okBtn.textContent = liveOffer.access.ok
        ? "Compound"
        : "Travel & compound";
      if (!busy) {
        if (pickFocus === "partner" || selected.size !== 2) {
          hint.textContent = "Select exactly two other copies (tiles or bag).";
        } else if (pickFocus === "scroll" || scrollSlot == null) {
          hint.textContent = "Pick a compound scroll (tiles or bag).";
        } else if (pickFocus === "offering") {
          hint.textContent =
            "Pick an offering from the tiles or bag (or None).";
        } else {
          hint.textContent = "";
        }
      }

      partnerSection.classList.toggle("is-focus", pickFocus === "partner");
      scrollSection.classList.toggle("is-focus", pickFocus === "scroll");
      offerSection.classList.toggle("is-focus", pickFocus === "offering");
    };

    const rebindAfterSuccess = (
      keptScrollName: string | null,
      keptOfferingName: string | null,
    ) => {
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
      liveOffer = nextOffer;
      fromLevel =
        liveOffer.item.level != null &&
        Number.isFinite(Number(liveOffer.item.level))
          ? Number(liveOffer.item.level)
          : nextLevel;
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
      scrollSlot = keepScroll
        ? keepScroll.slot
        : liveOffer.scrolls[0]
          ? liveOffer.scrolls[0].slot
          : null;
      const keepOffering = keptOfferingName
        ? liveOffer.offerings.find((o) => o.name === keptOfferingName)
        : null;
      offeringSlot = keepOffering ? keepOffering.slot : null;
      pickFocus =
        selected.size < 2 ? "partner" : scrollSlot == null ? "scroll" : null;
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
      hint.textContent = "Ready for next compound.";
      paint();
      refreshChanceEstimate();
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
        const s = findScroll(liveOffer.scrolls, slot);
        if (!s) return false;
        scrollSlot = s.slot;
        pickFocus = null;
        paint();
        refreshChanceEstimate();
        return true;
      }
      if (pickFocus === "offering") {
        const o = findOffering(liveOffer.offerings, slot);
        if (!o) return false;
        offeringSlot = o.slot;
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
      const s = findScroll(liveOffer.scrolls, slot);
      if (s) {
        scrollSlot = s.slot;
        paint();
        refreshChanceEstimate();
        return true;
      }
      const o = findOffering(liveOffer.offerings, slot);
      if (o) {
        offeringSlot = o.slot;
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

    const tryConfirm = () => {
      if (okBtn.disabled || busy) return;
      const scroll = findScroll(liveOffer.scrolls, scrollSlot);
      if (!scroll || selected.size !== 2) return;
      const partnerSlots = Array.from(selected.values()).sort((a, b) => a - b);
      const p0 = liveOffer.partners.find((p) => p.slot === partnerSlots[0]);
      const p1 = liveOffer.partners.find((p) => p.slot === partnerSlots[1]);
      if (!p0 || !p1) return;
      const offering = findOffering(liveOffer.offerings, offeringSlot);
      const picked: CompoundDialogResult = {
        items: [fpFromPick(liveOffer.item), fpFromPick(p0), fpFromPick(p1)],
        scroll: fpFromPick(scroll),
        offering: offering ? fpFromPick(offering) : null,
      };
      if (!options || !options.execute) {
        closeDialog(picked);
        return;
      }
      const bag = observingBagItems();
      const beforeAtLevel = countNameLevel(
        bag,
        liveOffer.item.name,
        fromLevel,
      );
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
        beforeAtLevel,
        beforeNext,
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
          busy = false;
          hint.textContent = "Failed — copies gone.";
          window.setTimeout(() => closeDialog(null), 1600);
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
