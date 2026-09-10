/**
 * Market search query language — ported from
 * agentic/mockups/multimerchant-market.html.
 *
 * Words AND · OR / | · field ops · quotes · negation.
 */

import { itemInstanceLabel } from "../gameIcon";
import type { MarketListingRow } from "./marketTypes";

export type MarketAmount = { op: "=" | ">" | ">=" | "<" | "<="; n: number };

export type MarketAttrSpec =
  | { key: string; any: true }
  | { key: string; any?: false; op: MarketAmount["op"]; n: number };

export type MarketClause =
  | { kind: "text"; values: string[]; negate: boolean }
  | { kind: "item"; values: string[]; negate: boolean }
  | { kind: "title"; values: string[]; negate: boolean }
  | { kind: "stat"; values: string[]; negate: boolean }
  | { kind: "merchant"; values: string[]; negate: boolean }
  | { kind: "map"; values: string[]; negate: boolean }
  | { kind: "server"; values: string[]; negate: boolean }
  | { kind: "has"; values: string[]; negate: boolean }
  | { kind: "is"; values: string[]; negate: boolean }
  | { kind: "level"; amts: MarketAmount[]; negate: boolean }
  | { kind: "price"; amts: MarketAmount[]; negate: boolean }
  | { kind: "attr"; specs: MarketAttrSpec[]; negate: boolean };

export type MarketQueryGroups = MarketClause[][];

export type MarketQueryMatchCtx = {
  gold: number;
  bagNames: Record<string, boolean>;
  /** Pretty server label, e.g. "EU I". */
  formatServer?: (server?: string | null) => string;
};

const MARKET_OPS =
  /^(item|merchant|mer|title|stat|attr|has|is|level|price|map|server):(.*)$/i;

const ATTR_KEYS = [
  "str",
  "int",
  "dex",
  "vit",
  "for",
  "hp",
  "mp",
  "armor",
  "resistance",
  "attack",
  "range",
  "speed",
  "evasion",
  "reflection",
  "lifesteal",
  "manasteal",
  "crit",
  "critdamage",
  "rpiercing",
  "apiercing",
  "dreturn",
  "frequency",
  "gold",
  "luck",
  "xp",
  "output",
  "stat",
  "courage",
  "mcourage",
  "pcourage",
];

export function parseAmount(raw: string): MarketAmount | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, "");
  const m = /^([<>]=?|=)?\s*(\d+(?:\.\d+)?)\s*([kmb])?$/.exec(s);
  if (!m) return null;
  let n = parseFloat(m[2]);
  if (!Number.isFinite(n)) return null;
  const u = m[3];
  if (u === "k") n *= 1e3;
  else if (u === "m") n *= 1e6;
  else if (u === "b") n *= 1e9;
  const op = (m[1] || "=") as MarketAmount["op"];
  return { op, n };
}

