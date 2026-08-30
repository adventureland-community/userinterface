/**
 * Bag drag-and-drop on /comm — stock on_drop reads window.character (null while
 * observing). Bridge to invSwapCommand / swap() on the watched character.
 */

import { invSwapCommand } from "../../host/gearCommands";
import {
  canEditObservedBag,
  isObservedCommBagEvent,
} from "../../host/gearObserved";
import {
  readBagDragPayload,
  setActiveBagDragSlot,
  writeBagDragPayload,
  hasBagDragPayload,
} from "./bagDragPayload";
import { readTradeDragPayload, hasTradeDragPayload } from "./tradeDragPayload";
import { handleBagDropOnTradeSlotDelist } from "../trade/tradeSlotDragDrop";
import type { SlotLike } from "../../host/globals";
import { observingBagItem, resolveInventorySlotNum } from "./bagItemContextMenu";

const TRADE_DELIST_CLASS = "is-trade-delist-target";
const BAG_SWAP_TARGET_CLASS = "is-bag-swap-target";

let hoveredSwapSlotEl: HTMLElement | null = null;

function findBagSlotElement(
  host: HTMLElement,
  ev: DragEvent,
): HTMLElement | null {
  let el = ev.target as HTMLElement | null;
  while (el && el !== host) {
    if (el.hasAttribute("data-cnum")) return el;
    el = el.parentElement;
  }
  return null;
}

function setBagSwapHover(el: HTMLElement | null): void {
  if (hoveredSwapSlotEl === el) return;
  if (hoveredSwapSlotEl) {
    hoveredSwapSlotEl.classList.remove(BAG_SWAP_TARGET_CLASS);
  }
  hoveredSwapSlotEl = el;
  if (el) el.classList.add(BAG_SWAP_TARGET_CLASS);
}

function clearBagSwapHover(): void {
  setBagSwapHover(null);
}

function resolveDragSourceSlot(
  transferId: string,
  host: HTMLElement,
): number | null {
  if (!transferId) return null;
  const ecuMatch = /^inv:(\d+)$/.exec(transferId);
  if (ecuMatch) return parseInt(ecuMatch[1], 10);
  const el = document.getElementById(transferId);
  if (!el || !host.contains(el)) return null;
  return resolveInventorySlotNum(el, host);
}

function readDragSourceSlot(ev: DragEvent, host: HTMLElement): number | null {
  const fromPayload = readBagDragPayload(ev);
  if (fromPayload != null) return fromPayload;
  const dt = ev.dataTransfer;
  if (!dt) return null;
  return resolveDragSourceSlot(dt.getData("text") || "", host);
}

function setTradeDelistHover(host: HTMLElement, on: boolean): void {
  if (on) host.classList.add(TRADE_DELIST_CLASS);
  else host.classList.remove(TRADE_DELIST_CLASS);
}

/**
 * Capture-phase drag bridge on #bottomleftcorner (installed from BagPanel).
 * Stock item_container already sets draggable + ondrop; we intercept before
 * the broken stock handler when editing the observed bag is allowed.
 */
export function installBagDragDrop(host: HTMLElement): () => void {
  const onDragStart = (ev: DragEvent) => {
    if (!canEditObservedBag()) return;
    const target = ev.target as HTMLElement | null;
    if (!target || !host.contains(target)) return;
    const fromSlot = resolveInventorySlotNum(target, host);
    if (fromSlot == null || !Number.isFinite(fromSlot)) {
      ev.preventDefault();
      return;
    }
    if (!observingBagItem(fromSlot)) {
      ev.preventDefault();
      return;
    }
    const dt = ev.dataTransfer;
    if (!dt) return;
    writeBagDragPayload(dt, fromSlot);
    setActiveBagDragSlot(fromSlot);
    ev.stopPropagation();
  };

  const onDragEnd = () => {
    setActiveBagDragSlot(null);
    clearBagSwapHover();
  };

  const onDragOver = (ev: DragEvent) => {
    if (!canEditObservedBag()) return;
    if (hasTradeDragPayload(ev)) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
      clearBagSwapHover();
      setTradeDelistHover(host, true);
      return;
    }
    setTradeDelistHover(host, false);
    if (hasBagDragPayload(ev)) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
      const slotEl = findBagSlotElement(host, ev);
      const toSlot =
        slotEl != null ? resolveInventorySlotNum(slotEl, host) : null;
      const fromSlot = readBagDragPayload(ev);
      if (
        slotEl &&
        toSlot != null &&
        fromSlot != null &&
        toSlot !== fromSlot
      ) {
        setBagSwapHover(slotEl);
      } else {
        clearBagSwapHover();
      }
      return;
    }
    clearBagSwapHover();
  };

  const onDragLeave = (ev: DragEvent) => {
    if (!host.contains(ev.relatedTarget as Node | null)) {
      setTradeDelistHover(host, false);
      clearBagSwapHover();
    }
  };

  const onDrop = (ev: DragEvent) => {
    setTradeDelistHover(host, false);
    clearBagSwapHover();

    // Stock on_drop reads window.character (null on /comm) — always swallow bag drops.
    if (isObservedCommBagEvent(host, ev)) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (!canEditObservedBag()) return;

    const tradeSlot = readTradeDragPayload(ev);
    if (tradeSlot) {
      if (!host.contains(ev.target as Node | null)) return;
      const obs = window.observing as
        | { slots?: Record<string, SlotLike | null | undefined> }
        | null
        | undefined;
      const listing = obs?.slots?.[tradeSlot] ?? null;
      handleBagDropOnTradeSlotDelist(tradeSlot, listing ?? null);
      return;
    }

    const target = ev.target as HTMLElement | null;
    if (!target || !host.contains(target)) return;

    const toSlot = resolveInventorySlotNum(target, host);
    if (toSlot == null || !Number.isFinite(toSlot)) return;

    const fromSlot = readDragSourceSlot(ev, host);
    if (fromSlot == null || !Number.isFinite(fromSlot) || fromSlot === toSlot) {
      return;
    }

    if (!observingBagItem(fromSlot)) return;

    invSwapCommand(fromSlot, toSlot);
  };

  host.addEventListener("dragstart", onDragStart, true);
  host.addEventListener("dragover", onDragOver, true);
  host.addEventListener("dragleave", onDragLeave, true);
  host.addEventListener("drop", onDrop, true);
  document.addEventListener("dragend", onDragEnd, true);
  return () => {
    host.removeEventListener("dragstart", onDragStart, true);
    host.removeEventListener("dragover", onDragOver, true);
    host.removeEventListener("dragleave", onDragLeave, true);
    host.removeEventListener("drop", onDrop, true);
    document.removeEventListener("dragend", onDragEnd, true);
    setActiveBagDragSlot(null);
    setTradeDelistHover(host, false);
    clearBagSwapHover();
  };
}
