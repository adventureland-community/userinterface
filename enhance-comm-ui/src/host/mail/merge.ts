import type { MailRow, PullMailPage } from "./types";

function cloneRow(m: MailRow): MailRow {
  const next: MailRow = {
    id: m.id,
    fro: m.fro,
    to: m.to,
    subject: m.subject,
    message: m.message,
    sent: m.sent,
  };
  if (m.read != null) next.read = m.read;
  if (m.item) next.item = { ...m.item };
  if (m.taken != null) next.taken = m.taken;
  // Always copy booleans so soft-merge can clear pending/canTake.
  if (m.takenPending != null) next.takenPending = m.takenPending;
  if (m.canTake != null) next.canTake = m.canTake;
  if (m.system != null) next.system = m.system;
  return next;
}

/**
 * Coerce pull_mail `sent` (`"" + created`) into something Date.parse trusts.
 * Prefer ISO; accept epoch ms numbers and Date-like strings.
 */
export function normalizeMailSent(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms).toISOString();
  }
  if (typeof raw === "object") {
    const obj = raw as { $date?: unknown; getTime?: () => number };
    if (typeof obj.getTime === "function") {
      const t = obj.getTime();
      if (Number.isFinite(t)) return new Date(t).toISOString();
    }
    if (obj.$date != null) return normalizeMailSent(obj.$date);
  }
  const s = String(raw).trim();
  if (!s || s === "undefined" || s === "null") return "";
  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    const ms = n < 1e12 ? n * 1000 : n;
    if (ms > 1e11) return new Date(ms).toISOString();
  }
  return s;
}

/** Soft-merge first page by id; keep already-loaded older pages. */
export function mergeHeadPage(
  existing: MailRow[],
  page: MailRow[],
): MailRow[] {
  const map = new Map<string, MailRow>();
  for (let i = 0; i < existing.length; i++) {
    map.set(existing[i].id, existing[i]);
  }
  for (let i = 0; i < page.length; i++) {
    const p = page[i];
    const prev = map.get(p.id);
    map.set(p.id, prev ? Object.assign({}, prev, p) : cloneRow(p));
  }
  const older: MailRow[] = [];
  for (let i = 0; i < existing.length; i++) {
    const m = existing[i];
    let inPage = false;
    for (let j = 0; j < page.length; j++) {
      if (page[j].id === m.id) {
        inPage = true;
        break;
      }
    }
    if (!inPage) older.push(map.get(m.id) || m);
  }
  const head: MailRow[] = [];
  for (let i = 0; i < page.length; i++) {
    head.push(map.get(page[i].id)!);
  }
  return head.concat(older);
}

/** Append missing ids from a cursor page. */
export function appendCursorPage(
  existing: MailRow[],
  page: MailRow[],
): MailRow[] {
  const have = new Set<string>();
  for (let i = 0; i < existing.length; i++) have.add(existing[i].id);
  const next = existing.slice();
  for (let i = 0; i < page.length; i++) {
    const m = page[i];
    if (have.has(m.id)) continue;
    have.add(m.id);
    next.push(cloneRow(m));
  }
  return next;
}

export function applyPullMeta(page: PullMailPage): {
  nextCursor: string | null;
  hasMore: boolean;
} {
  return {
    nextCursor: page.more ? page.cursor : null,
    hasMore: !!page.more,
  };
}

/** Normalize raw api mail payload into rows. */
export function normalizeMailPage(raw: unknown): PullMailPage {
  const info = (raw || {}) as {
    mail?: unknown[];
    more?: boolean;
    cursor?: string | null;
    cursored?: boolean;
  };
  const list = Array.isArray(info.mail) ? info.mail : [];
  const mail: MailRow[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as Record<string, unknown>;
    if (!m || m.id == null) continue;
    const row: MailRow = {
      id: String(m.id),
      fro: String(m.fro || ""),
      to: String(m.to || ""),
      subject: String(m.subject || ""),
      message: String(m.message || ""),
      sent: normalizeMailSent(m.sent),
    };
    if (typeof m.read === "boolean") row.read = m.read;
    // Stock pull_mail omits `read` — leave unset; store assigns local session state.
    // Stock/mongodb: `item` is often a JSON string (simplify_item); may also be an object.
    const item = parseMailItem(m.item);
    if (item) row.item = item;
    const takenState = coerceMailTakenState(m.taken);
    if (takenState) {
      row.taken = takenState.taken;
      // Always set so mergeHeadPage can clear a prior pending claim.
      row.takenPending = takenState.pending;
    }
    if (typeof m.can_take === "boolean") row.canTake = m.can_take;
    // Phrase overlays (cave awards / tracktrix) when the plain subject is empty.
    if (!row.subject) {
      const phraseSub = phraseFromMessageField(m.subject_message);
      if (phraseSub) row.subject = phraseSub;
    }
    if (!row.message) {
      const phraseBody = phraseFromMessageField(m.body_message);
      if (phraseBody) row.message = phraseBody;
    }
    mail.push(row);
  }
  return {
    mail,
    more: !!info.more,
    cursor: info.cursor != null ? String(info.cursor) : null,
    cursored: !!info.cursored,
  };
}

