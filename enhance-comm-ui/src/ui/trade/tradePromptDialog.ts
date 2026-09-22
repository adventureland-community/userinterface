/**
 * Non-blocking trade prompts (window.prompt freezes the game socket).
 */

import { getObserving } from "../../host/al";
import type { EntityLike, SlotLike } from "../../host/globals";
import {
  getCachedMarketMerchants,
  hydrateMarketCacheFromIdb,
} from "../../host/market";
import { itemInstanceHtml, itemInstanceLabel } from "../../lib/gameIcon";
import { marketCatalogPricesForItem } from "../../lib/market/marketCatalogPricing";
import {
  defaultTradePriceNumber,
  parseTradeGoldInput,
  tradePriceSuggestions,
  type TradePriceDialogMode,
  type TradePriceSuggestion,
} from "../../lib/tradePriceMemory";
import { formatTradeGold } from "../../lib/tradeHelpers";
import { ensureTradePromptDialogCss } from "./tradePromptDialogCss";

export type { TradePriceDialogMode };

let openBackdrop: HTMLDivElement | null = null;
let finishOpen: ((value: unknown) => void) | null = null;

function closeDialog(value: unknown): void {
  const finish = finishOpen;
  finishOpen = null;
  if (openBackdrop) {
    openBackdrop.remove();
    openBackdrop = null;
  }
  finish?.(value);
}

type NumberDialogOptions = {
  title: string;
  itemLine?: string;
  label: string;
  suffix?: string;
  defaultValue?: number | null;
  suggestions?: TradePriceSuggestion[];
  min?: number;
  max?: number;
};