/** Split on spaces while keeping "quoted phrases" intact. */
export function tokenizeQuery(raw: string): string[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (quote) {
      if (ch === quote) {
        quote = null;
        cur += ch;
      } else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const a = s.charAt(0);
    const b = s.charAt(s.length - 1);
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}

function splitOrValues(raw: string): string[] {
  return String(raw || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseClauseToken(tokIn: string): MarketClause | null {
  let tok = tokIn;
  let negate = false;
  if (tok.charAt(0) === "-") {
    negate = true;
    tok = tok.slice(1);
    if (!tok) return null;
  }
  const m = MARKET_OPS.exec(tok);
  if (!m) {
    return { kind: "text", values: [stripQuotes(tok)], negate };
  }
  const op = m[1].toLowerCase();
  const value = stripQuotes(m[2]);
  if (op === "mer") {
    return { kind: "merchant", values: splitOrValues(value), negate };
  }
  if (op === "is" || op === "has") {
    return {
      kind: op,
      values: splitOrValues(value).map((v) => v.toLowerCase()),
      negate,
    };
  }
  if (op === "stat") {
    return {
      kind: "stat",
      values: splitOrValues(value).map((v) => v.toLowerCase()),
      negate,
    };
  }
  if (op === "attr") {
    const specs: MarketAttrSpec[] = [];
    const parts = splitOrValues(value);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const am = /^([a-z_][a-z0-9_]*)\s*([<>]=?|=)?\s*(.*)$/i.exec(part.trim());
      if (!am) continue;
      const key = am[1].toLowerCase();
      const opSign = am[2] || "";
      const rhs = String(am[3] || "").trim();
      if (!opSign && !rhs) {
        specs.push({ key, any: true });
        continue;
      }
      const amt = parseAmount((opSign || "=") + rhs);
      if (amt) specs.push({ key, op: amt.op, n: amt.n });
      else specs.push({ key, any: true });
    }
    if (!specs.length) return null;
    return { kind: "attr", specs, negate };
  }
  if (op === "level" || op === "price") {
    const parts = splitOrValues(value);
    const amts: MarketAmount[] = [];
    for (let i = 0; i < parts.length; i++) {
      const amt = parseAmount(parts[i]);
      if (amt) amts.push(amt);
    }
    if (amts.length) return { kind: op, amts, negate };
    if (value) return { kind: "text", values: [value], negate };
    return null;
  }
  if (
    op === "item" ||
    op === "title" ||
    op === "merchant" ||
    op === "map" ||
    op === "server"
  ) {
    return { kind: op, values: splitOrValues(value), negate };
  }
  return { kind: "text", values: splitOrValues(value), negate };
}

/** Parse into OR-of-AND groups. */
export function parseMarketQuery(raw: string): MarketQueryGroups {
  const tokens = tokenizeQuery(raw);
  const groups: MarketClause[][] = [[]];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^(or|\|)$/i.test(tok)) {
      if (groups[groups.length - 1].length) groups.push([]);
      continue;
    }
    const clause = parseClauseToken(tok);
    if (clause) groups[groups.length - 1].push(clause);
  }
  return groups.filter((g) => g.length);
}

function cmpAmount(actual: number, amt: MarketAmount): boolean {
  const n = Number(actual) || 0;
  if (amt.op === ">=") return n >= amt.n;
  if (amt.op === ">") return n > amt.n;
  if (amt.op === "<=") return n <= amt.n;
  if (amt.op === "<") return n < amt.n;
  return n === amt.n;
}

function getGItems(): Record<string, Record<string, unknown>> | null {
  if (typeof window === "undefined") return null;
  const G = (window as Window & {
    G?: { items?: Record<string, Record<string, unknown>> };
  }).G;
  return (G && G.items) || null;
}

function itemScrollable(name: string): boolean {
  const items = getGItems();
  const def = items && items[name];
  return !!(def && (def.scroll || def.stat));
}

function calcOfferProps(row: MarketListingRow): Record<string, number> {
  const items = getGItems();
  const def = (items && items[row.name]) || {};
  const prop: Record<string, number> = Object.create(null);
  for (let i = 0; i < ATTR_KEYS.length; i++) {
    const k = ATTR_KEYS[i];
    const v = def[k];
    prop[k] = typeof v === "number" ? v : 0;
  }
  const level = Math.max(0, Math.floor(Number(row.level) || 0));
  const up = def.upgrade;
  if (up && typeof up === "object" && !Array.isArray(up)) {
    const upRec = up as Record<string, unknown>;
    for (let i = 1; i <= level; i++) {
      const keys = Object.keys(upRec);
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        const uv = upRec[k];
        if (typeof uv !== "number") continue;
        prop[k] = (prop[k] || 0) + uv;
      }
    }
  }
  const st = row.stat_type ? String(row.stat_type).toLowerCase() : "";
  if (def.stat && st && prop.stat) {
    prop[st] = (prop[st] || 0) + prop.stat;
    prop.stat = 0;
  }
  return prop;
}

type Haystack = {
  nm: string;
  id: string;
  mer: string;
  titleKey: string;
  titleDisp: string;
  stat: string;
  base: string;
  hay: string;
};

