/**
 * Bank search — market-style tokens for account vault items.
 * Words AND · OR / | · field ops · quotes · negation.
 */

import { itemInstanceLabel } from "../gameIcon";
import { parseAmount, tokenizeQuery, type MarketAmount } from "../market/marketQuery";
import {
  pushQuerySearchSection,
  trailingFieldContext,
  type QuerySearchMenu,
  type QuerySearchSuggestion,
} from "../querySearch";
import type { BankAggItem } from "./bankTypes";
import { packDisplayLabel } from "./bankBrowse";

export type BankClause =
  | { kind: "text"; values: string[]; negate: boolean }
  | { kind: "item"; values: string[]; negate: boolean }
  | { kind: "title"; values: string[]; negate: boolean }
  | { kind: "type"; values: string[]; negate: boolean }
  | { kind: "pack"; values: string[]; negate: boolean }
  | { kind: "is"; values: string[]; negate: boolean }
  | { kind: "level"; amts: MarketAmount[]; negate: boolean };

export type BankQueryGroups = BankClause[][];

export const BANK_TRAILING_OPS = [
  "item",
  "title",
  "type",
  "pack",
  "level",
  "is",
] as const;

export type BankSearchSuggestion = QuerySearchSuggestion;
export type BankSearchMenu = QuerySearchMenu;

const BANK_OPS = /^(item|title|type|pack|level|is):(.*)$/i;

function splitCsv(raw: string): string[] {
  return String(raw || "")
    .split(/[,+]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseClauseToken(tok: string): BankClause | null {
  let negate = false;
  let body = tok;
  if (body.charAt(0) === "-") {
    negate = true;
    body = body.slice(1);
  }
  if (!body) return null;
  const m = BANK_OPS.exec(body);
  if (!m) {
    const values = splitCsv(body.replace(/^"|"$/g, ""));
    if (!values.length) return null;
    return { kind: "text", values, negate };
  }
  const field = m[1].toLowerCase();
  const rest = m[2];
  if (field === "level") {
    const parts = String(rest || "").split(/[,+]/);
    const amts: MarketAmount[] = [];
    for (let i = 0; i < parts.length; i++) {
      const a = parseAmount(parts[i]);
      if (a) amts.push(a);
    }
    if (!amts.length) return null;
    return { kind: "level", amts, negate };
  }
  const values = splitCsv(rest.replace(/^"|"$/g, ""));
  if (!values.length) return null;
  if (field === "item") return { kind: "item", values, negate };
  if (field === "title") return { kind: "title", values, negate };
  if (field === "type") return { kind: "type", values, negate };
  if (field === "pack") return { kind: "pack", values, negate };
  if (field === "is") return { kind: "is", values, negate };
  return null;
}

export function parseBankQuery(raw: string): BankQueryGroups {
  const tokens = tokenizeQuery(raw);
  if (!tokens.length) return [[]];
  const groups: BankQueryGroups = [[]];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.toLowerCase() === "or" || t === "|") {
      groups.push([]);
      continue;
    }
    const clause = parseClauseToken(t);
    if (clause) groups[groups.length - 1].push(clause);
  }
  return groups.filter((g) => g.length > 0).length
    ? groups.filter((g) => g.length > 0)
    : [[]];
}

function amtOk(level: number | undefined, amts: MarketAmount[]): boolean {
  const n = level != null && Number.isFinite(level) ? Number(level) : 0;
  for (let i = 0; i < amts.length; i++) {
    const a = amts[i];
    if (a.op === "=" && n === a.n) return true;
    if (a.op === ">" && n > a.n) return true;
    if (a.op === ">=" && n >= a.n) return true;
    if (a.op === "<" && n < a.n) return true;
    if (a.op === "<=" && n <= a.n) return true;
  }
  return false;
}

function anyIncludes(hay: string, needles: string[]): boolean {
  const h = hay.toLowerCase();
  for (let i = 0; i < needles.length; i++) {
    if (h.indexOf(needles[i]) >= 0) return true;
  }
  return false;
}

export type BankQueryMatchCtx = {
  /** G.items type for name. */
  itemType?: (name: string) => string;
  /** Full G for is: flags (compound/upgrade/craft/exchange). */
  G?: any;
};

