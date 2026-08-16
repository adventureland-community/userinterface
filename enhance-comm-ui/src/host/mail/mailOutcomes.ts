/**
 * Send / take command outcomes and head refresh scheduling.
 */

import { emitObserverCommand, getObserving } from "../al";
import { refreshObservedInventory } from "../inventory";
import { saveSettings } from "../../lib/settings";
import { buildSendScript, buildTakeScript } from "./commands";
import { findFingerprintSlot } from "./itemFingerprint";
import { requestMailHead } from "./mailCache";
import { emptyDraft, persistDraft, attachesHaveRecipients } from "./mailCompose";
import { resolveCommandOutcome } from "./mailUnreadLogic";
import {
  commit,
  getCommandBusy,
  getMails,
  setStatus,
} from "./mailState";
import {
  MAIL_COMMAND_HEAD_DELAY_MS,
  type ComposeAttach,
  type ItemFingerprint,
  type MailItem,
} from "./types";

export type PendingOutcome = {
  kind: "send" | "take";
  beforeIds: string[];
  targetIds: string[];
  expect: number;
  /** Sender name(s) for send outcome (usually the observed character). */
  fromNames?: string[];
};

let pendingOutcome: PendingOutcome | null = null;
let cmdSeq = 0;

export function getPendingOutcome(): PendingOutcome | null {
  return pendingOutcome;
}

export function clearPendingOutcome(): void {
  pendingOutcome = null;
}

export function resolvePendingOutcome(): void {
  const p = pendingOutcome;
  pendingOutcome = null;
  if (!p) {
    commit({ commandBusy: false });
    return;
  }
  const result = resolveCommandOutcome(p, getMails());
  commit({
    commandBusy: false,
    status: result.text,
    statusKind: result.kind,
  });
}

/**
 * Rebind attach slots from the observing snap (bag often reshuffles after a
 * prior send while the UI snap is still catching up).
 * Returns updated attaches, or an error string.
 */
function rebindAttachSlots(
  attaches: ComposeAttach[],
): ComposeAttach[] | string {
  const obs = window.observing as
    | { items?: Array<MailItem | null | undefined> }
    | null
    | undefined;
  if (!obs || !Array.isArray(obs.items)) {
    return "Not observing — cannot verify attaches";
  }
  const used = new Set<number>();
  const out: ComposeAttach[] = [];
  for (let i = 0; i < attaches.length; i++) {
    const fp = attaches[i];
    const slot = findFingerprintSlot(obs.items, fp, used);
    if (slot < 0) {
      const label =
        fp.level != null ? fp.name + " +" + fp.level : fp.name;
      return (
        "Attach not in observed bag: " +
        label +
        " — Refresh bag, then re-queue"
      );
    }
    used.add(slot);
    out.push({ ...fp, slot });
  }
  return out;
}

/** Drop mailed items from the local observing snap so the next queue isn’t ghosted. */
function patchObservingAfterAttachSend(attaches: ItemFingerprint[]): void {
  const obs = window.observing as
    | { items?: Array<MailItem | null | undefined> }
    | null
    | undefined;
  if (!obs || !Array.isArray(obs.items)) return;
  let changed = false;
  for (let i = 0; i < attaches.length; i++) {
    const fp = attaches[i];
    const slot = findFingerprintSlot(obs.items, fp, null);
    if (slot < 0) continue;
    obs.items[slot] = null;
    changed = true;
  }
  if (changed) {
    try {
      if (typeof window.render_inventory === "function") {
        window.render_inventory();
      }
    } catch {
      /* ignore */
    }
  }
}

function sendLooksSettled(p: PendingOutcome): boolean {
  if (p.kind !== "send") return true;
  const result = resolveCommandOutcome(p, getMails());
  return result.code === "looks_sent";
}

export function scheduleCommandHead(reason: string, delayMs?: number): void {
  const seq = ++cmdSeq;
  const wait =
    typeof delayMs === "number" && delayMs > 0
      ? delayMs
      : MAIL_COMMAND_HEAD_DELAY_MS;
  window.setTimeout(() => {
    if (seq !== cmdSeq) return;
    void (async () => {
      const isCommand = reason.indexOf("command") === 0;
      const sendPending =
        isCommand && pendingOutcome && pendingOutcome.kind === "send"
          ? pendingOutcome
          : null;
      // Send finishes on mail_sent (after mail_sending). Retry head a few times
      // so STATUS can show looks_sent when the account inbox picks it up.
      const attempts = sendPending ? 4 : 1;
      for (let i = 0; i < attempts; i++) {
        if (seq !== cmdSeq) return;
        await requestMailHead(reason, { force: true });
        if (
          !sendPending ||
          sendLooksSettled(sendPending) ||
          i === attempts - 1
        ) {
          break;
        }
        await new Promise<void>((r) => window.setTimeout(r, 900));
      }
      if (isCommand) {
        resolvePendingOutcome();
      }
      try {
        refreshObservedInventory();
      } catch {
        /* bag refresh best-effort */
      }
    })();
  }, wait);
}

