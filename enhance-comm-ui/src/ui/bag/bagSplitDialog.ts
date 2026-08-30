/**
 * Split-stack dialog — slider, presets, and live preview (common MMO pattern).
 */

import {
  clampSplitQuantity,
  defaultSplitPeel,
  parseSplitQuantityInput,
  SPLIT_MODIFIER_HINT,
  splitPresetQuantity,
  splitPreview,
  type SplitPreset,
} from "../../lib/bagSplitMath";
import { itemInstanceLabel } from "../../lib/gameIcon";
import { maxSplitQuantity } from "../../host/bagSplitCommands";
import type { ItemFingerprint } from "../../host/mail/types";
import { ensureBagSplitDialogCss } from "./bagSplitDialogCss";

let openBackdrop: HTMLDivElement | null = null;
let finishOpen: ((value: number | null) => void) | null = null;

function closeBagSplitDialog(value: number | null): void {
  const finish = finishOpen;
  finishOpen = null;
  if (openBackdrop) {
    openBackdrop.remove();
    openBackdrop = null;
  }
  finish?.(value);
}

function formatQty(n: number): string {
  return String(Math.max(0, n | 0));
}

function setPeel(
  peel: number,
  maxPeel: number,
  range: HTMLInputElement,
  numberInput: HTMLInputElement,
  newQtyEl: HTMLElement,
  remainQtyEl: HTMLElement,
  totalQ: number,
  presetButtons: Map<SplitPreset, HTMLButtonElement>,
  hintEl: HTMLElement,
): void {
  const clamped = clampSplitQuantity(peel, maxPeel) ?? 1;
  range.value = String(clamped);
  numberInput.value = String(clamped);
  const preview = splitPreview(clamped, totalQ);
  newQtyEl.textContent = formatQty(preview.peel);
  remainQtyEl.textContent = formatQty(preview.remain);
  hintEl.textContent = "";
  const presets: SplitPreset[] = ["one", "half", "max"];
  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];
    const btn = presetButtons.get(preset);
    if (!btn) continue;
    const presetQty = splitPresetQuantity(preset, totalQ, maxPeel);
    btn.classList.toggle("is-active", presetQty === clamped);
  }
}

/**
 * Ask how many to peel into a new stack. Resolves immediately when only one
 * quantity is valid (stack of 2). Otherwise shows modal UI.
 */
