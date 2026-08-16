/**
 * Panel open/close, session teardown, and open-mail pub/sub.
 */

import {
  requestMailHead,
  resetPrefetchPages,
  schedulePrefetch,
  stopPrefetch,
} from "./mailCache";
import {
  hydrateMailCacheFromIdb,
  schedulePersistMailCache,
} from "./mailPersist";
import { clearUndoState } from "./mailDelete";
import { ensureComposeDraftHydrated } from "./mailCompose";
import { clearPendingOutcome } from "./mailOutcomes";
import {
  clearMailSessionCore,
  commit,
  getMailSnapshot,
  notify,
} from "./mailState";
import type { ComposeDraft, ItemFingerprint } from "./types";

export function clearMailSession(): void {
  stopPrefetch();
  resetPrefetchPages();
  clearPendingOutcome();
  clearUndoState({ silent: true });
  clearMailSessionCore();
  notify();
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

export type MailOpenPayload = {
  compose?: boolean;
  /** Bag menu edge — queues one fingerprint into session `attaches[]`. */
  attach?: ItemFingerprint | null;
  draft?: Partial<ComposeDraft>;
  /** When true and panel already open (no compose), close it. */
  toggle?: boolean;
  /** Open and jump to newest unread. */
  focusNewestUnread?: boolean;
};

type OpenListener = (payload: MailOpenPayload) => void;
const openListeners: OpenListener[] = [];

export function subscribeMailOpen(fn: OpenListener): () => void {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx >= 0) openListeners.splice(idx, 1);
  };
}

export function openMail(payload: MailOpenPayload = {}): void {
  for (let i = 0; i < openListeners.length; i++) {
    openListeners[i](payload);
  }
}
