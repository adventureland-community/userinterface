/**
 * Highlight bag slots that feed the open Upgrade / Compound shrine dialog.
 */

const HOST_ID = "bottomleftcorner";
export const SHRINE_BAG_PICK_CLASS = "is-ecu-shrine-pick";

let activeSlots: number[] = [];

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

/** Re-stamp highlight classes on the live inventory grid. */
export function applyShrineBagHighlights(): void {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  const want = new Set(activeSlots);
  const nodes = host.querySelectorAll("[data-cnum]");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    const raw = node.getAttribute("data-cnum");
    if (raw == null || raw === "") {
      node.classList.remove(SHRINE_BAG_PICK_CLASS);
      continue;
    }
    const num = parseInt(raw, 10);
    if (want.has(num)) node.classList.add(SHRINE_BAG_PICK_CLASS);
    else node.classList.remove(SHRINE_BAG_PICK_CLASS);
  }
}

/** Replace the set of shrine-selected bag slots and refresh the grid. */
export function setShrineBagHighlights(slots: number[]): void {
  activeSlots = uniqueSlots(slots);
  applyShrineBagHighlights();
}

export function clearShrineBagHighlights(): void {
  activeSlots = [];
  applyShrineBagHighlights();
}

export function getShrineBagHighlights(): readonly number[] {
  return activeSlots;
}
