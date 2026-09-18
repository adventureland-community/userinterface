/**
 * Apply / trailing-field helpers for Market-style query search menus.
 */

import type { QuerySearchSuggestion } from "./types";

/**
 * Detect `op:value` (or `-op:value`) at the end of the query for value completions.
 * `ops` are field names without the colon (e.g. item, type, pack).
 * Optional `aliases` map e.g. `{ mer: "merchant" }`.
 */
export function trailingFieldContext(
  raw: string,
  ops: readonly string[],
  aliases: Record<string, string> = {},
): {
  op: string;
  value: string;
  negate: boolean;
  start: number;
} | null {
  if (!ops.length) return null;
  const aliasKeys = Object.keys(aliases);
  const names = ops.concat(aliasKeys).join("|");
  if (!names) return null;
  const re = new RegExp(
    "(^|\\s)(-?)(" + names + "):([^\\s]*)$",
    "i",
  );
  const s = String(raw || "");
  const m = re.exec(s);
  if (!m) return null;
  const rawOp = m[3].toLowerCase();
  const op = aliases[rawOp] || rawOp;
  return {
    op,
    value: m[4] || "",
    negate: !!m[2],
    start: m.index + m[1].length,
  };
}

/** Last token if it is free text (not already `op:…`). */
function trailingFreeToken(raw: string): { before: string; token: string } | null {
  const s = String(raw || "").replace(/\s+$/, "");
  if (!s) return null;
  const m = /^(.*?)(\S+)$/.exec(s);
  if (!m) return null;
  const token = m[2];
  if (/^-?[a-z][a-z0-9]*:/i.test(token)) return null;
  return { before: m[1].replace(/\s+$/, ""), token };
}

function quoteIfNeeded(token: string): string {
  if (/[\s:]/.test(token) || /["']/.test(token)) {
    return '"' + token.replace(/"/g, "") + '"';
  }
  return token;
}

/**
 * Apply a suggestion.
 * - value rows replace the trailing `op:` value (Market).
 * - bare `op:` with free text ahead folds into `op:text` (e.g. staff + item: → item:staff).
 * - full `op:value` inserts replace trailing free text when present.
 * - otherwise append (Market).
 */
export function applyQuerySearchSuggestion(
  raw: string,
  row: Pick<QuerySearchSuggestion, "kind" | "value" | "insert">,
  trailing: {
    op: string;
    value: string;
    negate: boolean;
    start: number;
  } | null,
): string {
  if (row.kind === "value" && trailing && row.value != null) {
    const before = raw.slice(0, trailing.start);
    const neg = trailing.negate ? "-" : "";
    return (before + neg + trailing.op + ":" + row.value + " ").replace(
      /\s+/g,
      " ",
    );
  }
  if (row.insert == null) return raw;

  const insert = String(row.insert);
  const insertTrim = insert.replace(/\s+$/, "");
  const free = trailingFreeToken(raw);

  // Bare field op: "item:" + typed "staff" → "item:staff "
  const bareOp = /^([a-z][a-z0-9]*):$/i.exec(insertTrim);
  if (bareOp && free) {
    const op = bareOp[1].toLowerCase() + ":";
    const body =
      (free.before ? free.before + " " : "") + op + quoteIfNeeded(free.token) + " ";
    return body.replace(/\s+/g, " ");
  }

  // Full insert already has a value (item:"firestaff") — replace free text token.
  if (free && /^[a-z][a-z0-9]*:.+/i.test(insertTrim)) {
    return ((free.before ? free.before + " " : "") + insertTrim + " ").replace(
      /\s+/g,
      " ",
    );
  }

  const trimmed = raw.replace(/\s+$/, "");
  const needsSpace = !!(trimmed && !/:$/.test(trimmed));
  return trimmed + (needsSpace ? " " : "") + insert;
}

export function emptyQuerySearchMenu(): {
  sections: never[];
  flat: never[];
} {
  return { sections: [], flat: [] };
}

export function pushQuerySearchSection(
  menu: {
    sections: { title: string; rows: QuerySearchSuggestion[] }[];
    flat: QuerySearchSuggestion[];
  },
  title: string,
  rows: QuerySearchSuggestion[],
): void {
  if (!rows.length) return;
  menu.sections.push({ title, rows });
  for (let i = 0; i < rows.length; i++) menu.flat.push(rows[i]);
}
