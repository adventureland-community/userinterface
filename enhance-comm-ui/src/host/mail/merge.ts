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
  if (m.system != null) next.system = m.system;
  return next;
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
      sent: String(m.sent || ""),
    };
    if (typeof m.read === "boolean") row.read = m.read;
    // Stock pull_mail omits `read` — leave unset; store assigns local session state.
    // Stock/mongodb: `item` is often a JSON string (simplify_item); may also be an object.
    const item = parseMailItem(m.item);
    if (item) row.item = item;
    const taken = coerceMailTaken(m.taken);
    if (taken != null) row.taken = taken;
    mail.push(row);
  }
  return {
    mail,
    more: !!info.more,
    cursor: info.cursor != null ? String(info.cursor) : null,
    cursored: !!info.cursored,
  };
}

/** Stock/mongodb `taken` may be bool, 0/1, or missing. */
export function coerceMailTaken(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") return raw;
  if (raw === 0 || raw === "0" || raw === "false") return false;
  if (raw === 1 || raw === "1" || raw === "true") return true;
  return undefined;
}

/** Stock mail.item is often a JSON string; accept objects too. */
export function parseMailItem(raw: unknown): MailRow["item"] | undefined {
  let cur: unknown = raw;
  // Double-encoded strings show up after some simplify_item paths.
  for (let depth = 0; depth < 3; depth++) {
    if (cur == null || cur === "") return undefined;
    if (typeof cur === "string") {
      try {
        cur = JSON.parse(cur);
      } catch {
        return undefined;
      }
      continue;
    }
    break;
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