export function showBagSplitDialog(fp: ItemFingerprint): Promise<number | null> {
  const maxPeel = maxSplitQuantity(fp);
  if (maxPeel <= 0) return Promise.resolve(null);
  if (maxPeel === 1) return Promise.resolve(1);

  const totalQ = fp.q != null && Number(fp.q) > 1 ? Number(fp.q) | 0 : 0;
  if (totalQ < 2) return Promise.resolve(null);

  closeBagSplitDialog(null);

  ensureBagSplitDialogCss();

  return new Promise((resolve) => {
    finishOpen = resolve;

    const label = itemInstanceLabel(String(fp.name || "item"), {
      p: fp.p,
      level: fp.level,
    });
    const initialPeel = defaultSplitPeel(totalQ, maxPeel);

    const backdrop = document.createElement("div");
    backdrop.className = "ecu-bag-split-backdrop";
    backdrop.setAttribute("data-ecu-bag-split", "1");

    const panel = document.createElement("div");
    panel.className = "ecu-bag-split";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Split stack");

    const title = document.createElement("h2");
    title.className = "ecu-bag-split__title";
    title.textContent = "Split stack";

    const itemLine = document.createElement("p");
    itemLine.className = "ecu-bag-split__item";
    itemLine.textContent = `${label} · ${formatQty(totalQ)} total`;

    const preview = document.createElement("div");
    preview.className = "ecu-bag-split__preview";

    const newStack = document.createElement("div");
    newStack.className = "ecu-bag-split__stack";
    const newLabel = document.createElement("span");
    newLabel.className = "ecu-bag-split__stack-label";
    newLabel.textContent = "New stack";
    const newQtyEl = document.createElement("span");
    newQtyEl.className = "ecu-bag-split__stack-qty";
    newStack.append(newLabel, newQtyEl);

    const arrow = document.createElement("div");
    arrow.className = "ecu-bag-split__arrow";
    arrow.textContent = "→";

    const remainStack = document.createElement("div");
    remainStack.className = "ecu-bag-split__stack";
    const remainLabel = document.createElement("span");
    remainLabel.className = "ecu-bag-split__stack-label";
    remainLabel.textContent = "Stays here";
    const remainQtyEl = document.createElement("span");
    remainQtyEl.className = "ecu-bag-split__stack-qty";
    remainStack.append(remainLabel, remainQtyEl);

    preview.append(newStack, arrow, remainStack);

    const controls = document.createElement("div");
    controls.className = "ecu-bag-split__controls";

    const range = document.createElement("input");
    range.type = "range";
    range.min = "1";
    range.max = String(maxPeel);
    range.step = "1";
    range.value = String(initialPeel);
    range.setAttribute("aria-label", "Split quantity");

    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.min = "1";
    numberInput.max = String(maxPeel);
    numberInput.step = "1";
    numberInput.value = String(initialPeel);
    numberInput.setAttribute("aria-label", "Split quantity");

    controls.append(range, numberInput);

    const presets = document.createElement("div");
    presets.className = "ecu-bag-split__presets";

    const presetButtons = new Map<SplitPreset, HTMLButtonElement>();
    const presetDefs: Array<{ preset: SplitPreset; label: string }> = [
      { preset: "one", label: "1" },
      { preset: "half", label: "Half" },
      { preset: "max", label: "Max" },
    ];
    for (let i = 0; i < presetDefs.length; i++) {
      const def = presetDefs[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = def.label;
      btn.title =
        def.preset === "one"
          ? "Peel 1 into a new stack"
          : def.preset === "half"
            ? "Split roughly in half"
            : `Peel up to ${maxPeel}`;
      presetButtons.set(def.preset, btn);
      btn.addEventListener("click", () => {
        setPeel(
          splitPresetQuantity(def.preset, totalQ, maxPeel),
          maxPeel,
          range,
          numberInput,
          newQtyEl,
          remainQtyEl,
          totalQ,
          presetButtons,
          hintEl,
        );
      });
      presets.appendChild(btn);
    }

    const hintEl = document.createElement("p");
    hintEl.className = "ecu-bag-split__hint";

    const shortcutsEl = document.createElement("p");
    shortcutsEl.className = "ecu-bag-split__shortcuts";
    shortcutsEl.textContent = SPLIT_MODIFIER_HINT;

    const actions = document.createElement("div");
    actions.className = "ecu-bag-split__actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";

    const splitBtn = document.createElement("button");
    splitBtn.type = "button";
    splitBtn.className = "primary";
    splitBtn.textContent = "Split";

    actions.append(cancelBtn, splitBtn);
    panel.append(title, itemLine, preview, controls, presets, hintEl, shortcutsEl, actions);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    openBackdrop = backdrop;

    const applyPeel = (peel: number) => {
      setPeel(
        peel,
        maxPeel,
        range,
        numberInput,
        newQtyEl,
        remainQtyEl,
        totalQ,
        presetButtons,
        hintEl,
      );
    };

    range.addEventListener("input", () => {
      applyPeel(parseInt(range.value, 10));
    });

    const onSplitWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const current = parseInt(range.value, 10);
      if (!Number.isFinite(current)) return;
      const step = ev.shiftKey ? 10 : 1;
      const delta = ev.deltaY < 0 ? step : -step;
      applyPeel(current + delta);
    };
    range.addEventListener("wheel", onSplitWheel, { passive: false });
    controls.addEventListener("wheel", onSplitWheel, { passive: false });

    numberInput.addEventListener("input", () => {
      const parsed = parseSplitQuantityInput(numberInput.value, maxPeel);
      if (parsed != null) applyPeel(parsed);
    });

    numberInput.addEventListener("change", () => {
      const parsed = parseSplitQuantityInput(numberInput.value, maxPeel);
      if (parsed == null) {
        hintEl.textContent = `Enter 1–${maxPeel}.`;
        numberInput.value = range.value;
        return;
      }
      applyPeel(parsed);
    });

    const dismiss = (value: number | null) => {
      document.removeEventListener("keydown", onKey, true);
      closeBagSplitDialog(value);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss(null);
      } else if (ev.key === "Enter" && ev.target !== cancelBtn) {
        ev.preventDefault();
        const parsed = parseSplitQuantityInput(numberInput.value, maxPeel);
        if (parsed == null) {
          hintEl.textContent = `Enter 1–${maxPeel}.`;
          numberInput.focus();
          return;
        }
        dismiss(parsed);
      }
    };

    cancelBtn.addEventListener("click", () => dismiss(null));
    splitBtn.addEventListener("click", () => {
      const parsed = parseSplitQuantityInput(numberInput.value, maxPeel);
      if (parsed == null) {
        hintEl.textContent = `Enter 1–${maxPeel}.`;
        numberInput.focus();
        return;
      }
      dismiss(parsed);
    });
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) dismiss(null);
    });
    document.addEventListener("keydown", onKey, true);

    applyPeel(initialPeel);
    window.setTimeout(() => numberInput.focus(), 0);
  });
}