function showNumberDialog(options: NumberDialogOptions): Promise<number | null> {
  closeDialog(null);
  ensureTradePromptDialogCss();

  return new Promise((resolve) => {
    finishOpen = resolve;

    const min = options.min != null ? Number(options.min) | 0 : 1;
    const max = options.max != null ? Number(options.max) | 0 : 0;
    const initial =
      options.defaultValue != null && options.defaultValue > 0
        ? options.defaultValue | 0
        : options.suggestions && options.suggestions.length
          ? options.suggestions[0].price
          : min;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-trade-prompt-backdrop";
    backdrop.setAttribute("data-ecu-trade-prompt", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-trade-prompt";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.className = "ecu-trade-prompt__title";
    title.textContent = options.title;
    panel.appendChild(title);

    if (options.itemLine) {
      const itemLine = document.createElement("p");
      itemLine.className = "ecu-trade-prompt__item";
      itemLine.textContent = options.itemLine;
      panel.appendChild(itemLine);
    }

    const field = document.createElement("div");
    field.className = "ecu-trade-prompt__field";

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(min);
    if (max > 0) input.max = String(max);
    input.step = "1";
    input.value = String(initial);
    input.setAttribute("aria-label", options.label);

    const suffix = document.createElement("span");
    suffix.className = "ecu-trade-prompt__suffix";
    suffix.textContent = options.suffix || "";

    field.append(input, suffix);
    panel.appendChild(field);

    const hintEl = document.createElement("p");
    hintEl.className = "ecu-trade-prompt__hint";
    panel.appendChild(hintEl);

    const actions = document.createElement("div");
    actions.className = "ecu-trade-prompt__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "primary";
    okBtn.textContent = "OK";
    actions.append(cancelBtn, okBtn);
    panel.appendChild(actions);

    appendSuggestionChips(panel, options.suggestions, input, hintEl, initial);

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    openBackdrop = backdrop;

    const parseValue = (): number | null => {
      const n = parseInt(String(input.value).replace(/,/g, ""), 10);
      if (!Number.isFinite(n) || n < min) return null;
      if (max > 0 && n > max) return null;
      return n | 0;
    };

    const dismiss = (value: number | null) => {
      document.removeEventListener("keydown", onKey, true);
      closeDialog(value);
    };

    const confirm = () => {
      const n = parseValue();
      if (n == null) {
        hintEl.textContent =
          max > 0 ? `Enter ${min}–${max}.` : `Enter at least ${min}.`;
        input.focus();
        return;
      }
      dismiss(n);
    };

    cancelBtn.addEventListener("click", () => dismiss(null));
    okBtn.addEventListener("click", confirm);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) dismiss(null);
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss(null);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        confirm();
      }
    };
    document.addEventListener("keydown", onKey, true);

    input.addEventListener("input", () => {
      hintEl.textContent = "";
    });

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

function appendSuggestionChips(
  panel: HTMLElement,
  suggestions: TradePriceSuggestion[] | undefined,
  input: HTMLInputElement,
  hintEl: HTMLElement | null,
  initial: number,
): HTMLButtonElement[] {
  const chipButtons: HTMLButtonElement[] = [];
  if (!suggestions || !suggestions.length) return chipButtons;

  const chips = document.createElement("div");
  chips.className = "ecu-trade-prompt__chips";

  const setActiveChip = (price: number) => {
    for (let i = 0; i < chipButtons.length; i++) {
      chipButtons[i].classList.toggle(
        "is-active",
        suggestions[i].price === price,
      );
    }
  };

  for (let i = 0; i < suggestions.length; i++) {
    const sug = suggestions[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ecu-trade-prompt__chip" +
      (sug.kind ? ` ecu-trade-prompt__chip--${sug.kind}` : "");
    btn.textContent = sug.label;
    btn.title = sug.kind
      ? `${formatTradeGold(sug.price)} gold`
      : sug.label;
    btn.addEventListener("click", () => {
      input.value = String(sug.price);
      setActiveChip(sug.price);
      if (hintEl) hintEl.textContent = "";
      input.focus();
    });
    chipButtons.push(btn);
    chips.appendChild(btn);
  }

  const actions = panel.querySelector(".ecu-trade-prompt__actions");
  if (actions) panel.insertBefore(chips, actions);
  else panel.appendChild(chips);

  setActiveChip(initial);
  return chipButtons;
}

function appendItemHeader(
  panel: HTMLElement,
  itemName: string,
  label: string,
  options?: { level?: number; p?: string; skin?: string },
): void {
  const row = document.createElement("div");
  row.className = "ecu-trade-prompt__item-row";

  const iconWrap = document.createElement("div");
  iconWrap.className = "ecu-trade-prompt__icon";
  let iconHtml = "";
  try {
    iconHtml =
      itemInstanceHtml(itemName, {
        skin: options?.skin,
        size: 34,
        level: options?.level,
        p: options?.p,
        nativeTitle: false,
      }) || "";
  } catch {
    iconHtml = "";
  }
  if (iconHtml) {
    iconWrap.innerHTML = iconHtml;
  }

  const textWrap = document.createElement("div");
  textWrap.className = "ecu-trade-prompt__item-text";
  const nameEl = document.createElement("div");
  nameEl.className = "ecu-trade-prompt__item-name";
  nameEl.textContent = label;
  textWrap.appendChild(nameEl);

  row.append(iconWrap, textWrap);
  panel.insertBefore(row, panel.children[1] || null);
}

function appendNearbySection(
  panel: HTMLElement,
  suggestions: TradePriceSuggestion[],
): void {
  const nearby = suggestions.filter((s) => s.kind === "nearby");
  if (!nearby.length) return;

  const section = document.createElement("div");
  section.className = "ecu-trade-prompt__nearby";

  const heading = document.createElement("div");
  heading.className = "ecu-trade-prompt__nearby-title";
  heading.textContent = "Nearby listings";
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = "ecu-trade-prompt__nearby-list";
  for (let i = 0; i < nearby.length; i++) {
    const row = document.createElement("div");
    row.className = "ecu-trade-prompt__nearby-row";
    row.textContent = nearby[i].label;
    list.appendChild(row);
  }
  section.appendChild(list);

  const field = panel.querySelector(".ecu-trade-prompt__field");
  if (field) panel.insertBefore(section, field);
  else panel.appendChild(section);
}

function appendMarketCatalogSection(
  panel: HTMLElement,
  itemName: string,
  level?: number | null,
): void {
  const info = marketCatalogPricesForItem(
    itemName,
    getCachedMarketMerchants(),
    { level, max: 4 },
  );
  if (!info.sells.length && !info.wants.length) return;

  const section = document.createElement("div");
  section.className = "ecu-trade-prompt__nearby ecu-trade-prompt__market";

  const heading = document.createElement("div");
  heading.className = "ecu-trade-prompt__nearby-title";
  heading.textContent = "Market catalog";
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = "ecu-trade-prompt__nearby-list";

  if (info.sells.length) {
    const low = info.sells[0];
    const sellRow = document.createElement("div");
    sellRow.className = "ecu-trade-prompt__nearby-row";
    const high = info.sells[info.sells.length - 1];
    sellRow.textContent =
      info.sells.length === 1
        ? `Sell low · ${low.merchant} · ${formatTradeGold(low.price)}g`
        : `Sell · ${formatTradeGold(low.price)}g–${formatTradeGold(high.price)}g · ${info.sells.length} prices`;
    list.appendChild(sellRow);
  }
  if (info.wants.length) {
    const highWant = info.wants[0];
    const wantRow = document.createElement("div");
    wantRow.className = "ecu-trade-prompt__nearby-row";
    wantRow.textContent = `Want high · ${highWant.merchant} · ${formatTradeGold(highWant.price)}g`;
    list.appendChild(wantRow);
  }
  section.appendChild(list);

  const field = panel.querySelector(".ecu-trade-prompt__field");
  if (field) panel.insertBefore(section, field);
  else panel.appendChild(section);
}

function appendMarketHint(
  panel: HTMLElement,
  itemName: string,
): void {
  const name = String(itemName || "").trim();
  if (!name) return;
  const info = marketCatalogPricesForItem(name, getCachedMarketMerchants(), {
    max: 1,
  });
  if (!info.sells.length && !info.wants.length) return;

  const hint = document.createElement("p");
  hint.className = "ecu-trade-prompt__market-hint";
  const parts: string[] = [];
  if (info.sells.length) {
    parts.push(`Sell low ${formatTradeGold(info.sells[0].price)}g`);
  }
  if (info.wants.length) {
    parts.push(`Want ${formatTradeGold(info.wants[0].price)}g`);
  }
  hint.textContent = `Market · ${parts.join(" · ")}`;
  const field = panel.querySelector(".ecu-trade-prompt__field");
  if (field) panel.insertBefore(hint, field);
  else panel.appendChild(hint);
}

export async function showTradePriceDialog(options: {
  mode: TradePriceDialogMode;
  itemName: string;
  itemLabel?: string;
  level?: number;
  p?: string;
  skin?: string;
  slots?: Record<string, SlotLike | null | undefined> | null;
  currentPrice?: number;
}): Promise<number | null> {
  closeDialog(null);
  ensureTradePromptDialogCss();

  if (!getCachedMarketMerchants().length) {
    try {
      await hydrateMarketCacheFromIdb();
    } catch {
      /* ignore */
    }
  }

  const name = String(options.itemName || "").trim();
  const label =
    options.itemLabel ||
    itemInstanceLabel(name, { level: options.level, p: options.p });
  const title =
    options.mode === "wishlist"
      ? "Wishlist buy price"
      : options.mode === "reprice"
        ? "Change price"
        : "List for sale";

  const suggestionOpts = {
    slots: options.slots,
    currentPrice: options.currentPrice,
    level: options.level,
    observer: getObserving() ?? (window.observing as EntityLike | null),
    mode: options.mode,
  };
  const suggestions = tradePriceSuggestions(name, suggestionOpts);
  const defaultValue = defaultTradePriceNumber(name, suggestionOpts);

  return new Promise((resolve) => {
    finishOpen = resolve;

    const min = 1;
    const initial = defaultValue > 0 ? defaultValue : min;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-trade-prompt-backdrop";
    backdrop.setAttribute("data-ecu-trade-prompt", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-trade-prompt ecu-trade-prompt--price";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    const titleEl = document.createElement("h2");
    titleEl.className = "ecu-trade-prompt__title";
    titleEl.textContent = title;
    panel.appendChild(titleEl);

    appendItemHeader(panel, name, label, {
      level: options.level,
      p: options.p,
      skin: options.skin,
    });

    appendMarketCatalogSection(panel, name, options.level);
    appendNearbySection(panel, suggestions);

    const field = document.createElement("div");
    field.className = "ecu-trade-prompt__field";

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(min);
    input.step = "1";
    input.value = String(initial);
    input.setAttribute("aria-label", "Price in gold");

    const suffix = document.createElement("span");
    suffix.className = "ecu-trade-prompt__suffix";
    suffix.textContent = "gold";

    field.append(input, suffix);
    panel.appendChild(field);

    const hintEl = document.createElement("p");
    hintEl.className = "ecu-trade-prompt__hint";
    panel.appendChild(hintEl);

    const actions = document.createElement("div");
    actions.className = "ecu-trade-prompt__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "primary";
    okBtn.textContent =
      options.mode === "reprice"
        ? "Reprice"
        : options.mode === "wishlist"
          ? "Wishlist"
          : "List";
    actions.append(cancelBtn, okBtn);
    panel.appendChild(actions);

    appendSuggestionChips(panel, suggestions, input, hintEl, initial);

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    openBackdrop = backdrop;

    const dismiss = (value: number | null) => {
      document.removeEventListener("keydown", onKey, true);
      closeDialog(value);
    };

    const confirm = () => {
      const n = parseTradeGoldInput(input.value);
      if (n == null) {
        hintEl.textContent = "Enter at least 1 gold.";
        input.focus();
        input.select();
        return;
      }
      dismiss(n);
    };

    cancelBtn.addEventListener("click", () => dismiss(null));
    okBtn.addEventListener("click", confirm);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) dismiss(null);
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss(null);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        confirm();
      }
    };
    document.addEventListener("keydown", onKey, true);

    input.addEventListener("input", () => {
      hintEl.textContent = "";
    });

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

export async function showTradeQuantityDialog(options: {
  itemName: string;
  maxQ: number;
  defaultQ?: number;
}): Promise<number | null> {
  const maxQ = Math.max(1, Number(options.maxQ) | 0);
  const name = String(options.itemName || "").trim();
  const defaultQ =
    options.defaultQ != null && options.defaultQ > 0
      ? Math.min(maxQ, options.defaultQ | 0)
      : maxQ > 1
        ? Math.max(1, Math.floor(maxQ / 2))
        : 1;
  const suggestions: TradePriceSuggestion[] = [
    { label: "1", price: 1 },
    {
      label: `Half (${Math.max(1, Math.floor(maxQ / 2))})`,
      price: Math.max(1, Math.floor(maxQ / 2)),
    },
    { label: `Max (${maxQ})`, price: maxQ },
  ].filter((s, i, arr) => arr.findIndex((x) => x.price === s.price) === i);

  if (name && !getCachedMarketMerchants().length) {
    try {
      await hydrateMarketCacheFromIdb();
    } catch {
      /* ignore */
    }
  }

  closeDialog(null);
  ensureTradePromptDialogCss();

  return new Promise((resolve) => {
    finishOpen = resolve;

    const min = 1;
    const max = maxQ;
    const initial = defaultQ;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-trade-prompt-backdrop";
    backdrop.setAttribute("data-ecu-trade-prompt", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-trade-prompt";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.className = "ecu-trade-prompt__title";
    title.textContent = "Quantity";
    panel.appendChild(title);

    const itemLine = document.createElement("p");
    itemLine.className = "ecu-trade-prompt__item";
    itemLine.textContent = name ? `${name} · up to ${maxQ}` : `Up to ${maxQ}`;
    panel.appendChild(itemLine);

    appendMarketHint(panel, name);

    const field = document.createElement("div");
    field.className = "ecu-trade-prompt__field";

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = "1";
    input.value = String(initial);
    input.setAttribute("aria-label", "Quantity");

    const suffix = document.createElement("span");
    suffix.className = "ecu-trade-prompt__suffix";
    suffix.textContent = ` / ${maxQ}`;

    field.append(input, suffix);
    panel.appendChild(field);

    const hintEl = document.createElement("p");
    hintEl.className = "ecu-trade-prompt__hint";
    panel.appendChild(hintEl);

    const actions = document.createElement("div");
    actions.className = "ecu-trade-prompt__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "primary";
    okBtn.textContent = "OK";
    actions.append(cancelBtn, okBtn);
    panel.appendChild(actions);

    appendSuggestionChips(
      panel,
      maxQ > 1 ? suggestions : undefined,
      input,
      hintEl,
      initial,
    );

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    openBackdrop = backdrop;

    const parseValue = (): number | null => {
      const n = parseInt(String(input.value).replace(/,/g, ""), 10);
      if (!Number.isFinite(n) || n < min) return null;
      if (n > max) return null;
      return n | 0;
    };

    const dismiss = (value: number | null) => {
      document.removeEventListener("keydown", onKey, true);
      closeDialog(value);
    };

    const confirm = () => {
      const n = parseValue();
      if (n == null) {
        hintEl.textContent = `Enter ${min}–${max}.`;
        input.focus();
        return;
      }
      dismiss(n);
    };

    cancelBtn.addEventListener("click", () => dismiss(null));
    okBtn.addEventListener("click", confirm);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) dismiss(null);
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss(null);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        confirm();
      }
    };
    document.addEventListener("keydown", onKey, true);

    input.addEventListener("input", () => {
      hintEl.textContent = "";
    });

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

export type GiveawayPromptResult = {
  q: number;
  minutes: number;
};

const GIVEAWAY_DURATION_CHIPS: TradePriceSuggestion[] = [
  { label: "15 min", price: 15 },
  { label: "1 hour", price: 60 },
  { label: "4 hours", price: 240 },
  { label: "24 hours", price: 1440 },
];

/**
 * Single giveaway prompt: quantity (when stackable) + duration.
 * Replaces the old quantity-then-minutes two-step flow.
 */
export function showGiveawayDialog(options: {
  itemName: string;
  maxQ: number;
  defaultMins?: number;
  defaultQ?: number;
}): Promise<GiveawayPromptResult | null> {
  closeDialog(null);
  ensureTradePromptDialogCss();

  const maxQ = Math.max(1, Number(options.maxQ) | 0);
  const name = String(options.itemName || "").trim();
  const defaultMins =
    options.defaultMins != null && options.defaultMins > 0
      ? options.defaultMins | 0
      : 60;
  const defaultQ =
    options.defaultQ != null && options.defaultQ > 0
      ? Math.min(maxQ, options.defaultQ | 0)
      : maxQ > 1
        ? Math.max(1, Math.floor(maxQ / 2))
        : 1;
  const showQty = maxQ > 1;

  return new Promise((resolve) => {
    finishOpen = resolve as (value: unknown) => void;

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-trade-prompt-backdrop";
    backdrop.setAttribute("data-ecu-trade-prompt", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-trade-prompt ecu-trade-prompt--giveaway";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.className = "ecu-trade-prompt__title";
    title.textContent = "Giveaway";
    panel.appendChild(title);

    const itemLine = document.createElement("p");
    itemLine.className = "ecu-trade-prompt__item";
    itemLine.textContent = name
      ? showQty
        ? `${name} · up to ${maxQ}`
        : name
      : showQty
        ? `Up to ${maxQ}`
        : "Free giveaway on an empty trade slot";
    panel.appendChild(itemLine);

    let qtyInput: HTMLInputElement | null = null;
    if (showQty) {
      const qtyLabel = document.createElement("div");
      qtyLabel.className = "ecu-trade-prompt__field-label";
      qtyLabel.textContent = "Quantity";
      panel.appendChild(qtyLabel);

      const qtyField = document.createElement("div");
      qtyField.className = "ecu-trade-prompt__field";
      qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = String(maxQ);
      qtyInput.step = "1";
      qtyInput.value = String(defaultQ);
      qtyInput.setAttribute("aria-label", "Quantity");
      const qtySuffix = document.createElement("span");
      qtySuffix.className = "ecu-trade-prompt__suffix";
      qtySuffix.textContent = ` / ${maxQ}`;
      qtyField.append(qtyInput, qtySuffix);
      panel.appendChild(qtyField);

      const qtyChips: TradePriceSuggestion[] = [
        { label: "1", price: 1 },
        {
          label: `Half (${Math.max(1, Math.floor(maxQ / 2))})`,
          price: Math.max(1, Math.floor(maxQ / 2)),
        },
        { label: `Max (${maxQ})`, price: maxQ },
      ].filter((s, i, arr) => arr.findIndex((x) => x.price === s.price) === i);
      appendSuggestionChips(panel, qtyChips, qtyInput, null, defaultQ);
    }

    const minsLabel = document.createElement("div");
    minsLabel.className = "ecu-trade-prompt__field-label";
    minsLabel.textContent = "Duration";
    panel.appendChild(minsLabel);

    const minsField = document.createElement("div");
    minsField.className = "ecu-trade-prompt__field";
    const minsInput = document.createElement("input");
    minsInput.type = "number";
    minsInput.min = "1";
    minsInput.step = "1";
    minsInput.value = String(defaultMins);
    minsInput.setAttribute("aria-label", "Duration in minutes");
    const minsSuffix = document.createElement("span");
    minsSuffix.className = "ecu-trade-prompt__suffix";
    minsSuffix.textContent = "min";
    minsField.append(minsInput, minsSuffix);
    panel.appendChild(minsField);

    const hintEl = document.createElement("p");
    hintEl.className = "ecu-trade-prompt__hint";
    panel.appendChild(hintEl);

    const actions = document.createElement("div");
    actions.className = "ecu-trade-prompt__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "primary";
    okBtn.textContent = "Giveaway";
    actions.append(cancelBtn, okBtn);
    panel.appendChild(actions);

    // Duration chips sit above actions; qty chips were inserted earlier before
    // duration existed — re-order by inserting mins chips before actions.
    appendSuggestionChips(
      panel,
      GIVEAWAY_DURATION_CHIPS,
      minsInput,
      hintEl,
      defaultMins,
    );

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    openBackdrop = backdrop;

    const parseQty = (): number | null => {
      if (!qtyInput) return 1;
      const n = parseInt(String(qtyInput.value).replace(/,/g, ""), 10);
      if (!Number.isFinite(n) || n < 1 || n > maxQ) return null;
      return n | 0;
    };

    const parseMins = (): number | null => {
      const n = parseInt(String(minsInput.value).replace(/,/g, ""), 10);
      if (!Number.isFinite(n) || n < 1) return null;
      return n | 0;
    };

    const dismiss = (value: GiveawayPromptResult | null) => {
      document.removeEventListener("keydown", onKey, true);
      closeDialog(value);
    };

    const confirm = () => {
      const q = parseQty();
      if (q == null) {
        hintEl.textContent = `Enter quantity 1–${maxQ}.`;
        qtyInput?.focus();
        return;
      }
      const minutes = parseMins();
      if (minutes == null) {
        hintEl.textContent = "Enter at least 1 minute.";
        minsInput.focus();
        minsInput.select();
        return;
      }
      dismiss({ q, minutes });
    };

    cancelBtn.addEventListener("click", () => dismiss(null));
    okBtn.addEventListener("click", confirm);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) dismiss(null);
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss(null);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        confirm();
      }
    };
    document.addEventListener("keydown", onKey, true);

    const clearHint = () => {
      hintEl.textContent = "";
    };
    qtyInput?.addEventListener("input", clearHint);
    minsInput.addEventListener("input", clearHint);

    window.setTimeout(() => {
      const focusEl = qtyInput || minsInput;
      focusEl.focus();
      focusEl.select();
    }, 0);
  });
}

/** Duration-only prompt (qty already known). Prefer `showGiveawayDialog`. */
export function showGiveawayMinutesDialog(
  defaultMins = 60,
): Promise<number | null> {
  return showGiveawayDialog({
    itemName: "",
    maxQ: 1,
    defaultMins,
  }).then((r) => (r ? r.minutes : null));
}

export function showWishlistLevelDialog(
  itemName: string,
): Promise<number | null> {
  const name = String(itemName || "").trim();
  return showNumberDialog({
    title: "Wishlist level",
    itemLine: name ? `${name} · upgrade/compound level` : "Item level",
    label: "Level",
    suffix: "0–12",
    defaultValue: 0,
    suggestions: [
      { label: "Any (0)", price: 0 },
      { label: "+5", price: 5 },
      { label: "+7", price: 7 },
      { label: "+10", price: 10 },
    ],
    min: 0,
    max: 12,
  });
}

/** Parse gold without showing a dialog — shared helper. */
export { parseTradeGoldInput };