export function sendMailCommand(opts: {
  to: string | string[];
  subject: string;
  body: string;
  attaches?: ComposeAttach[];
}): boolean {
  if (getCommandBusy()) {
    setStatus("Wait for previous command…", "warn");
    return false;
  }
  const tos = Array.isArray(opts.to)
    ? opts.to.map(String).filter(Boolean)
    : opts.to
      ? [String(opts.to)]
      : [];
  const attachesIn =
    opts.attaches && opts.attaches.length ? opts.attaches.slice() : [];
  let attaches: ComposeAttach[] = [];
  if (attachesIn.length) {
    if (!attachesHaveRecipients(attachesIn)) {
      setStatus("Each attach needs a To recipient", "warn");
      return false;
    }
    const rebound = rebindAttachSlots(attachesIn);
    if (typeof rebound === "string") {
      setStatus(rebound, "err");
      return false;
    }
    attaches = rebound;
  } else if (!tos.length) {
    setStatus("Add a recipient", "warn");
    return false;
  }
  const expect =
    attaches.length > 0 ? attaches.length : Math.max(1, tos.length);
  const script = buildSendScript({
    to: tos,
    subject: opts.subject,
    body: opts.body,
    attaches: attaches.length ? attaches : undefined,
  });
  const ok = emitObserverCommand(script);
  if (!ok) {
    commit({ lastScript: script });
    setStatus("No socket — cannot send command", "err");
    return false;
  }
  if (attaches.length) {
    patchObservingAfterAttachSend(attaches);
  }
  const stickyTo: string[] = [];
  const seenSticky = new Set<string>();
  const pushSticky = (name: string) => {
    const key = name.toLowerCase();
    if (!name || seenSticky.has(key)) return;
    seenSticky.add(key);
    stickyTo.push(name);
  };
  if (attaches.length) {
    for (let i = 0; i < attaches.length; i++) {
      pushSticky(String(attaches[i].to || "").trim());
    }
  }
  for (let i = 0; i < tos.length; i++) pushSticky(String(tos[i]).trim());
  try {
    saveSettings({ mailLastTo: stickyTo.slice(0, 8) });
  } catch {
    /* ignore */
  }
  const mails = getMails();
  const beforeIds: string[] = [];
  for (let i = 0; i < mails.length; i++) beforeIds.push(mails[i].id);
  const fromName =
    (window.observing && window.observing.name) ||
    (getObserving() && getObserving()!.name) ||
    "";
  pendingOutcome = {
    kind: "send",
    beforeIds,
    targetIds: [],
    expect,
    fromNames: fromName ? [String(fromName)] : undefined,
  };
  const obs = fromName || "character";
  commit({
    lastScript: script,
    commandBusy: true,
    status:
      expect > 1
        ? "Batch command · " + expect + " mails → " + obs + "…"
        : "Command sent to " + obs + "…",
    statusKind: "warn",
    view: { kind: "list" },
  });
  persistDraft(emptyDraft());
  // Script waits for mail_sent (~async DB). Give CODE time to start + settle.
  scheduleCommandHead(
    "command · send",
    MAIL_COMMAND_HEAD_DELAY_MS + 1200 + (expect - 1) * 800,
  );
  return true;
}

export function takeMailCommand(mailIdOrIds: string | string[]): boolean {
  if (getCommandBusy()) {
    setStatus("Wait for previous command…", "warn");
    return false;
  }
  const ids = Array.isArray(mailIdOrIds)
    ? mailIdOrIds.slice()
    : [mailIdOrIds];
  if (!ids.length) return false;
  const script = buildTakeScript(ids);
  const ok = emitObserverCommand(script);
  if (!ok) {
    commit({ lastScript: script });
    setStatus("No socket — cannot send command", "err");
    return false;
  }
  const mails = getMails();
  const beforeIds: string[] = [];
  for (let i = 0; i < mails.length; i++) beforeIds.push(mails[i].id);
  pendingOutcome = {
    kind: "take",
    beforeIds,
    targetIds: ids.slice(),
    expect: ids.length,
  };
  const obs =
    (window.observing && window.observing.name) ||
    (getObserving() && getObserving()!.name) ||
    "character";
  commit({
    lastScript: script,
    commandBusy: true,
    status:
      ids.length > 1
        ? "Take batch · " + ids.length + " → " + obs + "…"
        : "Command sent to " + obs + "…",
    statusKind: "warn",
  });
  scheduleCommandHead(
    "command · take",
    ids.length > 1
      ? MAIL_COMMAND_HEAD_DELAY_MS + (ids.length - 1) * 600
      : MAIL_COMMAND_HEAD_DELAY_MS,
  );
  return true;
}
