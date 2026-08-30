/**
 * Non-blocking trade prompts (window.prompt freezes the game socket).
 */

import { getObserving } from "../../host/al";
import type { EntityLike, SlotLike } from "../../host/globals";
import { itemInstanceHtml, itemInstanceLabel } from "../../lib/gameIcon";
import {
  defaultTradePriceNumber,
  parseTradeGoldInput,
  tradePriceSuggestions,
  type TradePriceSuggestion,
} from "../../lib/tradePriceMemory";
import { formatTradeGold } from "../../lib/tradeHelpers";
import { ensureTradePromptDialogCss } from "./tradePromptDialogCss";

let openBackdrop: HTMLDivElement | null = null;
let finishOpen: ((value: number | null) => void) | null = null;

function closeDialog(value: number | null): void {
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
  hintEl: HTMLElement,
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
    btn.title = `${formatTradeGold(sug.price)} gold`;
    btn.addEventListener("click", () => {
      input.value = String(sug.price);
      setActiveChip(sug.price);
      hintEl.textContent = "";
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

export type TradePriceDialogMode = "list" | "wishlist" | "reprice";

export function showTradePriceDialog(options: {
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

  const suggestions = tradePriceSuggestions(name, {
    slots: options.slots,
    currentPrice: options.currentPrice,
    level: options.level,
    observer: getObserving() ?? (window.observing as EntityLike | null),
  });
  const defaultValue = defaultTradePriceNumber(name, {
    slots: options.slots,
    currentPrice: options.currentPrice,
    level: options.level,
    observer: getObserving() ?? (window.observing as EntityLike | null),
  });

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

export function showTradeQuantityDialog(options: {
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

  return showNumberDialog({
    title: "Quantity",
    itemLine: name ? `${name} · up to ${maxQ}` : `Up to ${maxQ}`,
    label: "Quantity",
    suffix: ` / ${maxQ}`,
    defaultValue: defaultQ,
    suggestions: maxQ > 1 ? suggestions : undefined,
    min: 1,
    max: maxQ,
  });
}

export function showGiveawayMinutesDialog(
  defaultMins = 60,
): Promise<number | null> {
  const def = defaultMins > 0 ? defaultMins | 0 : 60;
  return showNumberDialog({
    title: "Giveaway duration",
    itemLine: "How long should the giveaway run?",
    label: "Minutes",
    suffix: "min",
    defaultValue: def,
    suggestions: [
      { label: "15 min", price: 15 },
      { label: "1 hour", price: 60 },
      { label: "4 hours", price: 240 },
      { label: "24 hours", price: 1440 },
    ],
    min: 1,
  });
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