function offerHaystack(row: MarketListingRow): Haystack {
  let nm = String(row.name || "").toLowerCase();
  if (typeof window !== "undefined") {
    try {
      nm = itemInstanceLabel(row.name, {
        level: row.level,
        p: row.p != null ? String(row.p) : undefined,
      }).toLowerCase();
    } catch {
      /* keep id */
    }
  }
  const id = String(row.name || "").toLowerCase();
  const mer = String(row.merchant || "").toLowerCase();
  const titleKey = String(row.p || "").toLowerCase();
  let titleDisp = "";
  let base = id;
  if (typeof window !== "undefined") {
    const G = window as Window & {
      G?: {
        items?: Record<string, { name?: string }>;
        titles?: Record<string, { title?: string }>;
      };
    };
    if (row.p && G.G && G.G.titles && G.G.titles[String(row.p)]) {
      titleDisp = String(G.G.titles[String(row.p)].title || "").toLowerCase();
    }
    base = String(
      (G.G && G.G.items && G.G.items[row.name] && G.G.items[row.name].name) ||
        row.name ||
        "",
    ).toLowerCase();
  }
  const stat = String(row.stat_type || "").toLowerCase();
  return {
    nm,
    id,
    mer,
    titleKey,
    titleDisp,
    stat,
    base,
    hay: [nm, id, mer, titleKey, titleDisp, base, stat]
      .filter(Boolean)
      .join(" "),
  };
}

function valueHits(
  values: string[] | undefined,
  test: (v: string) => boolean,
): boolean {
  if (!values || !values.length) return false;
  for (let i = 0; i < values.length; i++) {
    if (test(String(values[i] || "").toLowerCase())) return true;
  }
  return false;
}

function offerMatchesClause(
  row: MarketListingRow,
  c: MarketClause,
  h: Haystack,
  ctx: MarketQueryMatchCtx,
): boolean {
  let hit = false;
  if (c.kind === "text") {
    hit = valueHits(c.values, (v) => h.hay.indexOf(v) >= 0);
  } else if (c.kind === "item") {
    hit = valueHits(
      c.values,
      (v) =>
        h.nm.indexOf(v) >= 0 || h.id.indexOf(v) >= 0 || h.base.indexOf(v) >= 0,
    );
  } else if (c.kind === "title") {
    hit = valueHits(
      c.values,
      (v) =>
        (!!h.titleKey && h.titleKey.indexOf(v) >= 0) ||
        (!!h.titleDisp && h.titleDisp.indexOf(v) >= 0),
    );
  } else if (c.kind === "stat") {
    hit = valueHits(c.values, (v) => {
      if (v === "none" || v === "no" || v === "empty" || v === "!") {
        return !h.stat;
      }
      if (v === "any" || v === "yes" || v === "scrolled") return !!h.stat;
      return h.stat === v || h.stat.indexOf(v) === 0;
    });
  } else if (c.kind === "attr") {
    const prop = calcOfferProps(row);
    hit = (c.specs || []).some((spec) => {
      const n = Number(prop[spec.key]) || 0;
      if ("any" in spec && spec.any) return n > 0;
      if (!("op" in spec) || !("n" in spec)) return n > 0;
      return cmpAmount(n, { op: spec.op, n: spec.n });
    });
  } else if (c.kind === "merchant") {
    hit = valueHits(c.values, (v) => h.mer.indexOf(v) >= 0);
  } else if (c.kind === "map") {
    const map = String(row.map || "").toLowerCase();
    hit = valueHits(c.values, (v) => map.indexOf(v) >= 0);
  } else if (c.kind === "server") {
    const srv = String(row.server || "").toLowerCase();
    const ui = ctx.formatServer
      ? ctx.formatServer(row.server).toLowerCase()
      : srv;
    hit = valueHits(c.values, (v) => srv.indexOf(v) >= 0 || ui.indexOf(v) >= 0);
  } else if (c.kind === "level") {
    hit = (c.amts || []).some((amt) => cmpAmount(row.level || 0, amt));
  } else if (c.kind === "price") {
    hit = (c.amts || []).some((amt) => cmpAmount(row.price || 0, amt));
  } else if (c.kind === "has") {
    hit = valueHits(c.values, (v) => {
      if (v === "stat" || v === "scroll" || v === "scrolled") return !!h.stat;
      if (v === "title" || v === "p") return !!row.p;
      if (v === "level") return (row.level || 0) > 0;
      return false;
    });
  } else if (c.kind === "is") {
    hit = valueHits(c.values, (v) => {
      if (v === "sell" || v === "sale" || v === "selling") return !row.buyOrder;
      if (v === "buy" || v === "want" || v === "wanted" || v === "buying") {
        return !!row.buyOrder;
      }
      if (v === "near") {
        // Visible / in entities (not catalog-only same-map).
        return !!row.fromLive || row.merchantStatus === "you";
      }
      if (v === "afford") {
        return !!row.buyOrder || (row.price || 0) <= ctx.gold;
      }
      if (v === "have") return !!ctx.bagNames[row.name.toLowerCase()];
      if (v === "titled" || v === "title") return !!row.p;
      if (v === "stat" || v === "scrolled") return !!h.stat;
      if (v === "nostat" || v === "unscrolled") {
        return itemScrollable(row.name) && !h.stat;
      }
      if (v === "scrollable") return itemScrollable(row.name);
      return false;
    });
  }
  return c.negate ? !hit : hit;
}