function itemHasIsFlag(name: string, flag: string, G: any): boolean {
  const def = G && G.items && G.items[name];
  if (!def) return false;
  if (flag === "compound") return !!def.compound;
  if (flag === "upgrade") return !!def.upgrade;
  if (flag === "exchange") return !!def.e;
  if (flag === "craft" || flag === "craftable") {
    return !!(G && G.craft && G.craft[name]);
  }
  if (flag === "event") return !!def.event;
  if (flag === "legacy") return !!def.legacy;
  return false;
}

function clauseMatches(
  item: BankAggItem,
  clause: BankClause,
  ctx: BankQueryMatchCtx,
): boolean {
  let hit = false;
  if (clause.kind === "text") {
    const label = itemInstanceLabel(item.name, {
      p: item.p,
      level: item.level,
    });
    hit =
      anyIncludes(item.name, clause.values) ||
      anyIncludes(label, clause.values);
  } else if (clause.kind === "item") {
    hit = anyIncludes(item.name, clause.values);
  } else if (clause.kind === "title") {
    hit = anyIncludes(String(item.p || ""), clause.values);
  } else if (clause.kind === "type") {
    const t = ctx.itemType ? ctx.itemType(item.name) : "";
    hit = anyIncludes(t, clause.values);
  } else if (clause.kind === "is") {
    for (let i = 0; i < clause.values.length; i++) {
      if (itemHasIsFlag(item.name, clause.values[i], ctx.G)) {
        hit = true;
        break;
      }
    }
  } else if (clause.kind === "pack") {
    for (let i = 0; i < item.locs.length; i++) {
      const pack = item.locs[i].pack;
      const label = packDisplayLabel(pack).toLowerCase();
      if (
        anyIncludes(pack, clause.values) ||
        anyIncludes(label, clause.values) ||
        anyIncludes(
          String(Number((/^items(\d+)$/.exec(pack) || [])[1]) + 1),
          clause.values,
        )
      ) {
        hit = true;
        break;
      }
    }
  } else if (clause.kind === "level") {
    hit = amtOk(item.level, clause.amts);
  }
  return clause.negate ? !hit : hit;
}

function groupMatches(
  item: BankAggItem,
  group: BankClause[],
  ctx: BankQueryMatchCtx,
): boolean {
  for (let i = 0; i < group.length; i++) {
    if (!clauseMatches(item, group[i], ctx)) return false;
  }
  return true;
}

export function bankItemMatchesQuery(
  item: BankAggItem,
  raw: string,
  ctx: BankQueryMatchCtx = {},
): boolean {
  const q = String(raw || "").trim();
  if (!q) return true;
  const groups = parseBankQuery(q);
  for (let i = 0; i < groups.length; i++) {
    if (groupMatches(item, groups[i], ctx)) return true;
  }
  return false;
}

export function filterBankItems(
  items: BankAggItem[],
  raw: string,
  ctx: BankQueryMatchCtx = {},
): BankAggItem[] {
  const q = String(raw || "").trim();
  if (!q) return items;
  const out: BankAggItem[] = [];
  for (let i = 0; i < items.length; i++) {
    if (bankItemMatchesQuery(items[i], q, ctx)) out.push(items[i]);
  }
  return out;
}

