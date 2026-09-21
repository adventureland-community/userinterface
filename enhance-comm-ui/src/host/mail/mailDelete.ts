/**
 * Soft-delete with undo window (small batches), then finalize via api.
 * Large batches skip undo and show delete progress while API calls run.
 *
 * Rules:
 * - Starting a new delete finalizes any prior soft batch (never drops it).
 * - Soft removals stay in-memory only until finalize (no IDB write).
 * - Do not rewrite skip-cursor from list length (server cursor is an offset).
 */

import { deleteMail } from "./api";
import { requestMailHead } from "./mailCache";
import {
  deleteGapMs,
  estimateDeleteEtaMs,
  MAIL_DELETE_API_DEFAULT_MS,
} from "./mailDeleteEstimate";
import { schedulePersistMailCache } from "./mailPersist";
import {
  commit,
  getMails,
  getPanelOpen,
  getView,
  setStatus,
} from "./mailState";
import {
  MAIL_DELETE_UNDO_MAX,
  MAIL_DELETE_UNDO_MS,
  type MailRow,
} from "./types";

/** Seconds left on the soft-delete undo window (0 when idle / expired). */
export function undoSecondsLeft(endsAt: number, now = Date.now()): number {
  if (!(endsAt > 0)) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

let undoTimer = 0;
let undoRows: MailRow[] = [];
/** Ids waiting for delete_mail after the undo window (or flush). */
let pendingFinalizeIds: string[] = [];
let finalizeInFlight = false;
let pagehideArmed = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function armPagehideFlush(): void {
  if (pagehideArmed || typeof window === "undefined") return;
  pagehideArmed = true;
  window.addEventListener("pagehide", () => {
    void flushPendingMailDeletes();
  });
}

/**
 * Cancel the undo timer and return ids that still need server delete.
 * Does not restore rows — caller finalizes or abandons explicitly.
 */
function takePendingFinalizeIds(): string[] {
  if (undoTimer) {
    window.clearTimeout(undoTimer);
    undoTimer = 0;
  }
  const ids = pendingFinalizeIds.slice();
  pendingFinalizeIds = [];
  undoRows = [];
  commit({ undoCount: 0, undoEndsAt: 0 }, { silent: true });
  return ids;
}

/** Clear undo chrome only — prefer flushPendingMailDeletes when deletes pending. */
export function clearUndoState(opts?: { silent?: boolean }): void {
  if (undoTimer) {
    window.clearTimeout(undoTimer);
    undoTimer = 0;
  }
  undoRows = [];
  pendingFinalizeIds = [];
  commit(
    { undoCount: 0, undoEndsAt: 0 },
    opts && opts.silent ? { silent: true } : undefined,
  );
}

/** Finalize any soft-deleted rows still waiting for delete_mail. */
export async function flushPendingMailDeletes(): Promise<void> {
  const ids = takePendingFinalizeIds();
  if (!ids.length) return;
  await finalizeDeletes(ids);
}

function buildRemoveIdsPatch(
  unique: string[],
  seen: Set<string>,
): { batch: MailRow[]; patch: Parameters<typeof commit>[0] } {
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
  // Keep nextCursor/hasMore from the last server pull — list length is not a
  // skip offset once mid-list ids are removed.
  const patch: Parameters<typeof commit>[0] = { mails: nextMails };
  const view = getView();
  if (view.kind === "read" && seen.has(view.id)) {
    patch.view = { kind: "list" };
  }
  return { batch, patch };
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

  // Prior soft batch must hit the server — never drop it on a new delete.
  const priorIds = takePendingFinalizeIds();
  if (priorIds.length) {
    await finalizeDeletes(priorIds);
  }

  const { batch, patch } = buildRemoveIdsPatch(unique, seen);
  const finalizeIds: string[] = [];
  for (let i = 0; i < batch.length; i++) finalizeIds.push(batch[i].id);

  const allowUndo = batch.length > 0 && batch.length <= MAIL_DELETE_UNDO_MAX;
  if (allowUndo) {
    armPagehideFlush();
    undoRows = batch;
    pendingFinalizeIds = finalizeIds.slice();
    const undoEndsAt = Date.now() + MAIL_DELETE_UNDO_MS;
    commit({
      ...patch,
      undoCount: batch.length,
      undoEndsAt,
    });
    // Soft removals are memory-only until finalize — avoid IDB/server drift.
    if (undoTimer) window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      undoTimer = 0;
      undoRows = [];
      const idsToFinalize = pendingFinalizeIds.slice();
      pendingFinalizeIds = [];
      commit({ undoCount: 0, undoEndsAt: 0 });
      void finalizeDeletes(idsToFinalize);
    }, MAIL_DELETE_UNDO_MS);
    return "ok";
  }

  // Large batch: no undo — list clear + progress, then API.
  undoRows = [];
  pendingFinalizeIds = [];
  commit({
    ...patch,
    undoCount: 0,
    undoEndsAt: 0,
  });
  await finalizeDeletes(finalizeIds);
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
  pendingFinalizeIds = [];
  commit({ undoCount: 0, undoEndsAt: 0 });
  const total = ids.length;
  let failed = 0;
  let done = 0;
  let lastNotify = 0;
  let avgApiMs = MAIL_DELETE_API_DEFAULT_MS;
  const startedAt = Date.now();

  const paint = (force?: boolean) => {
    const now = Date.now();
    if (!force && now - lastNotify < 80 && done < total) return;
    lastNotify = now;
    const etaMs = estimateDeleteEtaMs({
      done,
      total,
      startedAt,
      now,
      avgApiMs,
    });
    commit({
      deleteProgress: { done, total, etaMs },
    });
  };

  paint(true);
  try {
    for (let i = 0; i < ids.length; i++) {
      const gap = deleteGapMs(i);
      if (gap > 0) await sleep(gap);
      const t0 = Date.now();
      const res = await deleteMail(ids[i]);
      const sample = Date.now() - t0;
      avgApiMs =
        done === 0 ? sample : Math.round(avgApiMs * 0.65 + sample * 0.35);
      if (!res.ok) failed += 1;
      done += 1;
      paint();
    }
  } finally {
    finalizeInFlight = false;
    commit({ deleteProgress: null });
  }

  schedulePersistMailCache();
  // Server inbox shape changed — re-pull head so skip-cursor stays valid.
  // Skip when the panel/session already closed (clearMailSession / pagehide).
  if (getPanelOpen()) {
    void requestMailHead("Refresh", { force: true });
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
  pendingFinalizeIds = [];
  commit({
    mails: next,
    undoCount: 0,
    undoEndsAt: 0,
    status: "Delete undone",
    statusKind: "",
  });
  // Soft path never persisted the removal — no IDB rewrite required.
}
