/**
 * Contextual tour triggers — fire once per tour id when the user interacts.
 * Pending queue retries after the current tour / modal unblocks.
 */

import { getSettings } from "../../../../lib/settings";
import { isTourCompleted } from "./tourCatalog";

export type ContextualTourHost = {
  isBlocked: () => boolean;
  /** @returns false if the tour could not start (already busy) — caller should queue. */
  startTour: (id: string) => boolean;
};

let host: ContextualTourHost | null = null;
const pendingQueue: string[] = [];

export function registerContextualTourHost(
  next: ContextualTourHost | null,
): void {
  host = next;
}

/** Contextual tours only after intro wizard is dismissed. */
export function contextualToursAllowed(): boolean {
  return !!getSettings().setupWizardDone;
}

function enqueuePending(id: string): void {
  for (let i = 0; i < pendingQueue.length; i++) {
    if (pendingQueue[i] === id) return;
  }
  pendingQueue.push(id);
}

/** Start the next queued contextual tour if the host is free. */
export function flushContextualTourQueue(): void {
  if (!host || !contextualToursAllowed()) return;
  if (host.isBlocked()) return;
  while (pendingQueue.length > 0) {
    const id = pendingQueue.shift()!;
    if (isTourCompleted(id)) continue;
    if (host.isBlocked() || !host.startTour(id)) {
      enqueuePending(id);
      return;
    }
    return;
  }
}

export function tryContextualTour(id: string, delayMs?: number): void {
  if (!host || !contextualToursAllowed()) return;
  if (isTourCompleted(id)) return;

  const run = () => {
    if (!host || isTourCompleted(id)) return;
    if (host.isBlocked() || !host.startTour(id)) {
      enqueuePending(id);
    }
  };

  if (delayMs != null && delayMs > 0) {
    window.setTimeout(run, delayMs);
    return;
  }
  run();
}
