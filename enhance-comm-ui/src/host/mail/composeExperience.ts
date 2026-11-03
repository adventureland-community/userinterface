/**
 * Compose UX helpers — summary strip, send blockers, bag “matching → free own” job.
 */

import {
  canonicalizeDraft,
  distributeAttachesAcrossTos,
  makeComposeAttach,
  normalizeComposeTos,
} from "./composeDraft";
import {
  canOwnCharReceiveAttach,
  buildOwnToCapFills,
  ownCharsWithFreeMailSpace,
  type MailCapPressure,
} from "./mailCaps";
import { MAIL_SUBJECT_ITEM_TOKEN } from "./mailSubject";
import type {
  ComposeAttach,
  ComposeDraft,
  ItemFingerprint,
  MailRow,
} from "./types";

export type ComposeSummary = {
  queued: number;
  withTo: number;
  needTo: number;
  freeOwn: number;
  toCount: number;
  pressure: MailCapPressure;
  line: string;
};

export type ComposeSendBlock = {
  reason: string;
  kind: "warn" | "err";
} | null;

function queuedByToFromAttaches(
  attaches: ComposeAttach[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < attaches.length; i++) {
    const to = String(attaches[i].to || "").trim();
    if (!to) continue;
    const key = to.toLowerCase();
    out[key] = (out[key] | 0) + 1;
  }
  return out;
}

function countWithTo(attaches: ComposeAttach[]): number {
  let n = 0;
  for (let i = 0; i < attaches.length; i++) {
    if (String(attaches[i].to || "").trim()) n += 1;
  }
  return n;
}

function mergeFingerprintsIntoAttaches(
  existing: ComposeAttach[],
  fps: ItemFingerprint[],
): { attaches: ComposeAttach[]; added: number } {
  const bySlot = new Map<number, ComposeAttach>();
  for (let i = 0; i < existing.length; i++) {
    bySlot.set(existing[i].slot, existing[i]);
  }
  let added = 0;
  for (let i = 0; i < fps.length; i++) {
    const fp = fps[i];
    const slot = Number(fp.slot) | 0;
    const had = bySlot.has(slot);
    const prev = bySlot.get(slot);
    const keepTo =
      prev && String(prev.to || "").trim() ? String(prev.to).trim() : "";
    bySlot.set(slot, makeComposeAttach(fp, keepTo));
    if (!had) added += 1;
  }
  const attaches: ComposeAttach[] = [];
  bySlot.forEach((a) => attaches.push(a));
  attaches.sort((a, b) => (a.slot | 0) - (b.slot | 0));
  return { attaches, added };
}

/**
 * Queue matching bag slots, replace To with free own characters, distribute.
 * Prior To chips (including full / sticky own) are dropped so items only land
 * on characters that still have attach room.
 */
export function buildMailMatchingToFreeOwnDraft(opts: {
  draft: ComposeDraft;
  fingerprints: ItemFingerprint[];
  freeOwnNames: string[];
}): {
  draft: ComposeDraft;
  queued: number;
  freeOwn: number;
  assigned: number;
  needTo: number;
  status: string;
  statusKind: "" | "warn";
} {
  const base = canonicalizeDraft(opts.draft);
  const merged = mergeFingerprintsIntoAttaches(
    base.attaches,
    opts.fingerprints,
  );
  const freeOwn = normalizeComposeTos(opts.freeOwnNames);
  let next = canonicalizeDraft({
    ...base,
    to: freeOwn,
    attaches: merged.attaches,
    subject:
      String(base.subject || "").trim() === ""
        ? MAIL_SUBJECT_ITEM_TOKEN
        : base.subject,
  });
  if (next.to.length && next.attaches.length) {
    next = distributeAttachesAcrossTos(next);
  }
  const assigned = countWithTo(next.attaches);
  const needTo = Math.max(0, next.attaches.length - assigned);
  const parts: string[] = [];
  parts.push(
    merged.added === 1
      ? "Queued 1"
      : "Queued " + Math.max(merged.added, opts.fingerprints.length),
  );
  parts.push(
    freeOwn.length === 1
      ? "1 free own"
      : freeOwn.length + " free own",
  );
  if (assigned > 0) {
    parts.push("distributed " + assigned);
  }
  if (needTo > 0) {
    parts.push(needTo + " still need To");
  }
  const statusKind: "" | "warn" =
    needTo > 0 || freeOwn.length === 0 ? "warn" : "";
  return {
    draft: next,
    queued: next.attaches.length,
    freeOwn: freeOwn.length,
    assigned,
    needTo,
    status: parts.join(" · "),
    statusKind,
  };
}

