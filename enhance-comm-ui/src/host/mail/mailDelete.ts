/**
 * Soft-delete with undo window (small batches), then finalize via api.
 * Large batches skip undo and show delete progress while API calls run.
 */

import { deleteMail } from "./api";
import { requestMailHead } from "./mailCache";
import { schedulePersistMailCache } from "./mailPersist";
import {
  commit,
  getHasMore,
  getMails,
  getView,
  setStatus,
} from "./mailState";
import {
  MAIL_DELETE_GAP_MAX_MS,
  MAIL_DELETE_GAP_MS,
  MAIL_DELETE_GAP_STEP_MS,
  MAIL_DELETE_UNDO_MAX,
  MAIL_DELETE_UNDO_MS,
  type MailRow,
} from "./types";

let undoTimer = 0;
let undoRows: MailRow[] = [];
let finalizeInFlight = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Gap before the next delete_mail — ramps slightly on long batches. */
function deleteGapMs(index: number): number {
  if (index <= 0) return 0;
  const ramp = Math.min(
    index * MAIL_DELETE_GAP_STEP_MS,
    MAIL_DELETE_GAP_MAX_MS - MAIL_DELETE_GAP_MS,
  );
  return Math.min(
    MAIL_DELETE_GAP_MS + Math.max(0, ramp),
    MAIL_DELETE_GAP_MAX_MS,
  );
}

export function clearUndoState(): void {
  if (undoTimer) {
    window.clearTimeout(undoTimer);
    undoTimer = 0;
  }
  undoRows = [];
  commit({ undoCount: 0 });
}

function removeIdsFromList(unique: string[], seen: Set<string>): MailRow[] {
  const mails = getMails();
  const batch: MailRow[] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = 0; j < mails.length; j++) {
      if (mails[j].id === unique[i]) {
        batch.push({ ...mails[j] });
        break;
      }
    }
  }
  const nextMails: MailRow[] = [];
  for (let i = 0; i < mails.length; i++) {
    if (!seen.has(mails[i].id)) nextMails.push(mails[i]);
  }
  const patch: Parameters<typeof commit>[0] = { mails: nextMails };
  if (getHasMore()) {
    patch.nextCursor = String(nextMails.length);
  } else if (!nextMails.length) {
    patch.nextCursor = null;
    patch.hasMore = false;
  }
  const view = getView();
  if (view.kind === "read" && seen.has(view.id)) {
    patch.view = { kind: "list" };
  }
  commit(patch);
  schedulePersistMailCache();
  return batch;
}

export async function deleteMailRows(
  ids: string[],
  opts?: { confirmed?: boolean },
): Promise<"need-confirm" | "ok" | "busy"> {
  if (finalizeInFlight) {
    setStatus("Delete already in progress…", "warn");
    return "busy";
  }
  const unique: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    if (seen.has(ids[i])) continue;
    seen.add(ids[i]);
    unique.push(ids[i]);
  }
  if (!unique.length) return "ok";

  const mails = getMails();
  let hasUntaken = false;
  for (let i = 0; i < unique.length; i++) {
    let m: MailRow | null = null;
    for (let j = 0; j < mails.length; j++) {
      if (mails[j].id === unique[i]) {
        m = mails[j];
        break;
      }
    }
    if (m && m.item && !m.taken) hasUntaken = true;
  }
  if (hasUntaken && !(opts && opts.confirmed)) return "need-confirm";

  // New delete cancels any pending undo finalize of a previous soft batch.
  clearUndoState();
  const batch = removeIdsFromList(unique, seen);
  const finalizeIds: string[] = [];
  for (let i = 0; i < batch.length; i++) finalizeIds.push(batch[i].id);

  const allowUndo = batch.length > 0 && batch.length <= MAIL_DELETE_UNDO_MAX;
  if (allowUndo) {
    undoRows = batch;
    commit({
      undoCount: batch.length,
      status:
        batch.length === 1
          ? "Deleted · Undo available (5s)"
          : "Deleted " + batch.length + " · Undo available (5s)",
      statusKind: "warn",
    });
    if (undoTimer) window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      undoTimer = 0;
      undoRows = [];
      commit({ undoCount: 0 });
      void finalizeDeletes(finalizeIds);
    }, MAIL_DELETE_UNDO_MS);
    return "ok";
  }

  // Large batch: no undo — finalize now with progress.
  undoRows = [];
  commit({ undoCount: 0 });
  void finalizeDeletes(finalizeIds);
  return "ok";
}

export async function deleteMailRow(
  id: string,
  opts?: { confirmed?: boolean },
): Promise<"need-confirm" | "ok" | "busy"> {
  return deleteMailRows([id], opts);
}

export async function finalizeDeletes(ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (finalizeInFlight) return;
  finalizeInFlight = true;
  undoRows = [];
  commit({ undoCount: 0 });
  const total = ids.length;
  let failed = 0;
  let done = 0;
  let lastNotify = 0;

  const paint = (force?: boolean) => {
    const now = Date.now();
    if (!force && now - lastNotify < 80 && done < total) return;
    lastNotify = now;
    commit({
      deleteProgress: { done, total },
      status: "Deleting " + done + " / " + total + "…",
      statusKind: "warn",
    });
  };

  paint(true);
  try {
    for (let i = 0; i < ids.length; i++) {
      const gap = deleteGapMs(i);
      if (gap > 0) await sleep(gap);
      const res = await deleteMail(ids[i]);
      if (!res.ok) failed += 1;
      done += 1;
      paint();
    }
  } finally {
    finalizeInFlight = false;
    commit({ deleteProgress: null });
  }

  if (failed) {
    setStatus(
      "Deleted " +
        (total - failed) +
        " / " +
        total +
        " · " +
        failed +
        " failed",
      "err",
    );
    void requestMailHead("Refresh", { force: true });
    return;
  }
  setStatus(total === 1 ? "Mail deleted." : total + " mails deleted.");
}

export function undoDeleteMail(): void {
  if (!undoRows.length || finalizeInFlight) return;
  if (undoTimer) {
    window.clearTimeout(undoTimer);
    undoTimer = 0;
  }
  const next = undoRows.concat(getMails());
  undoRows = [];
  const patch: Parameters<typeof commit>[0] = {
    mails: next,
    undoCount: 0,
    status: "Delete undone",
    statusKind: "",
  };
  if (getHasMore()) patch.nextCursor = String(next.length);
  commit(patch);
  schedulePersistMailCache();
}
