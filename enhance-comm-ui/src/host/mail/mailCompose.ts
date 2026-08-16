/**
 * Compose draft session I/O + commitCompose orchestration.
 */

import { loadSettings, saveSettings } from "../../lib/settings";
import { MAIL_SUBJECT_ITEM_TOKEN } from "./mailSubject";
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
import {
  commit,
  getActiveComposeDraft,
  getView,
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
