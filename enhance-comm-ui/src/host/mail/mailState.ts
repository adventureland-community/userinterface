/**
 * Shared mail session state — one write path: commit(patch).
 */

import type { ComposeDraft, MailRow, MailView } from "./types";
import { emptyDraft } from "./composeDraft";

export type MailDeleteProgress = {
  done: number;
  total: number;
};

export type MailStoreSnapshot = {
  mails: MailRow[];
  nextCursor: string | null;
  hasMore: boolean;
  lastHeadAt: number;
  lastHeadReason: string;
  status: string;
  statusKind: "" | "warn" | "err";
  loading: boolean;
  loadingMore: boolean;
  /** Prefetch timer armed between background page pulls. */
  prefetchArmed: boolean;
  panelOpen: boolean;
  view: MailView;
  lastScript: string;
  lastSeenUnread: number;
  /** New ids from the last X.unread↑ head merge (banner). */
  newMailCount: number;
  /** Block Send/Take until post-command merge finishes. */
  commandBusy: boolean;
  /** Hint after open if X.unread did not drop. */
  unreadStuckHint: string;
  /** Pending undo batch size (0 when none). */
  undoCount: number;
  /** Server-side delete progress (null when idle). */
  deleteProgress: MailDeleteProgress | null;
};

export type MailStateFields = MailStoreSnapshot & {
  sessionDraft: ComposeDraft;
};

type Listener = () => void;
type ToastListener = (message: string) => void;

const listeners: Listener[] = [];
const toastListeners: ToastListener[] = [];
const locallyReadIds = new Set<string>();

const state: MailStateFields = {
  mails: [],
  nextCursor: null,
  hasMore: false,
  lastHeadAt: 0,
  lastHeadReason: "—",
  status: "",
  statusKind: "",
  loading: false,
  loadingMore: false,
  prefetchArmed: false,
  panelOpen: false,
  view: { kind: "list" },
  lastScript: "",
  lastSeenUnread: -1,
  newMailCount: 0,
  commandBusy: false,
  unreadStuckHint: "",
  undoCount: 0,
  deleteProgress: null,
  sessionDraft: emptyDraft(),
};

function notifyListeners(): void {
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function emitToast(message: string): void {
  for (let i = 0; i < toastListeners.length; i++) toastListeners[i](message);
}

/**
 * Apply a patch atomically. Default notifies once.
 * Use `{ silent: true }` only when a later commit/notify will follow in the
 * same synchronous turn (e.g. clearMailSessionCore + commit({})).
 */
export function commit(
  patch: Partial<MailStateFields>,
  opts?: { silent?: boolean },
): void {
  Object.assign(state, patch);
  if (!(opts && opts.silent)) notifyListeners();
}

/** Notify subscribers without mutating (rare; prefer commit). */
export function notify(): void {
  notifyListeners();
}

export function setStatus(text: string, kind: "" | "warn" | "err" = ""): void {
  commit({ status: text, statusKind: kind });
}

export function setMailView(next: MailView): void {
  commit({ view: next });
}

export function subscribeMailStore(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function subscribeMailToast(fn: ToastListener): () => void {
  toastListeners.push(fn);
  return () => {
    const idx = toastListeners.indexOf(fn);
    if (idx >= 0) toastListeners.splice(idx, 1);
  };
}

export function getMailSnapshot(): MailStoreSnapshot {
  return {
    mails: state.mails,
    nextCursor: state.nextCursor,
    hasMore: state.hasMore,
    lastHeadAt: state.lastHeadAt,
    lastHeadReason: state.lastHeadReason,
    status: state.status,
    statusKind: state.statusKind,
    loading: state.loading,
    loadingMore: state.loadingMore,
    prefetchArmed: state.prefetchArmed,
    panelOpen: state.panelOpen,
    view: state.view,
    lastScript: state.lastScript,
    lastSeenUnread: state.lastSeenUnread,
    newMailCount: state.newMailCount,
    commandBusy: state.commandBusy,
    unreadStuckHint: state.unreadStuckHint,
    undoCount: state.undoCount,
    deleteProgress: state.deleteProgress,
  };
}

export function getMails(): MailRow[] {
  return state.mails;
}

export function getNextCursor(): string | null {
  return state.nextCursor;
}

export function getHasMore(): boolean {
  return state.hasMore;
}

export function getLastHeadAt(): number {
  return state.lastHeadAt;
}

export function getLastHeadReason(): string {
  return state.lastHeadReason;
}

export function getLoading(): boolean {
  return state.loading;
}

export function getLoadingMore(): boolean {
  return state.loadingMore;
}

export function getPrefetchArmed(): boolean {
  return state.prefetchArmed;
}

export function getPanelOpen(): boolean {
  return state.panelOpen;
}

export function getView(): MailView {
  return state.view;
}

export function getLastScript(): string {
  return state.lastScript;
}

export function getLastSeenUnread(): number {
  return state.lastSeenUnread;
}

export function getNewMailCount(): number {
  return state.newMailCount;
}

export function getCommandBusy(): boolean {
  return state.commandBusy;
}

export function getUnreadStuckHint(): string {
  return state.unreadStuckHint;
}

export function getUndoCount(): number {
  return state.undoCount;
}

export function getDeleteProgress(): MailDeleteProgress | null {
  return state.deleteProgress;
}

export function getLocallyReadIds(): Set<string> {
  return locallyReadIds;
}

export function getSessionDraft(): ComposeDraft {
  return state.sessionDraft;
}

/**
 * One draft owner: while compose is open, view.draft is canonical;
 * otherwise sessionDraft (for bag-queue before panel opens).
 */
export function getActiveComposeDraft(): ComposeDraft {
  if (state.view.kind === "compose") return state.view.draft;
  return state.sessionDraft;
}

/** Reset session cache fields (does not touch panelOpen / sessionDraft). */
export function clearMailSessionCore(): void {
  commit(
    {
      mails: [],
      nextCursor: null,
      hasMore: false,
      lastHeadAt: 0,
      lastHeadReason: "—",
      status: "",
      statusKind: "",
      loading: false,
      loadingMore: false,
      prefetchArmed: false,
      view: { kind: "list" },
      lastScript: "",
      lastSeenUnread: -1,
      newMailCount: 0,
      commandBusy: false,
      unreadStuckHint: "",
      undoCount: 0,
      deleteProgress: null,
    },
    { silent: true },
  );
  locallyReadIds.clear();
}
