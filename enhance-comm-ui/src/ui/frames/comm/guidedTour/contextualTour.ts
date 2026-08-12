/**
 * Contextual tour triggers — fire once per tour id when the user interacts.
 */

import { getSettings } from "../../../../lib/settings";
import { isTourCompleted } from "./tourCatalog";

export type ContextualTourHost = {
  isBlocked: () => boolean;
  startTour: (id: string) => void;
};

let host: ContextualTourHost | null = null;

export function registerContextualTourHost(
  next: ContextualTourHost | null,
): void {
  host = next;
}

/** Contextual tours only after intro wizard is dismissed. */
export function contextualToursAllowed(): boolean {
  return !!getSettings().setupWizardDone;
}

export function tryContextualTour(id: string, delayMs?: number): void {
  if (!host || !contextualToursAllowed()) return;
  if (isTourCompleted(id)) return;

  const run = () => {
    if (!host || host.isBlocked()) return;
    if (isTourCompleted(id)) return;
    host.startTour(id);
  };

  if (delayMs != null && delayMs > 0) {
    window.setTimeout(run, delayMs);
    return;
  }
  run();
}
