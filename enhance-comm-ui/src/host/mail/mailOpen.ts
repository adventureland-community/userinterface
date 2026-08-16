/**
 * Pub/sub for opening the mail panel (chrome + bag menu + CommUI).
 */

import type { ComposeDraft, ItemFingerprint } from "./types";

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
