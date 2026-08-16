import { getSocket } from "../al";
import {
  MAIL_ATTACH_EXTRA,
  MAIL_SEND_COST,
  type ItemFingerprint,
  type MailCapabilities,
} from "./types";

export function mailSendCost(hasAttach: boolean): number {
  return hasAttach ? MAIL_SEND_COST + MAIL_ATTACH_EXTRA : MAIL_SEND_COST;
}

/**
 * Cost for N attached mails (one mail each, any To), or plain × recipient
 * count when there are no attaches.
 */
export function mailBatchSendCost(attachCount: number, toCount = 1): number {
  const n = Math.max(0, attachCount | 0);
  const tos = Math.max(1, toCount | 0);
  if (n <= 0) return MAIL_SEND_COST * tos;
  return n * mailSendCost(true);
}

/** /comm welcome observe fields mail uses (name, gold, items). */
export type MailObservingSnap = {
  name?: string;
  gold?: number;
  items?: unknown;
} | null;

/**
 * /comm observe snap for mail (name, gold, items).
 * Do not use getObserving() — that prefers the live entity, which often
 * omits name/gold/items (same pitfall as bag right-click).
 */
export function getMailObservingSnap(): MailObservingSnap {
  const obs = window.observing as
    { name?: string; gold?: number; items?: unknown } | null | undefined;
  return obs && obs.name ? obs : null;
}

export function getMailCapabilities(
  attaches: ItemFingerprint[] = [],
  toCount = 1,
  observing: MailObservingSnap,
): MailCapabilities {
  const sock = getSocket();
  const obs = observing;
  const attachCount = attaches.length;
  const recipients = Math.max(1, toCount | 0);
  const cost = mailBatchSendCost(attachCount, recipients);
  const gold =
    obs && typeof obs.gold === "number" ? Number(obs.gold) : undefined;
  const goldEnough = gold == null ? true : gold >= cost;
  const watching = !!(
    obs &&
    obs.name &&
    sock &&
    typeof sock.emit === "function"
  );
  if (!watching) {
    return {
      canSend: false,
      canTake: false,
      sendCost: cost,
      gold,
      goldEnough,
      attachCount,
      toCount: recipients,
      reason: "Not observing — inbox only",
    };
  }
  return {
    canSend: goldEnough,
    canTake: true,
    sendCost: cost,
    gold,
    goldEnough,
    attachCount,
    toCount: recipients,
    observeName: String(obs!.name),
    reason: goldEnough ? undefined : "Not enough gold on observed character",
  };
}
