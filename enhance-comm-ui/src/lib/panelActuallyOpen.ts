/**
 * True when a Comm panel shell is on-screen and hittable — not merely
 * `panelVisible === true` in settings. Stuck visible flags + toggle handlers
 * used to no-op chrome Bag/Mail/Market clicks (state said open, DOM empty).
 *
 * Bag is special: the PositionedPanel shell can stay large while
 * `#bottomleftcorner .theinventory` is empty (inventory flag stuck open).
 */

function isOnScreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  if (cs.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  if (!(r.width > 40 && r.height > 40)) return false;
  // Off-viewport shells used to count as open → chrome toggle closed them
  // (looked like a dead click) until a resize brought them on-screen.
  const vw =
    typeof window !== "undefined" && window.innerWidth > 0
      ? window.innerWidth
      : 0;
  const vh =
    typeof window !== "undefined" && window.innerHeight > 0
      ? window.innerHeight
      : 0;
  if (!(vw > 0 && vh > 0)) return true;
  // Any real intersection with the viewport counts (avoid tight insets that
  // false-negatived the bottom-anchored bag).
  return r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
}

export function panelActuallyOpen(id: string): boolean {
  if (typeof document === "undefined") return false;
  if (id === "bag") {
    const grid = document.querySelector(
      "#bottomleftcorner .theinventory",
    ) as HTMLElement | null;
    return isOnScreen(grid);
  }
  const el = document.querySelector(
    '[data-panel="' + id + '"]',
  ) as HTMLElement | null;
  return isOnScreen(el);
}