export function buildComposeSummary(opts: {
  draft: ComposeDraft;
  mails: MailRow[];
  selfNames: string[];
  incomplete?: boolean;
}): ComposeSummary {
  const draft = canonicalizeDraft(opts.draft);
  const queued = draft.attaches.length;
  const withTo = countWithTo(draft.attaches);
  const needTo = Math.max(0, queued - withTo);
  const queuedByTo = queuedByToFromAttaches(draft.attaches);
  const freeOwn = ownCharsWithFreeMailSpace({
    mails: opts.mails,
    selfNames: opts.selfNames,
    incomplete: opts.incomplete,
    exclude: draft.to,
    queuedByTo,
  }).length;
  const fills = buildOwnToCapFills({
    mails: opts.mails,
    selfNames: opts.selfNames,
    incomplete: opts.incomplete,
  });
  let pressure: MailCapPressure = "";
  for (let i = 0; i < fills.length; i++) {
    const f = fills[i];
    const q = queuedByTo[f.name.toLowerCase()] | 0;
    if (!canOwnCharReceiveAttach(f, q)) {
      pressure = "full";
      break;
    }
    if (pressure === "") {
      if (f.pressure === "warn") pressure = "warn";
    }
  }
  const parts: string[] = [];
  if (queued > 0) {
    parts.push(queued + " queued");
    parts.push(withTo + " with To");
    if (needTo > 0) parts.push(needTo + " need To");
  } else {
    parts.push(
      draft.to.length
        ? draft.to.length === 1
          ? "1 To · plain mail"
          : draft.to.length + " To · plain mail"
        : "No recipients yet",
    );
  }
  if (opts.selfNames.length) {
    parts.push(
      freeOwn > 0
        ? "Own free: " + freeOwn
        : draft.to.length
          ? "Own free: 0"
          : "Own free: 0 — all full or already listed",
    );
  }
  return {
    queued,
    withTo,
    needTo,
    freeOwn,
    toCount: draft.to.length,
    pressure,
    line: parts.join(" · "),
  };
}

/**
 * One human reason Send should stay blocked (beyond gold/busy).
 * Returns null when compose looks sendable for recipient wiring / caps.
 */
export function composeSendBlockReason(opts: {
  draft: ComposeDraft;
  mails: MailRow[];
  selfNames: string[];
  incomplete?: boolean;
  goldEnough?: boolean | null;
}): ComposeSendBlock {
  const draft = canonicalizeDraft(opts.draft);
  if (opts.goldEnough === false) {
    return { reason: "Not enough gold on the observed character", kind: "err" };
  }
  if (draft.attaches.length) {
    if (!countWithTo(draft.attaches) || countWithTo(draft.attaches) < draft.attaches.length) {
      const need = draft.attaches.length - countWithTo(draft.attaches);
      return {
        reason:
          need === 1
            ? "1 attachment still needs a To"
            : need + " attachments still need a To",
        kind: "warn",
      };
    }
    const fills = buildOwnToCapFills({
      mails: opts.mails,
      selfNames: opts.selfNames,
      incomplete: opts.incomplete,
    });
    const byKey = new Map<string, (typeof fills)[0]>();
    for (let i = 0; i < fills.length; i++) {
      byKey.set(fills[i].name.toLowerCase(), fills[i]);
    }
    const planned: Record<string, number> = {};
    for (let i = 0; i < draft.attaches.length; i++) {
      const to = String(draft.attaches[i].to || "").trim();
      if (!to) continue;
      const key = to.toLowerCase();
      planned[key] = (planned[key] | 0) + 1;
    }
    const over: string[] = [];
    const keys = Object.keys(planned);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fill = byKey.get(key);
      if (!fill) continue;
      // Cap check: existing fill + this draft's full plan to them.
      if (!canOwnCharReceiveAttach(fill, planned[key] - 1)) {
        over.push(fill.name);
      }
    }
    if (over.length) {
      return {
        reason:
          over.length === 1
            ? over[0] + " is at the attach cap (20/account or 200/char)"
            : over.slice(0, 2).join(", ") +
              (over.length > 2 ? " +" + (over.length - 2) : "") +
              " at attach cap",
        kind: "err",
      };
    }
    return null;
  }
  if (!draft.to.length) {
    return { reason: "Add a recipient", kind: "warn" };
  }
  return null;
}
