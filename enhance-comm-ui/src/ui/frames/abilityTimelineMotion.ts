/**
 * Paint-synced rail motion. React owns labels / classes; this writes %
 * positions on existing nodes. Recast remounts via castGen so the same
 * marker never travels backward along the rail.
 */

import { abilityScrollPos } from "../../instance/abilityTimelineModel";

export function tickAbilityMotion(
  host: HTMLElement,
  now: number = Date.now(),
): void {
  const nodes = host.querySelectorAll("[data-abil-ends]");
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement;
    const ends = Number(el.getAttribute("data-abil-ends"));
    const cd = Number(el.getAttribute("data-abil-cd"));
    const win = Number(el.getAttribute("data-abil-win"));
    if (!(ends > 0) || !(cd > 0) || !(win > 0)) continue;
    const rem = Math.max(0, ends - now);
    let pos = abilityScrollPos(rem, cd, rem <= 0, win);
    const lastRaw = el.getAttribute("data-abil-pos");
    const last = lastRaw ? Number(lastRaw) : NaN;
    // Never travel backward on the same node (recast remounts via castGen).
    if (Number.isFinite(last) && pos > last + 0.04) {
      pos = last;
    }
    el.setAttribute("data-abil-pos", pos.toFixed(4));
    applyAbilityMotion(el, pos);
  }
}

export function applyAbilityMotion(el: HTMLElement, pos: number): void {
  const timeline = el.closest(".ecu-abil-timeline") as HTMLElement | null;
  const panel = el.closest(".ecu-abil-panel") as HTMLElement | null;
  const orient = timeline?.getAttribute("data-orient") || "vertical";
  const reverse = panel?.getAttribute("data-reverse") === "true";
  const kind = el.getAttribute("data-abil-kind");
  const pct = (pos * 100).toFixed(4) + "%";
  if (kind === "trail") {
    if (orient === "vertical") {
      el.style.height = pct;
      el.style.width = "2px";
      if (reverse) {
        el.style.top = "0";
        el.style.bottom = "auto";
      } else {
        el.style.bottom = "0";
        el.style.top = "auto";
      }
    } else {
      el.style.width = pct;
      el.style.height = "2px";
      if (reverse) {
        el.style.left = "0";
        el.style.right = "auto";
      } else {
        el.style.right = "0";
        el.style.left = "auto";
      }
    }
    return;
  }
  if (orient === "vertical") {
    if (reverse) {
      el.style.top = pct;
      el.style.bottom = "auto";
    } else {
      el.style.bottom = pct;
      el.style.top = "auto";
    }
  } else if (reverse) {
    el.style.left = pct;
    el.style.right = "auto";
  } else {
    el.style.right = pct;
    el.style.left = "auto";
  }
}