export function listingMatchesMarketQuery(
  row: MarketListingRow,
  raw: string,
  ctx: MarketQueryMatchCtx,
): boolean {
  const groups = parseMarketQuery(raw);
  if (!groups.length) return true;
  const h = offerHaystack(row);
  for (let g = 0; g < groups.length; g++) {
    const clauses = groups[g];
    let ok = true;
    for (let i = 0; i < clauses.length; i++) {
      if (!offerMatchesClause(row, clauses[i], h, ctx)) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export type MarketToggleSync = {
  facet: "all" | "sale" | "wanted";
  nearOnly: boolean;
  canAfford: boolean;
  haveStock: boolean;
};

/** Read facet / Near / Afford / Have from is: tokens in the query. */
export function syncTogglesFromQuery(raw: string): MarketToggleSync {
  const groups = parseMarketQuery(raw);
  let facet: MarketToggleSync["facet"] = "all";
  let near = false;
  let afford = false;
  let have = false;
  for (let g = 0; g < groups.length; g++) {
    const clauses = groups[g];
    for (let i = 0; i < clauses.length; i++) {
      const c = clauses[i];
      if (c.kind !== "is" || c.negate) continue;
      const vals = c.values || [];
      for (let j = 0; j < vals.length; j++) {
        const v = String(vals[j] || "").toLowerCase();
        if (v === "sell" || v === "sale" || v === "selling") facet = "sale";
        if (v === "buy" || v === "want" || v === "wanted" || v === "buying") {
          facet = "wanted";
        }
        if (v === "near") near = true;
        if (v === "afford") afford = true;
        if (v === "have") have = true;
      }
    }
  }
  return {
    facet,
    nearOnly: near,
    canAfford: afford,
    haveStock: have,
  };
}

/** Rewrite is:sell/buy/near/afford/have to match UI toggles. */
export function rewriteIsInFilter(
  raw: string,
  next: MarketToggleSync,
): string {
  const tokens = tokenizeQuery(raw);
  const keep: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    let neg = "";
    if (tok.charAt(0) === "-") {
      neg = "-";
      tok = tok.slice(1);
    }
    const m = /^is:(.*)$/i.exec(tok);
    if (!m) {
      keep.push(tokens[i]);
      continue;
    }
    const v = String(m[1] || "").toLowerCase();
    if (
      v === "sell" ||
      v === "sale" ||
      v === "selling" ||
      v === "buy" ||
      v === "want" ||
      v === "wanted" ||
      v === "buying" ||
      v === "near" ||
      v === "afford" ||
      v === "have"
    ) {
      continue;
    }
    keep.push(neg + tok);
  }
  if (next.facet === "sale") keep.push("is:sell");
  if (next.facet === "wanted") keep.push("is:buy");
  if (next.nearOnly) keep.push("is:near");
  if (next.canAfford) keep.push("is:afford");
  if (next.haveStock) keep.push("is:have");
  return keep.join(" ").trim();
}

export function trailingOpContext(raw: string): {
  op: string;
  value: string;
  negate: boolean;
  start: number;
} | null {
  const s = String(raw || "");
  const m =
    /(^|\s)(-?)(item|merchant|mer|title|stat|attr|has|is|level|price|map|server):([^\s]*)$/i.exec(
      s,
    );
  if (!m) return null;
  return {
    op: m[3].toLowerCase() === "mer" ? "merchant" : m[3].toLowerCase(),
    value: m[4] || "",
    negate: !!m[2],
    start: m.index + m[1].length,
  };
}

export function applySearchSuggestion(
  raw: string,
  row: { kind: string; value?: string; insert?: string },
): string {
  const ctx = trailingOpContext(raw);
  if (row.kind === "value" && ctx && row.value != null) {
    const before = raw.slice(0, ctx.start);
    const neg = ctx.negate ? "-" : "";
    return (before + neg + ctx.op + ":" + row.value + " ").replace(/\s+/g, " ");
  }
  if (row.insert != null) {
    const trimmed = raw.replace(/\s+$/, "");
    const needsSpace = !!(trimmed && !/:$/.test(trimmed));
    return trimmed + (needsSpace ? " " : "") + row.insert;
  }
  return raw;
}

export type MarketSearchSuggestion = {
  kind: "op" | "value";
  label: string;
  hint: string;
  ico: string;
  insert?: string;
  value?: string;
};

export type MarketSearchSection = {
  title: string;
  rows: MarketSearchSuggestion[];
};

function uniqueSorted(list: string[]): string[] {
  const seen: Record<string, boolean> = Object.create(null);
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v || seen[v]) continue;
    seen[v] = true;
    out.push(v);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function buildMarketSearchSuggestions(opts: {
  query: string;
  rows: MarketListingRow[];
  formatServer?: (server?: string | null) => string;
}): { sections: MarketSearchSection[]; flat: MarketSearchSuggestion[] } {
  const q = opts.query;
  const ctx = trailingOpContext(q);
  const sections: MarketSearchSection[] = [];
  const flat: MarketSearchSuggestion[] = [];

  const pushSec = (title: string, rows: MarketSearchSuggestion[]) => {
    if (!rows.length) return;
    sections.push({ title, rows });
    for (let i = 0; i < rows.length; i++) flat.push(rows[i]);
  };

  const itemNames = uniqueSorted(
    opts.rows.map((r) => {
      if (typeof window === "undefined") return r.name;
      try {
        return itemInstanceLabel(r.name, {
          level: r.level,
          p: r.p != null ? String(r.p) : undefined,
        });
      } catch {
        return r.name;
      }
    }),
  );
  const merchants = uniqueSorted(opts.rows.map((r) => r.merchant));
  const maps = uniqueSorted(
    opts.rows.map((r) => (r.map ? String(r.map) : "")).filter(Boolean),
  );
  const servers = uniqueSorted(
    opts.rows
      .map((r) =>
        opts.formatServer ? opts.formatServer(r.server) : String(r.server || ""),
      )
      .filter(Boolean),
  );
  const titleKeys = uniqueSorted(
    opts.rows.map((r) => (r.p ? String(r.p) : "")).filter(Boolean),
  );
  const stats = uniqueSorted(
    opts.rows
      .map((r) => (r.stat_type ? String(r.stat_type) : ""))
      .filter(Boolean),
  );

  if (ctx && ctx.op === "is" && ctx.value.indexOf(" ") < 0) {
    const isOpts = [
      { value: "sell", hint: "Selling offers only" },
      { value: "buy", hint: "Buy orders only" },
      { value: "near", hint: "Visible / in entities" },
      { value: "afford", hint: "Within your gold" },
      { value: "have", hint: "Items you hold" },
      { value: "titled", hint: "Has an item title" },
      { value: "stat", hint: "Stat scroll applied" },
      { value: "nostat", hint: "Scrollable, no scroll yet" },
      { value: "scrollable", hint: "Can take a stat scroll" },
    ];
    const needle = ctx.value.toLowerCase();
    pushSec(
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
  } else if (ctx && ctx.op === "has" && ctx.value.indexOf(" ") < 0) {
    const hasOpts = [
      { value: "stat", hint: "Has a stat scroll" },
      { value: "title", hint: "Has a title prefix" },
      { value: "level", hint: "Upgraded / compounded" },
    ];
    const needle = ctx.value.toLowerCase();
    pushSec(
      "Refine your search: has",
      hasOpts
        .filter((o) => !needle || o.value.indexOf(needle) === 0)
        .map((o) => ({
          kind: "value" as const,
          value: o.value,
          label: "has:" + o.value,
          hint: o.hint,
          ico: "▹",
        })),
    );
  } else if (ctx && ctx.op === "stat") {
    const needle = ctx.value.toLowerCase();
    const pool = uniqueSorted(
      ["str", "int", "dex", "vit", "none", "any"].concat(stats),
    );
    const rows: MarketSearchSuggestion[] = [];
    for (let i = 0; i < pool.length && rows.length < 10; i++) {
      if (needle && pool[i].indexOf(needle) < 0) continue;
      rows.push({
        kind: "value",
        value: pool[i],
        label: "stat:" + pool[i],
        hint: "stat scroll",
        ico: "✦",
      });
    }
    pushSec("Refine your search: stat", rows);
  } else if (
    ctx &&
    (ctx.op === "merchant" ||
      ctx.op === "item" ||
      ctx.op === "title" ||
      ctx.op === "map" ||
      ctx.op === "server")
  ) {
    const needle = ctx.value.toLowerCase();
    let pool: string[] = [];
    if (ctx.op === "merchant") pool = merchants;
    else if (ctx.op === "item") pool = itemNames;
    else if (ctx.op === "title") pool = titleKeys;
    else if (ctx.op === "map") pool = maps;
    else pool = servers;
    const rows: MarketSearchSuggestion[] = [];
    for (let i = 0; i < pool.length && rows.length < 8; i++) {
      const name = pool[i];
      if (needle && name.toLowerCase().indexOf(needle) < 0) continue;
      const needsQuote = /\s/.test(name);
      rows.push({
        kind: "value",
        value: needsQuote ? '"' + name + '"' : name,
        label: name,
        hint: ctx.op,
        ico: ctx.op === "merchant" ? "◆" : "▣",
      });
    }
    pushSec("Refine your search: " + ctx.op, rows);
  } else if (ctx && (ctx.op === "price" || ctx.op === "level")) {
    const samples =
      ctx.op === "price"
        ? [
            { value: "<1M", hint: "Under 1M" },
            { value: ">=10M", hint: "10M or more" },
            { value: "<=100k", hint: "100k or less" },
          ]
        : [
            { value: ">=7", hint: "Level 7+" },
            { value: "9", hint: "Exactly +9" },
            { value: "<=5", hint: "Level 5 or less" },
          ];
    pushSec(
      "Refine your search: " + ctx.op,
      samples.map((o) => ({
        kind: "value" as const,
        value: o.value,
        label: ctx.op + ":" + o.value,
        hint: o.hint,
        ico: "▹",
      })),
    );
  } else {
    pushSec("Refine your search", [
      { kind: "op", insert: "item:", label: "item:", hint: "Filter by item", ico: "+" },
      {
        kind: "op",
        insert: "merchant:",
        label: "merchant:",
        hint: "Filter by merchant",
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
        insert: "stat:",
        label: "stat:",
        hint: "dex · int · none · any",
        ico: "+",
      },
      {
        kind: "op",
        insert: "attr:",
        label: "attr:",
        hint: "e.g. attr:armor>=50",
        ico: "+",
      },
      {
        kind: "op",
        insert: "has:",
        label: "has:",
        hint: "stat · title · level",
        ico: "+",
      },
      {
        kind: "op",
        insert: "is:",
        label: "is:",
        hint: "sell · buy · near · nostat · titled",
        ico: "+",
      },
      {
        kind: "op",
        insert: "price:",
        label: "price:",
        hint: "e.g. price:<1M",
        ico: "+",
      },
      {
        kind: "op",
        insert: "level:",
        label: "level:",
        hint: "e.g. level:>=7",
        ico: "+",
      },
      { kind: "op", insert: "map:", label: "map:", hint: "Filter by map", ico: "+" },
      {
        kind: "op",
        insert: "server:",
        label: "server:",
        hint: "Filter by server",
        ico: "+",
      },
    ]);
    const needle = q.trim().toLowerCase();
    if (needle && !trailingOpContext(q)) {
      const items: MarketSearchSuggestion[] = [];
      for (let i = 0; i < itemNames.length && items.length < 5; i++) {
        if (itemNames[i].toLowerCase().indexOf(needle) < 0) continue;
        items.push({
          kind: "op",
          insert: 'item:"' + itemNames[i] + '" ',
          label: itemNames[i],
          hint: "item",
          ico: "▣",
        });
      }
      pushSec("Items", items);
      const mers: MarketSearchSuggestion[] = [];
      for (let i = 0; i < merchants.length && mers.length < 5; i++) {
        if (merchants[i].toLowerCase().indexOf(needle) < 0) continue;
        mers.push({
          kind: "op",
          insert: "merchant:" + merchants[i] + " ",
          label: merchants[i],
          hint: "merchant",
          ico: "◆",
        });
      }
      pushSec("Merchants", mers);
    }
  }

  return { sections, flat };
}
