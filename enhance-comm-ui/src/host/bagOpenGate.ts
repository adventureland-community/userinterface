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
  showCommToast("Observe a character first");
  openPhoneObserve();
  return false;
}
