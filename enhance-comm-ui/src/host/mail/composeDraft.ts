/**
 * Pure compose draft helpers — no session I/O.
 * In-memory attaches always carry a non-empty `to`; migration fallbacks
 * live only in loadPersistedDraft (mailCompose).
 */

import type { ComposeAttach, ComposeDraft, ItemFingerprint } from "./types";

export function emptyDraft(): ComposeDraft {
  return { to: [], subject: "", body: "", attaches: [] };
}

/** Case-insensitive unique recipient names (preserve first casing). */
export function normalizeComposeTos(raw: string | string[]): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const name = String(list[i] || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Alias for send-script / shared recipient lists. */
export const normalizeTos = normalizeComposeTos;

function fingerprintFields(
  raw: ItemFingerprint,
): Omit<ComposeAttach, "to"> {
  const fp: Omit<ComposeAttach, "to"> = {
    slot: Number(raw.slot) | 0,
    name: String(raw.name || ""),
  };
  if (raw.level != null) fp.level = Number(raw.level);
  if (raw.q != null) fp.q = Number(raw.q);
  if (raw.p != null) fp.p = String(raw.p);
  return fp;
}

/** Build an attach. Empty `to` = queued, recipient TBD. */
export function makeComposeAttach(
  raw: ItemFingerprint,
  to: string = "",
): ComposeAttach {
  return { ...fingerprintFields(raw), to: String(to || "").trim() };
}

/**
 * Disk / legacy migration — may use fallbackTo when `raw.to` is missing.
 * Keeps the attach even when unassigned (empty to).
 */
export function migrateComposeAttach(
  raw: ItemFingerprint & { to?: string },
  fallbackTo: string,
): ComposeAttach {
  const to = String(raw.to || fallbackTo || "").trim();
  return { ...fingerprintFields(raw), to };
}

export function canonicalizeDraft(draft: ComposeDraft): ComposeDraft {
  const to = normalizeComposeTos(draft.to);
  const attaches: ComposeAttach[] = [];
  const list = Array.isArray(draft.attaches) ? draft.attaches : [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    attaches.push({
      ...fingerprintFields(a),
      to: String(a.to || "").trim(),
    });
  }
  return {
    to,
    subject: String(draft.subject || ""),
    body: String(draft.body || ""),
    attaches,
  };
}

/**
 * When the To pool changes: keep in-pool targets, assign unassigned /
 * orphaned attaches across the new pool (round-robin).
 */
export function rebindAttachesToPool(
  attaches: ComposeAttach[],
  tos: string[],
): ComposeAttach[] {
  if (!tos.length) {
    const out: ComposeAttach[] = [];
    for (let i = 0; i < attaches.length; i++) {
      out.push({ ...attaches[i], to: "" });
    }
    return out;
  }
  const ok = new Set(tos.map((t) => t.toLowerCase()));
  let rr = 0;
  const out: ComposeAttach[] = [];
  for (let i = 0; i < attaches.length; i++) {
    const a = attaches[i];
    const cur = String(a.to || "").trim();
    if (cur && ok.has(cur.toLowerCase())) {
      out.push(a);
      continue;
    }
    out.push({ ...a, to: tos[rr % tos.length] });
    rr += 1;
  }
  return out;
}

/** Pick the To that currently has the fewest queued attaches (round-robin). */
export function pickToForNewAttach(draft: ComposeDraft): string {
  const tos = normalizeComposeTos(draft.to);
  if (!tos.length) return "";
  const counts: Record<string, number> = {};
  for (let i = 0; i < tos.length; i++) counts[tos[i].toLowerCase()] = 0;
  for (let i = 0; i < draft.attaches.length; i++) {
    const key = String(draft.attaches[i].to || "").toLowerCase();
    if (!key || counts[key] == null) continue;
    counts[key] += 1;
  }
  let best = tos[0];
  let bestN = counts[best.toLowerCase()] ?? 0;
  for (let i = 1; i < tos.length; i++) {
    const n = counts[tos[i].toLowerCase()] ?? 0;
    if (n < bestN) {
      best = tos[i];
      bestN = n;
    }
  }
  return best;
}

/** Assign queued items across To chips in order (repeat if more items than To). */
export function distributeAttachesAcrossTos(draft: ComposeDraft): ComposeDraft {
  const base = canonicalizeDraft(draft);
  if (!base.to.length || !base.attaches.length) return base;
  const attaches: ComposeAttach[] = [];
  for (let i = 0; i < base.attaches.length; i++) {
    attaches.push({
      ...base.attaches[i],
      to: base.to[i % base.to.length],
    });
  }
  return { ...base, attaches };
}

export type ResolveComposeOpenOpts = {
  session: ComposeDraft;
  stickyTo: string[];
  partial?: Partial<ComposeDraft>;
};

/** Pure merge for openCompose — no I/O. */
export function resolveComposeOpen(opts: ResolveComposeOpenOpts): ComposeDraft {
  const session = canonicalizeDraft(opts.session);
  const sticky = normalizeComposeTos(opts.stickyTo);
  const partial = opts.partial;

  if (!partial) {
    const to = session.to.length ? session.to : sticky.slice();
    return canonicalizeDraft({ ...session, to });
  }

  const to = partial.to
    ? normalizeComposeTos(partial.to)
    : session.to.length
      ? session.to
      : sticky.slice();
  const subject =
    partial.subject != null ? String(partial.subject) : session.subject;
  const body = partial.body != null ? String(partial.body) : session.body;
  let attaches = session.attaches;
  if (partial.attaches !== undefined) {
    attaches = [];
    for (let i = 0; i < partial.attaches.length; i++) {
      const a = partial.attaches[i];
      attaches.push({
        ...fingerprintFields(a),
        to: String(a.to || "").trim(),
      });
    }
  }
  return canonicalizeDraft({ to, subject, body, attaches });
}

export function attachesHaveRecipients(attaches: ComposeAttach[]): boolean {
  if (!attaches.length) return true;
  for (let i = 0; i < attaches.length; i++) {
    if (!String(attaches[i].to || "").trim()) return false;
  }
  return true;
}