/**
 * Stock/mongodb `taken` may be bool, 0/1, missing, or a claim token string
 * (`mailclaim_*`) while `mail_take_item` settles the attachment.
 */
export function coerceMailTaken(raw: unknown): boolean | undefined {
  const state = coerceMailTakenState(raw);
  return state ? state.taken : undefined;
}

export function coerceMailTakenState(
  raw: unknown,
): { taken: boolean; pending: boolean } | undefined {
  if (typeof raw === "boolean") {
    return { taken: raw, pending: false };
  }
  if (raw === 0 || raw === "0" || raw === "false") {
    return { taken: false, pending: false };
  }
  if (raw === 1 || raw === "1" || raw === "true") {
    return { taken: true, pending: false };
  }
  if (typeof raw === "string" && raw.length > 0) {
    // In-flight safe claim (or any non-bool token) — not takeable, not settled.
    return { taken: true, pending: true };
  }
  return undefined;
}

/** Best-effort label from `{ phrase: "server.cave.mail_subject" }`. */
function phraseFromMessageField(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const phrase = (raw as { phrase?: unknown }).phrase;
  if (typeof phrase !== "string" || !phrase) return "";
  const leaf = phrase.split(".").pop() || phrase;
  if (leaf === "mail_subject") return "System mail";
  if (leaf === "mail_body") return "";
  return leaf.replace(/_/g, " ");
}

/** True when a non-JSON string is a plausible AdventureLand item id. */
function looksLikeItemId(s: string): boolean {
  const t = String(s || "").trim();
  if (!t || t.length > 64) return false;
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(t);
}

/** Stock mail.item is often a JSON string; accept objects too. */
export function parseMailItem(raw: unknown): MailRow["item"] | undefined {
  let cur: unknown = raw;
  // Double-encoded strings show up after some simplify_item paths.
  for (let depth = 0; depth < 3; depth++) {
    if (cur == null || cur === "") return undefined;
    if (typeof cur === "string") {
      const trimmed = cur.trim();
      try {
        cur = JSON.parse(trimmed);
      } catch {
        // Bare id ("citrus") or JSON string value "\"citrus\"" after unwrap.
        if (looksLikeItemId(trimmed)) return { name: trimmed };
        return undefined;
      }
      continue;
    }
    break;
  }
  if (typeof cur === "string") {
    const trimmed = cur.trim();
    if (looksLikeItemId(trimmed)) return { name: trimmed };
    return undefined;
  }
  if (!cur || typeof cur !== "object") return undefined;
  const obj = cur as Record<string, unknown>;
  if (obj.name == null || obj.name === "") return undefined;
  const item: MailRow["item"] = { name: String(obj.name) };
  if (typeof obj.level === "number" && Number.isFinite(obj.level)) {
    item.level = obj.level;
  } else if (obj.level != null && obj.level !== "" && !isNaN(Number(obj.level))) {
    item.level = Number(obj.level);
  }
  if (typeof obj.q === "number" && Number.isFinite(obj.q)) {
    item.q = obj.q;
  } else if (obj.q != null && obj.q !== "" && !isNaN(Number(obj.q))) {
    item.q = Number(obj.q);
  }
  if (typeof obj.p === "string" && obj.p) item.p = obj.p;
  if (typeof obj.skin === "string" && obj.skin) item.skin = obj.skin;
  // Keep other keys for cooltips / take fingerprint parity.
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k === "name" || k === "level" || k === "q" || k === "p" || k === "skin") {
      continue;
    }
    if (item[k] === undefined) item[k] = obj[k];
  }
  return item;
}
