/**
 * Compose draft session I/O + commitCompose orchestration.
 */

import { loadSettings, saveSettings } from "../../lib/settings";
import { MAIL_SUBJECT_ITEM_TOKEN } from "./mailSubject";
import { buildMailMatchingToFreeOwnDraft } from "./composeExperience";
import {
  attachesHaveRecipients,
  canonicalizeDraft,
  distributeAttachesAcrossTos,
  emptyDraft,
  makeComposeAttach,
  migrateComposeAttach,
  normalizeComposeTos,
  pickToForNewAttach,
  rebindAttachesToPool,
  resolveComposeOpen,
} from "./composeDraft";
import { ownCharsWithFreeMailSpace } from "./mailCaps";
import {
  commit,
  getActiveComposeDraft,
  getView,
  setMailView,
} from "./mailState";
import type {
  ComposeAttach,
  ComposeDraft,
  ItemFingerprint,
  MailRow,
} from "./types";

export {
  attachesHaveRecipients,
  canonicalizeDraft,
  distributeAttachesAcrossTos,
  emptyDraft,
  makeComposeAttach,
  normalizeComposeTos,
  pickToForNewAttach,
  resolveComposeOpen,
} from "./composeDraft";

let draftHydrated = false;

export function ensureComposeDraftHydrated(): void {
  if (draftHydrated) return;
  draftHydrated = true;
  const draft = loadPersistedDraft();
  commit({ sessionDraft: draft }, { silent: true });
}

