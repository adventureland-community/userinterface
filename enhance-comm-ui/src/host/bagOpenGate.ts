/**
 * Bag needs a watched character — toast + open the phone Character sheet
 * when someone tries to open inventory without observing.
 */

import { getObservingId } from "./al";
import { showCommToast } from "./commToast";
import { openPhoneObserve } from "./phoneTourChrome";

/** @returns true when bag may open. */
export function gateObservedBagOpen(): boolean {
  if (getObservingId()) return true;
  // Overlay harness always has a preview character — never bounce to Observe.
  const overlayPreview =
    !!(window as { __ecuOverlayPreview?: boolean }).__ecuOverlayPreview ||
    (typeof location !== "undefined" &&
      /\/overlay(?:\/|$|\?)/.test(location.pathname + location.search));
  if (overlayPreview) {
    const ents = window.entities ? Object.values(window.entities) : [];
    let ent =
      (window as { observing?: { id?: unknown } | null }).observing || null;
    if (!ent || ent.id == null) {
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i] as { id?: unknown; type?: string } | null;
        if (e && e.id != null && e.type !== "monster") {
          ent = e;
          break;
        }
      }
      if ((!ent || ent.id == null) && ents[0] && (ents[0] as { id?: unknown }).id != null) {
        ent = ents[0] as { id?: unknown };
      }
      if (ent) (window as { observing?: unknown }).observing = ent;
    }
    return true;
  }
  showCommToast("Observe a character first");
  openPhoneObserve();
  return false;
}
