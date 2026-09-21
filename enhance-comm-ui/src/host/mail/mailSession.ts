/**
 * Panel open/close, session teardown, and open-mail pub/sub.
 */

import {
  requestMailHead,
  resetPrefetchPages,
  schedulePrefetch,
  setMailSearchBurst,
  stopPrefetch,
} from "./mailCache";
import {
  hydrateMailCacheFromIdb,
  resetMailAccountKeyPin,
  schedulePersistMailCache,
} from "./mailPersist";
import { flushPendingMailDeletes } from "./mailDelete";
import { ensureComposeDraftHydrated } from "./mailCompose";
import { clearPendingOutcome } from "./mailOutcomes";
import {
  clearMailSessionCore,
  commit,
  getMailSnapshot,
  notify,
} from "./mailState";
import type { ComposeDraft, ItemFingerprint } from "./types";

/** Bumps on each open/close so in-flight hydrate/head cannot clobber a new session. */
let openGen = 0;

function isCurrentOpenGen(gen: number): boolean {
  return gen === openGen;
}

export function clearMailSession(): void {
  openGen += 1;
  stopPrefetch();
  resetPrefetchPages();
  clearPendingOutcome();
  void flushPendingMailDeletes();
  resetMailAccountKeyPin();
  clearMailSessionCore();
  notify();
}

export function setMailPanelOpen(open: boolean): void {
  if (!open) {
    openGen += 1;
    commit({ panelOpen: false });
    setMailSearchBurst(false);
    stopPrefetch();
    void flushPendingMailDeletes().then(() => {
      schedulePersistMailCache();
    });
    return;
  }
  const gen = ++openGen;
  ensureComposeDraftHydrated();
  resetPrefetchPages();
  commit({ panelOpen: true });
  void (async () => {
    await hydrateMailCacheFromIdb(gen, isCurrentOpenGen);
    if (!isCurrentOpenGen(gen) || !getMailSnapshot().panelOpen) return;
    await requestMailHead("open");
    if (!isCurrentOpenGen(gen) || !getMailSnapshot().panelOpen) return;
    schedulePrefetch();
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