function stickyLastTo(): string[] {
  try {
    const last = loadSettings().mailLastTo;
    return Array.isArray(last) ? last.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeDraftSettings(draft: ComposeDraft): void {
  try {
    saveSettings({ mailDraft: JSON.stringify(draft) });
  } catch {
    /* ignore */
  }
}

/**
 * Single compose mutation path: mutate → canonicalize → view+session+disk → notify.
 * Optional status replaces a second notify from setStatus.
 */
export function commitCompose(
  mutator: (draft: ComposeDraft) => ComposeDraft,
  opts?: { status?: string; statusKind?: "" | "warn" | "err" },
): ComposeDraft {
  ensureComposeDraftHydrated();
  const cur = getActiveComposeDraft();
  const next = canonicalizeDraft(mutator(cur));
  const patch: Parameters<typeof commit>[0] = {
    view: { kind: "compose", draft: next },
    sessionDraft: next,
  };
  if (opts && opts.status != null) {
    patch.status = opts.status;
    patch.statusKind = opts.statusKind || "";
  }
  commit(patch);
  writeDraftSettings(next);
  return next;
}

export function persistDraft(draft: ComposeDraft): void {
  const next = canonicalizeDraft(draft);
  commit({ sessionDraft: next }, { silent: true });
  writeDraftSettings(next);
}

export function getSessionMailDraft(): ComposeDraft {
  ensureComposeDraftHydrated();
  return getActiveComposeDraft();
}

export function loadPersistedDraft(): ComposeDraft {
  try {
    const raw = loadSettings().mailDraft;
    if (!raw || typeof raw !== "string") return emptyDraft();
    const parsed = JSON.parse(raw) as ComposeDraft & {
      attach?: ItemFingerprint | null;
      attaches?: Array<ItemFingerprint & { to?: string }>;
    };
    const tos = normalizeComposeTos(
      Array.isArray(parsed.to) ? parsed.to.map(String) : [],
    );
    const fallback = tos[0] || "";
    const hasAttaches =
      Array.isArray(parsed.attaches) && parsed.attaches.length > 0;
    const rawList = hasAttaches
      ? parsed.attaches!
      : parsed.attach
        ? [parsed.attach]
        : [];
    const attaches: ComposeAttach[] = [];
    for (let i = 0; i < rawList.length; i++) {
      attaches.push(migrateComposeAttach(rawList[i], fallback));
    }
    const draft = canonicalizeDraft({
      to: tos,
      subject: String(parsed.subject || ""),
      body: String(parsed.body || ""),
      attaches,
    });
    if (!hasAttaches && parsed.attach) {
      writeDraftSettings(draft);
    }
    return draft;
  } catch {
    return emptyDraft();
  }
}

export function openCompose(partial?: Partial<ComposeDraft>): void {
  ensureComposeDraftHydrated();
  const draft = resolveComposeOpen({
    session: getActiveComposeDraft(),
    stickyTo: stickyLastTo(),
    partial,
  });
  commit({
    view: { kind: "compose", draft },
    sessionDraft: draft,
  });
  writeDraftSettings(draft);
}

/** Queue an inventory fingerprint (dedupe by slot). To optional until assigned. */
export function queueMailAttach(fp: ItemFingerprint): void {
  ensureComposeDraftHydrated();
  if (getView().kind !== "compose") openCompose();
  const cur = getActiveComposeDraft();
  const to = pickToForNewAttach(cur);
  const nextLen = cur.attaches.filter((a) => a.slot !== fp.slot).length + 1;
  commitCompose(
    (d) => {
      const list = d.attaches.filter((a) => a.slot !== fp.slot);
      list.push(makeComposeAttach(fp, to));
      const subject =
        String(d.subject || "").trim() === ""
          ? MAIL_SUBJECT_ITEM_TOKEN
          : d.subject;
      return { ...d, subject, attaches: list };
    },
    {
      status: to
        ? nextLen === 1
          ? "Attached " + fp.name + " → " + to
          : "Queued " + nextLen + " items · " + fp.name + " → " + to
        : nextLen === 1
          ? "Attached " + fp.name + " · add To to send"
          : "Queued " + nextLen + " items · " + fp.name + " · add To to send",
    },
  );
}

/**
 * Queue many bag fingerprints (dedupe by slot). Round-robins To from the pool
 * when assigning new slots.
 */
export function queueMailAttaches(fps: ItemFingerprint[]): number {
  ensureComposeDraftHydrated();
  if (!fps.length) return 0;
  if (getView().kind !== "compose") openCompose();
  let added = 0;
  commitCompose(
    (d) => {
      const bySlot = new Map<number, ComposeAttach>();
      for (let i = 0; i < d.attaches.length; i++) {
        bySlot.set(d.attaches[i].slot, d.attaches[i]);
      }
      let rr = 0;
      const pool = d.to.slice();
      for (let i = 0; i < fps.length; i++) {
        const fp = fps[i];
        const slot = Number(fp.slot) | 0;
        const had = bySlot.has(slot);
        const prev = bySlot.get(slot);
        let to = prev && String(prev.to || "").trim() ? String(prev.to) : "";
        if (!to && pool.length) {
          to = pool[rr % pool.length];
          rr += 1;
        }
        bySlot.set(slot, makeComposeAttach(fp, to));
        if (!had) added += 1;
      }
      const list: ComposeAttach[] = [];
      bySlot.forEach((a) => list.push(a));
      list.sort((a, b) => (a.slot | 0) - (b.slot | 0));
      const subject =
        String(d.subject || "").trim() === ""
          ? MAIL_SUBJECT_ITEM_TOKEN
          : d.subject;
      return { ...d, subject, attaches: list };
    },
    {
      status:
        added <= 0
          ? "Matching items already queued"
          : added === 1
            ? "Queued 1 matching item"
            : "Queued " + added + " matching items",
    },
  );
  return added;
}

export function patchComposeDraft(partial: Partial<ComposeDraft>): void {
  if (getView().kind !== "compose") return;
  commitCompose((d) => {
    const to = partial.to ? normalizeComposeTos(partial.to) : d.to;
    const subject = partial.subject != null ? partial.subject : d.subject;
    const body = partial.body != null ? partial.body : d.body;
    let attaches = d.attaches;
    if (partial.attaches) {
      attaches = [];
      for (let i = 0; i < partial.attaches.length; i++) {
        const a = partial.attaches[i];
        attaches.push(
          makeComposeAttach(a, String(a.to || "").trim()),
        );
      }
    } else if (partial.to) {
      attaches = rebindAttachesToPool(d.attaches, to);
    }
    return { to, subject, body, attaches };
  });
}

export function setMailAttachTo(index: number, to: string): void {
  if (getView().kind !== "compose") return;
  const name = String(to || "").trim();
  if (!name) return;
  commitCompose((d) => {
    if (index < 0 || index >= d.attaches.length) return d;
    const list = d.attaches.slice();
    list[index] = { ...list[index], to: name };
    return {
      ...d,
      to: normalizeComposeTos(d.to.concat([name])),
      attaches: list,
    };
  });
}

export function distributeMailAttaches(): void {
  if (getView().kind !== "compose") return;
  commitCompose((d) => distributeAttachesAcrossTos(d), {
    status: "Distributed items across To recipients",
  });
}

/**
 * Bag job: queue matching fingerprints, set To to free own only, distribute.
 */
export function mailMatchingToFreeOwn(opts: {
  fingerprints: ItemFingerprint[];
  mails: MailRow[];
  selfNames: string[];
  incomplete?: boolean;
}): {
  queued: number;
  freeOwn: number;
  assigned: number;
  needTo: number;
} {
  ensureComposeDraftHydrated();
  if (getView().kind !== "compose") openCompose();
  const cur = getActiveComposeDraft();
  const freeOwn = ownCharsWithFreeMailSpace({
    mails: opts.mails,
    selfNames: opts.selfNames,
    incomplete: opts.incomplete,
    exclude: [],
  });
  const planned = buildMailMatchingToFreeOwnDraft({
    draft: cur,
    fingerprints: opts.fingerprints,
    freeOwnNames: freeOwn,
  });
  commitCompose(() => planned.draft, {
    status: planned.status,
    statusKind: planned.statusKind,
  });
  return {
    queued: planned.queued,
    freeOwn: planned.freeOwn,
    assigned: planned.assigned,
    needTo: planned.needTo,
  };
}

/**
 * Empty the compose draft (and sticky last-To), persist, leave compose.
 */
export function clearComposeAndClose(): void {
  ensureComposeDraftHydrated();
  commitCompose(() => emptyDraft(), { status: "Compose cleared" });
  try {
    saveSettings({ mailLastTo: [] });
  } catch {
    /* ignore */
  }
  setMailView({ kind: "list" });
}

/**
 * Empty the compose draft in place (keeps compose open).
 */
export function clearComposeDraft(): void {
  if (getView().kind !== "compose") return;
  commitCompose(() => emptyDraft(), { status: "Compose cleared" });
  try {
    saveSettings({ mailLastTo: [] });
  } catch {
    /* ignore */
  }
}

/**
 * Append own characters that still have attach room to the compose To pool.
 * Returns how many names were newly added (0 if none / not composing).
 */
export function addOwnCharsWithFreeMailSpace(
  names: string[],
): number {
  if (getView().kind !== "compose") return 0;
  const add = normalizeComposeTos(names);
  if (!add.length) return 0;
  let added = 0;
  commitCompose(
    (d) => {
      const before = d.to.length;
      const to = normalizeComposeTos(d.to.concat(add));
      added = Math.max(0, to.length - before);
      return {
        ...d,
        to,
        attaches: rebindAttachesToPool(d.attaches, to),
      };
    },
    {
      status:
        added <= 0
          ? "No own characters with free attach space"
          : added === 1
            ? "Added 1 own character with free space"
            : "Added " + added + " own characters with free space",
      statusKind: added <= 0 ? "warn" : "",
    },
  );
  return added;
}

export function removeMailAttachAt(index: number): void {
  if (getView().kind !== "compose") return;
  commitCompose((d) => {
    if (index < 0 || index >= d.attaches.length) return d;
    const list = d.attaches.slice();
    list.splice(index, 1);
    return { ...d, attaches: list };
  });
}

export function replyToMail(mail: MailRow): void {
  openCompose({
    to: mail.fro ? [mail.fro] : [],
    subject: mail.subject
      ? mail.subject.indexOf("Re:") === 0
        ? mail.subject
        : "Re: " + mail.subject
      : "Re:",
    body: "",
    attaches: [],
  });
}

export function forwardMail(mail: MailRow): void {
  const quoted =
    "\n\n---------- Forwarded message ----------\nFrom: " +
    (mail.fro || "?") +
    "\nTo: " +
    (mail.to || "?") +
    "\nSubject: " +
    (mail.subject || "") +
    "\n\n" +
    (mail.message || "");
  openCompose({
    to: [],
    subject: mail.subject
      ? mail.subject.indexOf("Fwd:") === 0
        ? mail.subject
        : "Fwd: " + mail.subject
      : "Fwd:",
    body: quoted,
    attaches: [],
  });
}