/** Completions — same sectioned menu shape as Market. */
export function buildBankSearchSuggestions(
  raw: string,
  opts: {
    itemNames: string[];
    packKeys: string[];
    types: string[];
    titles?: string[];
  },
): BankSearchMenu {
  const q = String(raw || "");
  const menu: BankSearchMenu = { sections: [], flat: [] };
  const ctx = trailingFieldContext(q, BANK_TRAILING_OPS);

  if (ctx && ctx.op === "is" && ctx.value.indexOf(" ") < 0) {
    const isOpts = [
      { value: "compound", hint: "Compoundable gear" },
      { value: "upgrade", hint: "Upgradeable gear" },
      { value: "craft", hint: "Craft recipe output" },
      { value: "exchange", hint: "Exchangeable (e)" },
      { value: "event", hint: "Event item" },
      { value: "legacy", hint: "Legacy item" },
    ];
    const needle = ctx.value.toLowerCase();
    pushQuerySearchSection(
      menu,
      "Refine your search: is",
      isOpts
        .filter((o) => !needle || o.value.indexOf(needle) === 0)
        .map((o) => ({
          kind: "value" as const,
          value: o.value,
          label: "is:" + o.value,
          hint: o.hint,
          ico: "▹",
        })),
    );
    return menu;
  }

  if (
    ctx &&
    (ctx.op === "item" ||
      ctx.op === "type" ||
      ctx.op === "pack" ||
      ctx.op === "title")
  ) {
    const needle = ctx.value.toLowerCase();
    let pool: string[] = [];
    if (ctx.op === "item") pool = opts.itemNames;
    else if (ctx.op === "type") pool = opts.types;
    else if (ctx.op === "pack") pool = opts.packKeys;
    else pool = opts.titles || [];
    const rows: QuerySearchSuggestion[] = [];
    for (let i = 0; i < pool.length && rows.length < 8; i++) {
      const name = pool[i];
      const label = ctx.op === "pack" ? packDisplayLabel(name) : name;
      if (
        needle &&
        name.toLowerCase().indexOf(needle) < 0 &&
        label.toLowerCase().indexOf(needle) < 0
      ) {
        continue;
      }
      const needsQuote = /\s/.test(name);
      rows.push({
        kind: "value",
        value: needsQuote ? '"' + name + '"' : name,
        label: ctx.op === "pack" ? label : name,
        hint: ctx.op === "pack" ? name : ctx.op,
        ico: ctx.op === "pack" ? "▦" : "▣",
      });
    }
    pushQuerySearchSection(menu, "Refine your search: " + ctx.op, rows);
    return menu;
  }

  if (ctx && ctx.op === "level") {
    pushQuerySearchSection(menu, "Refine your search: level", [
      {
        kind: "value",
        value: ">=7",
        label: "level:>=7",
        hint: "Level 7+",
        ico: "▹",
      },
      {
        kind: "value",
        value: "0",
        label: "level:0",
        hint: "Exactly +0",
        ico: "▹",
      },
      {
        kind: "value",
        value: "<=5",
        label: "level:<=5",
        hint: "Level 5 or less",
        ico: "▹",
      },
    ]);
    return menu;
  }

  const needle = q.trim().toLowerCase();
  const freeText = !!(needle && !trailingFieldContext(q, BANK_TRAILING_OPS));

  if (freeText) {
    const items: QuerySearchSuggestion[] = [];
    for (let i = 0; i < opts.itemNames.length && items.length < 8; i++) {
      if (opts.itemNames[i].toLowerCase().indexOf(needle) < 0) continue;
      items.push({
        kind: "op",
        insert: 'item:"' + opts.itemNames[i] + '" ',
        label: opts.itemNames[i],
        hint: "item",
        ico: "▣",
      });
    }
    pushQuerySearchSection(menu, "Items", items);
  }

  const fieldOps: QuerySearchSuggestion[] = [
    {
      kind: "op",
      insert: "item:",
      label: "item:",
      hint: "Filter by item",
      ico: "+",
    },
    {
      kind: "op",
      insert: "type:",
      label: "type:",
      hint: "weapon · material · …",
      ico: "+",
    },
    {
      kind: "op",
      insert: "pack:",
      label: "pack:",
      hint: "Vault pack / tab",
      ico: "+",
    },
    {
      kind: "op",
      insert: "title:",
      label: "title:",
      hint: "shiny · lucky · glitched…",
      ico: "+",
    },
    {
      kind: "op",
      insert: "is:",
      label: "is:",
      hint: "compound · upgrade · craft · exchange",
      ico: "+",
    },
    {
      kind: "op",
      insert: "level:",
      label: "level:",
      hint: "e.g. level:>=7",
      ico: "+",
    },
  ];
  const opRows = freeText
    ? fieldOps.filter((o) => o.label.indexOf(needle) === 0)
    : fieldOps;
  pushQuerySearchSection(
    menu,
    "Refine your search",
    opRows.length ? opRows : fieldOps,
  );

  return menu;
}
