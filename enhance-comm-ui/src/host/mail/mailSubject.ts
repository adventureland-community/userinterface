import type { ItemFingerprint } from "./types";

/** In compose subject / body: replaced per mail with the attach label. */
export const MAIL_SUBJECT_ITEM_TOKEN = "{item}";

const ITEM_TOKEN_RE = /\{item\}/gi;

export function formatAttachSubject(fp: ItemFingerprint): string {
  let s = fp.name;
  if (fp.level != null) s += " +" + fp.level;
  if (fp.q != null && fp.q > 1) s += " ×" + fp.q;
  return s;
}

function applyItemToken(text: string, item: string): string {
  ITEM_TOKEN_RE.lastIndex = 0;
  if (!ITEM_TOKEN_RE.test(text)) return text;
  ITEM_TOKEN_RE.lastIndex = 0;
  return text.replace(ITEM_TOKEN_RE, item);
}

/**
 * Subject for send:
 * - `{item}` → attach label (per mail in a batch)
 * - empty + attach → attach label
 * - batch without `{item}` → `text · item` so rows stay distinct
 */
export function resolveMailSubject(
  base: string,
  fp: ItemFingerprint | null | undefined,
  index: number,
  total: number,
): string {
  const trimmed = String(base || "").trim();
  const item = fp ? formatAttachSubject(fp) : "";
  ITEM_TOKEN_RE.lastIndex = 0;
  if (ITEM_TOKEN_RE.test(trimmed)) {
    return applyItemToken(trimmed, item);
  }
  if (!trimmed) {
    if (item) return item;
    return total > 1 ? "Mail (" + index + "/" + total + ")" : "";
  }
  if (total > 1 && item) return trimmed + " · " + item;
  return trimmed;
}

/** Body for send — `{item}` expands; otherwise unchanged. */
export function resolveMailBody(
  base: string,
  fp: ItemFingerprint | null | undefined,
): string {
  const text = String(base || "");
  const item = fp ? formatAttachSubject(fp) : "";
  return applyItemToken(text, item);
}

/** Compose subject input placeholder when empty. */
export function subjectPlaceholder(
  attaches: ItemFingerprint[] | null | undefined,
): string {
  const list = attaches || [];
  if (!list.length) return "Subject (optional)";
  if (list.length === 1) {
    return (
      "e.g. Sending " +
      MAIL_SUBJECT_ITEM_TOKEN +
      " → " +
      formatAttachSubject(list[0])
    );
  }
  return (
    "e.g. Loot: " +
    MAIL_SUBJECT_ITEM_TOKEN +
    " → " +
    formatAttachSubject(list[0]) +
    " · …"
  );
}
