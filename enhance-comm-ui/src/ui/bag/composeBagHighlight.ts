/**
 * Highlight bag slots queued as mail compose attachments.
 */

import { ensureComposeDraftHydrated } from "../../host/mail/mailCompose";
import {
  getActiveComposeDraft,
  subscribeMailStore,
} from "../../host/mail/mailState";

const HOST_ID = "bottomleftcorner";
export const COMPOSE_BAG_QUEUE_CLASS = "is-ecu-compose-queue";

let activeSlots: number[] = [];
let installed = false;

function uniqueSlots(slots: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const n = Number(slots[i]);
    if (!Number.isFinite(n) || n < 0) continue;
    const slot = n | 0;
    if (seen.has(slot)) continue;
    seen.add(slot);
    out.push(slot);
  }
  return out;
}

/** Slots from compose attaches (deduped, inventory order). */
export function slotsFromComposeAttaches(
  attaches: Array<{ slot: number }>,
): number[] {
  const slots: number[] = [];
  for (let i = 0; i < attaches.length; i++) {
    slots.push(attaches[i].slot);
  }
  return uniqueSlots(slots);
}

/** Re-stamp highlight classes on the live inventory grid. */
export function applyComposeBagHighlights(): void {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  const want = new Set(activeSlots);
  const nodes = host.querySelectorAll("[data-cnum]");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    const raw = node.getAttribute("data-cnum");
    if (raw == null || raw === "") {
      node.classList.remove(COMPOSE_BAG_QUEUE_CLASS);
      continue;
    }
    const num = parseInt(raw, 10);
    if (want.has(num)) node.classList.add(COMPOSE_BAG_QUEUE_CLASS);
    else node.classList.remove(COMPOSE_BAG_QUEUE_CLASS);
  }
}

/** Replace the set of compose-queued bag slots and refresh the grid. */
export function setComposeBagHighlights(slots: number[]): void {
  activeSlots = uniqueSlots(slots);
  applyComposeBagHighlights();
}

export function clearComposeBagHighlights(): void {
  activeSlots = [];
  applyComposeBagHighlights();
}

export function getComposeBagHighlights(): readonly number[] {
  return activeSlots;
}

export function syncComposeBagHighlightsFromDraft(): void {
  const draft = getActiveComposeDraft();
  setComposeBagHighlights(slotsFromComposeAttaches(draft.attaches));
}

/** Hydrate draft, stamp once, keep bag highlights in sync with compose. */
export function installComposeBagHighlight(): () => void {
  if (installed) return () => {};
  installed = true;
  ensureComposeDraftHydrated();
  syncComposeBagHighlightsFromDraft();
  const unsub = subscribeMailStore(syncComposeBagHighlightsFromDraft);
  return () => {
    unsub();
    installed = false;
    clearComposeBagHighlights();
  };
}
