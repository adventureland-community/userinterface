/**
 * Panel open/close + session teardown.
 */

import {
  requestMailHead,
  resetPrefetchPages,
  schedulePrefetch,
  stopPrefetch,
} from "./mailCache";
import { hydrateMailCacheFromIdb, schedulePersistMailCache } from "./mailPersist";
import { clearUndoState } from "./mailDelete";
import { ensureComposeDraftHydrated } from "./mailCompose";
import { clearPendingOutcome } from "./mailOutcomes";
import {
  clearMailSessionCore,
  commit,
  getMailSnapshot,
} from "./mailState";

export function clearMailSession(): void {
  stopPrefetch();
  resetPrefetchPages();
  clearPendingOutcome();
  clearUndoState();
  clearMailSessionCore();
  commit({});
}

export function setMailPanelOpen(open: boolean): void {
  if (!open) {
    commit({ panelOpen: false });
    stopPrefetch();
    schedulePersistMailCache();
    return;
  }
  ensureComposeDraftHydrated();
  resetPrefetchPages();
  commit({ panelOpen: true });
  void (async () => {
    await hydrateMailCacheFromIdb();
    await requestMailHead("open");
    if (getMailSnapshot().panelOpen) schedulePrefetch();
  })();
}
