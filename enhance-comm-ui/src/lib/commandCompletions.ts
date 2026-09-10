/**
 * Command editor completions from live `G` + official runner_functions.js.
 * Catalogs from `window.G`. API names + signatures scraped from
 * `/js/runner_functions.js` (text fetch — never executed).
 */

import { getG } from "../host/al";
import type { GLike } from "../host/globals";

export type CommandCompletionKind =
  | "api"
  | "skill"
  | "item"
  | "monster"
  | "npc"
  | "map"
  | "event"
  | "shortcut"
  | "stop"
  | "prop";

export type CommandCompletion = {
  text: string;
  label: string;
  kind: CommandCompletionKind;
  detail?: string;
};

export type CommandCompletionQuery = {
  value: string;
  cursor: number;
};

export type RunnerObjectKey = {
  key: string;
  detail?: string;
};

export type RunnerFnSig = {
  name: string;
  params: string[];
  /** Option keys from `//args:` docs or `args.foo` uses in the body. */
  objectKeys: RunnerObjectKey[];
};

export type RunnerApiIndex = {
  names: string[];
  sigs: Record<string, RunnerFnSig>;
};

/**
 * Named smart_move destinations that are not G map/npc/monster keys.
 * Tiny fixed set from the CODE API (not a catalog dump).
 */
export const SMART_MOVE_SHORTCUTS: string[] = [
  "town",
  "upgrade",
  "compound",
  "exchange",
  "potions",
  "scrolls",
];

const STOP_MODES = ["move", "town", "blink", "smart", "teleport"];

/** Params that are numeric / callbacks / free text — no G catalog. */
const SKIP_PARAMS: Record<string, boolean> = {
  quantity: true,
  num: true,
  gold: true,
  x: true,
  y: true,
  timeout_ms: true,
  on_done: true,
  message: true,
  target: true,
  entity: true,
  color: true,
  data: true,
  failed: true,
  fn: true,
  result: true,
  a: true,
  b: true,
  price: true,
  pack: true,
  pack_num: true,
  slot: true,
  trade_slot: true,
  item_num: true,
  scroll_num: true,
  offering_num: true,
  only_calculate: true,
  size: true,
  code: true,
  code_slot_or_name: true,
  receiver: true,
  to: true,
  value: true,
  second: true,
  spawn: true,
  extra_arg: true,
  p: true,
};

/** `name` means an item key for these functions. */
const ITEM_NAME_FNS: Record<string, boolean> = {
  buy: true,
  buy_with_gold: true,
  buy_with_shells: true,
  quantity: true,
  locate_item: true,
  craft: true,
  auto_craft: true,
};

/** `name` means a skill key for these functions. */
const SKILL_NAME_FNS: Record<string, boolean> = {
  use_skill: true,
  reduce_cooldown: true,
};

const MAX_RESULTS = 40;

export type CompletionContextKind =
  | "api"
  | "skill"
  | "item"
  | "monster"
  | "npc"
  | "mapish"
  | "event"
  | "stop"
  | "prop"
  | "none"
  | "any_key";

export type CompletionContext = {
  prefix: string;
  from: number;
  to: number;
  inString: boolean;
  wantQuoted: boolean;
  /** Object-property insert should append `: `. */
  wantColon: boolean;
  quote: "'" | '"';
  kind: CompletionContextKind;
  callName?: string;
  argIndex?: number;
  paramName?: string;
};

function stripDefault(param: string): string {
  const raw = String(param || "").trim();
  if (!raw) return "";
  const eq = raw.indexOf("=");
  const base = eq >= 0 ? raw.slice(0, eq) : raw;
  return base.replace(/\s+/g, "").replace(/^[.]{3}/, "");
}

/** Parse `//args:` comment block and/or `args.foo` property reads. */
export function parseObjectArgKeys(bodySnippet: string): RunnerObjectKey[] {
  const out: RunnerObjectKey[] = [];
  const seen: Record<string, boolean> = Object.create(null);

  const push = (key: string, detail?: string) => {
    if (!key || seen[key]) return;
    seen[key] = true;
    const row: RunnerObjectKey = { key };
    if (detail) row.detail = detail;
    out.push(row);
  };

  const block = /^\s*\/\/\s*args\s*:?\s*\r?\n((?:\s*\/\/[^\n]*\r?\n?)+)/i.exec(
    bodySnippet,
  );
  if (block) {
    const lines = block[1].split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m =
        /^\s*\/\/\s*([A-Za-z_][\w]*)\s*(?:[-:]\s*(.*))?$/.exec(line) ||
        /^\s*\/\/\s*([A-Za-z_][\w]*)\s*$/.exec(line);
      if (!m) continue;
      const detail = m[2] ? String(m[2]).trim() : "";
      push(m[1], detail || undefined);
    }
  }

  const useRe = /\bargs\.([A-Za-z_][\w]*)/g;
  let um: RegExpExecArray | null;
  while ((um = useRe.exec(bodySnippet))) {
    push(um[1]);
  }

  return out;
}

/** Full scrape: names, params, object-option keys. */
export function parseRunnerApiIndex(source: string): RunnerApiIndex {
  const sigs: Record<string, RunnerFnSig> = Object.create(null);
  const re =
    /(?:^|[\n\r;])\s*(?:async\s+)?function\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const name = m[1];
    if (!name || sigs[name]) continue;
    const paramsRaw = m[2].split(",");
    const params: string[] = [];
    for (let i = 0; i < paramsRaw.length; i++) {
      const p = stripDefault(paramsRaw[i]);
      if (p) params.push(p);
    }
    const bodyStart = (m.index || 0) + m[0].length;
    const snippet = source.slice(bodyStart, bodyStart + 1600);
    sigs[name] = {
      name,
      params,
      objectKeys: parseObjectArgKeys(snippet),
    };
  }
  const names = Object.keys(sigs);
  names.sort((a, b) => a.localeCompare(b));
  return { names, sigs };
}

export function parseRunnerFunctionNames(source: string): string[] {
  return parseRunnerApiIndex(source).names;
}

export function runnerFunctionsUrl(): string {
  const w =
    typeof window !== "undefined"
      ? (window as Window & {
          version?: string | number;
          v?: string | number;
          domain?: { v?: string | number };
        })
      : null;
  const ver =
    (w && w.version) ||
    (w && w.v) ||
    (w && w.domain && w.domain.v) ||
    "";
  const base = "/js/runner_functions.js";
  return ver ? `${base}?v=${encodeURIComponent(String(ver))}` : base;
}

let runnerIndex: RunnerApiIndex | null = null;
let runnerApiInflight: Promise<string[]> | null = null;

export function getRunnerApiIndex(): RunnerApiIndex {
  return (
    runnerIndex || {
      names: [],
      sigs: Object.create(null) as Record<string, RunnerFnSig>,
    }
  );
}

export function getRunnerApiNames(): string[] {
  return getRunnerApiIndex().names.slice();
}

/** Test / inject hook. */
export function setRunnerApiIndexForTests(index: RunnerApiIndex | null): void {
  runnerIndex = index
    ? {
        names: index.names.slice(),
        sigs: index.sigs,
      }
    : null;
  runnerApiInflight = null;
}

/** @deprecated use setRunnerApiIndexForTests */
export function setRunnerApiNamesForTests(names: string[] | null): void {
  if (!names) {
    setRunnerApiIndexForTests(null);
    return;
  }
  const sigs: Record<string, RunnerFnSig> = Object.create(null);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    sigs[name] = { name, params: [], objectKeys: [] };
  }
  setRunnerApiIndexForTests({ names: names.slice(), sigs });
}

export function ensureRunnerApiNames(): Promise<string[]> {
  if (runnerIndex) return Promise.resolve(runnerIndex.names.slice());
  if (runnerApiInflight) return runnerApiInflight;
  if (typeof fetch !== "function") {
    runnerIndex = { names: [], sigs: Object.create(null) };
    return Promise.resolve([]);
  }
  runnerApiInflight = fetch(runnerFunctionsUrl(), {
    credentials: "same-origin",
    cache: "force-cache",
  })
    .then((res) => {
      if (!res.ok) throw new Error("runner_functions " + res.status);
      return res.text();
    })
    .then((text) => {
      runnerIndex = parseRunnerApiIndex(text);
      return runnerIndex.names.slice();
    })
    .catch(() => {
      if (!runnerIndex) {
        runnerIndex = { names: [], sigs: Object.create(null) };
      }
      return runnerIndex.names.slice();
    })
    .then((names) => {
      runnerApiInflight = null;
      return names;
    });
  return runnerApiInflight;
}

function catalogKeys(
  table: Record<string, any> | null | undefined,
): string[] {
  if (!table || typeof table !== "object") return [];
  const keys = Object.keys(table);
  const out: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k || k === "ignore" || k === "placeholder") continue;
    out.push(k);
  }
  return out;
}

function detailOf(
  table: Record<string, any> | null | undefined,
  key: string,
): string | undefined {
  if (!table || !table[key]) return undefined;
  const name = table[key].name;
  return typeof name === "string" && name && name !== key ? name : undefined;
}

export type CommandCatalogSnapshot = {
  skills: string[];
  items: string[];
  monsters: string[];
  npcs: string[];
  maps: string[];
  events: string[];
  skillDetail: (key: string) => string | undefined;
  itemDetail: (key: string) => string | undefined;
  monsterDetail: (key: string) => string | undefined;
  npcDetail: (key: string) => string | undefined;
  mapDetail: (key: string) => string | undefined;
  eventDetail: (key: string) => string | undefined;
};

export function snapshotCommandCatalogs(
  G?: GLike | null,
): CommandCatalogSnapshot {
  const g = G || getG() || null;
  const skills = g?.skills || null;
  const items = g?.items || null;
  const monsters = g?.monsters || null;
  const npcs = g?.npcs || null;
  const maps = g?.maps || null;
  const events = g?.events || null;
  return {
    skills: catalogKeys(skills),
    items: catalogKeys(items),
    monsters: catalogKeys(monsters),
    npcs: catalogKeys(npcs),
    maps: catalogKeys(maps),
    events: catalogKeys(events),
    skillDetail: (k) => detailOf(skills, k),
    itemDetail: (k) => detailOf(items, k),
    monsterDetail: (k) => detailOf(monsters, k),
    npcDetail: (k) => detailOf(npcs, k),
    mapDetail: (k) => detailOf(maps, k),
    eventDetail: (k) => detailOf(events, k),
  };
}

/**
 * Map a scraped param name (+ function) to a completion catalog.
 * Pure — unit-testable.
 */
export function kindForParam(
  callName: string,
  paramName: string,
): CompletionContextKind {
  const fn = String(callName || "").toLowerCase();
  const p = String(paramName || "").toLowerCase();
  if (!p) return "none";
  if (SKIP_PARAMS[p]) return "none";
  if (p === "skill") return "skill";
  if (p === "npc_id" || p === "npc") return "npc";
  if (
    p === "map" ||
    p === "destination" ||
    p === "dest" ||
    p === "place"
  ) {
    return "mapish";
  }
  if (p === "event") return "event";
  if (p === "action" && fn === "stop") return "stop";
  if (p === "item") return "item";
  if (p === "type" || p === "mtype") return "monster";
  if (p === "args") return "none";
  if (p === "name") {
    if (ITEM_NAME_FNS[fn]) return "item";
    if (SKILL_NAME_FNS[fn]) return "skill";
    return "none";
  }
  if (p === "name_or_slot") return "item";
  return "none";
}

function kindForObjectPropValue(
  _callName: string,
  prop: string,
): CompletionContextKind {
  const p = String(prop || "").toLowerCase();
  if (p === "type" || p === "mtype") return "monster";
  return "none";
}

type CallSite = {
  name: string;
  argIndex: number;
  /** Index of `(` opening this call. */
  openParen: number;
  /** Start of current argument text. */
  argStart: number;
};

/**
 * Find the innermost call covering `cursor`, with 0-based argument index.
 */
export function findEnclosingCall(
  value: string,
  cursor: number,
): CallSite | null {
  const c = Math.max(0, Math.min(cursor, value.length));
  let inString: "'" | '"' | null = null;
  const callStack: Array<{
    name: string;
    openParen: number;
    argIndex: number;
    argStart: number;
    brace: number;
    bracket: number;
  }> = [];

  for (let i = 0; i < c; i++) {
    const ch = value[i];
    const prev = i > 0 ? value[i - 1] : "";
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === "(") {
      let j = i - 1;
      while (j >= 0 && /\s/.test(value[j])) j--;
      let end = j;
      while (j >= 0 && /[A-Za-z0-9_]/.test(value[j])) j--;
      const name = value.slice(j + 1, end + 1);
      if (name && /^[A-Za-z_]/.test(name)) {
        callStack.push({
          name,
          openParen: i,
          argIndex: 0,
          argStart: i + 1,
          brace: 0,
          bracket: 0,
        });
      } else if (callStack.length) {
        callStack[callStack.length - 1].bracket++;
      }
      continue;
    }
    if (ch === ")") {
      if (callStack.length) {
        const top = callStack[callStack.length - 1];
        if (top.bracket > 0) top.bracket--;
        else callStack.pop();
      }
      continue;
    }
    if (ch === "{") {
      if (callStack.length) callStack[callStack.length - 1].brace++;
      continue;
    }
    if (ch === "}") {
      if (callStack.length && callStack[callStack.length - 1].brace > 0) {
        callStack[callStack.length - 1].brace--;
      }
      continue;
    }
    if (ch === "[") {
      if (callStack.length) callStack[callStack.length - 1].bracket++;
      continue;
    }
    if (ch === "]") {
      if (callStack.length && callStack[callStack.length - 1].bracket > 0) {
        callStack[callStack.length - 1].bracket--;
      }
      continue;
    }
    if (
      ch === "," &&
      callStack.length &&
      callStack[callStack.length - 1].brace === 0 &&
      callStack[callStack.length - 1].bracket === 0
    ) {
      const top = callStack[callStack.length - 1];
      top.argIndex++;
      top.argStart = i + 1;
    }
  }

  if (!callStack.length) return null;
  const top = callStack[callStack.length - 1];
  return {
    name: top.name,
    argIndex: top.argIndex,
    openParen: top.openParen,
    argStart: top.argStart,
  };
}

type ObjectSite = {
  mode: "key" | "value";
  propKey?: string;
  prefix: string;
  from: number;
  to: number;
};

/** Inspect `{ … }` option object inside the current argument. */
export function inspectObjectSite(
  value: string,
  cursor: number,
  argStart: number,
): ObjectSite | null {
  const c = Math.max(0, Math.min(cursor, value.length));
  if (argStart < 0 || argStart > c) return null;
  const slice = value.slice(argStart, c);

  let inString: "'" | '"' | null = null;
  let brace = 0;
  let objOpen = -1;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    const prev = i > 0 ? slice[i - 1] : "";
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === "{") {
      if (brace === 0) objOpen = argStart + i;
      brace++;
      continue;
    }
    if (ch === "}") {
      if (brace > 0) brace--;
      if (brace === 0) objOpen = -1;
      continue;
    }
  }
  if (objOpen < 0 || brace < 1) return null;

  // Text inside the object up to cursor
  const inner = value.slice(objOpen + 1, c);
  // Find last comma / start for current property fragment
  let fragStart = 0;
  inString = null;
  let nested = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = i > 0 ? inner[i - 1] : "";
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === "{" || ch === "[") nested++;
    else if (ch === "}" || ch === "]") {
      if (nested > 0) nested--;
    } else if (ch === "," && nested === 0) fragStart = i + 1;
  }
  const frag = inner.slice(fragStart);
  // value mode: `type: ` or `type: 'go`
  const valueMode = /^\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(frag);
  if (valueMode) {
    const propKey = valueMode[1];
    const after = valueMode[2];
    const sm = /^(['"])(.*)$/.exec(after);
    if (sm) {
      return {
        mode: "value",
        propKey,
        prefix: sm[2],
        from: c - sm[2].length,
        to: c,
      };
    }
    if (/^\s*$/.test(after)) {
      return {
        mode: "value",
        propKey,
        prefix: "",
        from: c,
        to: c,
      };
    }
    const id = /([A-Za-z_][\w]*)$/.exec(after);
    if (id) {
      return {
        mode: "value",
        propKey,
        prefix: id[1],
        from: c - id[1].length,
        to: c,
      };
    }
    return {
      mode: "value",
      propKey,
      prefix: "",
      from: c,
      to: c,
    };
  }

  // key mode
  const keyId = /^\s*([A-Za-z_][\w]*)$/.exec(frag);
  if (!keyId && !/^\s*$/.test(frag)) return null;
  const prefix = keyId ? keyId[1] : "";
  const from = keyId ? c - keyId[1].length : c;
  return {
    mode: "key",
    prefix,
    from,
    to: c,
  };
}

export function inspectCompletionContext(
  value: string,
  cursor: number,
  apiIndex?: RunnerApiIndex | null,
): CompletionContext {
  const c = Math.max(0, Math.min(cursor, value.length));
  const before = value.slice(0, c);
  const index = apiIndex || getRunnerApiIndex();

  let quote: "'" | '"' = "'";
  let inString = false;
  let stringStart = -1;
  for (let i = 0; i < before.length; i++) {
    const ch = before[i];
    if (!inString) {
      if (ch === "'" || ch === '"') {
        inString = true;
        quote = ch;
        stringStart = i;
      }
    } else if (ch === quote && before[i - 1] !== "\\") {
      inString = false;
      stringStart = -1;
    }
  }

  const call = findEnclosingCall(value, c);

  // Object option site (wins when inside call arg object)
  if (call) {
    const obj = inspectObjectSite(value, c, call.argStart);
    if (obj) {
      const sig = index.sigs[call.name];
      if (obj.mode === "key") {
        return {
          prefix: obj.prefix,
          from: obj.from,
          to: obj.to,
          inString: false,
          wantQuoted: false,
          wantColon: true,
          quote,
          kind: "prop",
          callName: call.name,
          argIndex: call.argIndex,
          paramName: sig?.params[call.argIndex],
        };
      }
      // value
      const kind = kindForObjectPropValue(call.name, obj.propKey || "");
      const valueInString = inString && stringStart >= 0;
      return {
        prefix: valueInString
          ? before.slice(stringStart + 1)
          : obj.prefix,
        from: valueInString ? stringStart + 1 : obj.from,
        to: c,
        inString: valueInString,
        wantQuoted: !valueInString && kind !== "none" && kind !== "api",
        wantColon: false,
        quote,
        kind,
        callName: call.name,
        argIndex: call.argIndex,
        paramName: obj.propKey,
      };
    }
  }

  if (inString && stringStart >= 0) {
    const prefix = before.slice(stringStart + 1);
    let kind: CompletionContextKind = "any_key";
    let paramName: string | undefined;
    if (call) {
      const sig = index.sigs[call.name];
      paramName = sig?.params[call.argIndex];
      kind = paramName
        ? kindForParam(call.name, paramName)
        : fallbackKindForCall(call.name);
    }
    return {
      prefix,
      from: stringStart + 1,
      to: c,
      inString: true,
      wantQuoted: false,
      wantColon: false,
      quote,
      kind,
      callName: call?.name,
      argIndex: call?.argIndex,
      paramName,
    };
  }

  // Bare identifier → API names (not inside a call string)
  if (!call) {
    const idMatch = /([A-Za-z_][\w]*)$/.exec(before);
    if (idMatch) {
      return {
        prefix: idMatch[1],
        from: c - idMatch[1].length,
        to: c,
        inString: false,
        wantQuoted: false,
        wantColon: false,
        quote,
        kind: "api",
      };
    }
    return {
      prefix: "",
      from: c,
      to: c,
      inString: false,
      wantQuoted: false,
      wantColon: false,
      quote,
      kind: "api",
    };
  }

  // Inside call, not in string — maybe starting an arg
  const sig = index.sigs[call.name];
  const paramName = sig?.params[call.argIndex];
  const kind = paramName
    ? kindForParam(call.name, paramName)
    : fallbackKindForCall(call.name);

  // Identifier mid-arg (unquoted)
  const argBefore = value.slice(call.argStart, c);
  const idMatch = /([A-Za-z_][\w]*)$/.exec(argBefore);
  if (idMatch && kind === "api") {
    return {
      prefix: idMatch[1],
      from: c - idMatch[1].length,
      to: c,
      inString: false,
      wantQuoted: false,
      wantColon: false,
      quote,
      kind: "api",
    };
  }

  return {
    prefix: idMatch && kind !== "none" ? idMatch[1] : "",
    from: idMatch && kind !== "none" ? c - idMatch[1].length : c,
    to: c,
    inString: false,
    wantQuoted: kind !== "none" && kind !== "api" && kind !== "prop",
    wantColon: false,
    quote,
    kind,
    callName: call.name,
    argIndex: call.argIndex,
    paramName,
  };
}

/** When signatures not yet loaded — coarse fallback from call name. */
function fallbackKindForCall(call: string): CompletionContextKind {
  const name = String(call || "").toLowerCase();
  if (SKILL_NAME_FNS[name] || name === "is_on_cooldown") return "skill";
  if (ITEM_NAME_FNS[name]) return "item";
  if (name === "find_npc") return "npc";
  if (name === "join") return "event";
  if (name === "stop") return "stop";
  if (
    name === "smart_move" ||
    name === "transport" ||
    name === "enter"
  ) {
    return "mapish";
  }
  return "none";
}

function pushKey(
  out: CommandCompletion[],
  key: string,
  kind: CommandCompletionKind,
  ctx: CompletionContext,
  detail?: string,
): void {
  let text = key;
  if (ctx.wantColon && kind === "prop") text = `${key}: `;
  else if (ctx.wantQuoted && !ctx.inString) {
    text = `${ctx.quote}${key}${ctx.quote}`;
  }
  out.push({
    text,
    label: key,
    kind,
    detail,
  });
}

function filterSort(
  items: CommandCompletion[],
  prefix: string,
): CommandCompletion[] {
  const q = prefix.toLowerCase();
  const scored: Array<{ score: number; item: CommandCompletion }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.label.toLowerCase();
    const detail = (item.detail || "").toLowerCase();
    let score = -1;
    if (!q) score = 0;
    else if (label === q) score = 400;
    else if (label.startsWith(q)) {
      // Prefer the shortest prefix hit so `t` ranks `type` over `target`.
      score = 300 - Math.min(label.length, 80);
    } else if (detail.startsWith(q)) score = 200;
    else if (label.indexOf(q) >= 0) score = 100;
    else if (detail.indexOf(q) >= 0) score = 50;
    if (score < 0) continue;
    if (item.kind === "api") score += 5;
    if (item.kind === "shortcut") score += 8;
    if (item.kind === "prop") score += 10;
    scored.push({ score, item });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.label.localeCompare(b.item.label);
  });
  const out: CommandCompletion[] = [];
  const seen: Record<string, boolean> = Object.create(null);
  for (let i = 0; i < scored.length && out.length < MAX_RESULTS; i++) {
    const it = scored[i].item;
    const k = it.kind + ":" + it.label;
    if (seen[k]) continue;
    seen[k] = true;
    out.push(it);
  }
  return out;
}

export type ListCompletionsOpts = {
  catalog?: CommandCatalogSnapshot | null;
  apiNames?: string[] | null;
  apiIndex?: RunnerApiIndex | null;
};

export function listCommandCompletions(
  query: CommandCompletionQuery,
  opts?: ListCompletionsOpts | null,
): CommandCompletion[] {
  const index =
    opts?.apiIndex ||
    (opts?.apiNames
      ? {
          names: opts.apiNames.slice(),
          sigs: Object.create(null) as Record<string, RunnerFnSig>,
        }
      : getRunnerApiIndex());
  // If only names provided, still parse sigs from empty — merge names into index
  if (opts?.apiNames && !opts?.apiIndex) {
    for (let i = 0; i < opts.apiNames.length; i++) {
      const n = opts.apiNames[i];
      if (!index.sigs[n]) {
        index.sigs[n] = { name: n, params: [], objectKeys: [] };
      }
    }
  }

  const ctx = inspectCompletionContext(query.value, query.cursor, index);
  if (ctx.kind === "none") return [];

  const snap = opts?.catalog || snapshotCommandCatalogs();
  const apis = index.names.length
    ? index.names
    : opts?.apiNames || getRunnerApiNames();
  const raw: CommandCompletion[] = [];

  const addKeys = (
    keys: string[],
    kind: CommandCompletionKind,
    detailFn: (k: string) => string | undefined,
  ) => {
    for (let i = 0; i < keys.length; i++) {
      pushKey(raw, keys[i], kind, ctx, detailFn(keys[i]));
    }
  };

  if (ctx.kind === "api") {
    for (let i = 0; i < apis.length; i++) {
      pushKey(raw, apis[i], "api", ctx);
    }
  } else if (ctx.kind === "prop") {
    const sig = ctx.callName ? index.sigs[ctx.callName] : null;
    const keys = sig?.objectKeys || [];
    for (let i = 0; i < keys.length; i++) {
      pushKey(raw, keys[i].key, "prop", ctx, keys[i].detail);
    }
  } else if (ctx.kind === "skill") {
    addKeys(snap.skills, "skill", snap.skillDetail);
  } else if (ctx.kind === "item") {
    addKeys(snap.items, "item", snap.itemDetail);
  } else if (ctx.kind === "monster") {
    addKeys(snap.monsters, "monster", snap.monsterDetail);
  } else if (ctx.kind === "npc") {
    addKeys(snap.npcs, "npc", snap.npcDetail);
  } else if (ctx.kind === "event") {
    addKeys(snap.events, "event", snap.eventDetail);
  } else if (ctx.kind === "stop") {
    for (let i = 0; i < STOP_MODES.length; i++) {
      pushKey(raw, STOP_MODES[i], "stop", ctx);
    }
  } else if (ctx.kind === "mapish") {
    for (let i = 0; i < SMART_MOVE_SHORTCUTS.length; i++) {
      pushKey(raw, SMART_MOVE_SHORTCUTS[i], "shortcut", ctx);
    }
    addKeys(snap.maps, "map", snap.mapDetail);
    addKeys(snap.npcs, "npc", snap.npcDetail);
    addKeys(snap.monsters, "monster", snap.monsterDetail);
    addKeys(snap.events, "event", snap.eventDetail);
  } else if (ctx.kind === "any_key") {
    addKeys(snap.skills, "skill", snap.skillDetail);
    addKeys(snap.items, "item", snap.itemDetail);
    addKeys(snap.maps, "map", snap.mapDetail);
    addKeys(snap.npcs, "npc", snap.npcDetail);
    addKeys(snap.monsters, "monster", snap.monsterDetail);
    addKeys(snap.events, "event", snap.eventDetail);
  }

  return filterSort(raw, ctx.prefix);
}

export function shouldAutoOpenCompletions(
  value: string,
  cursor: number,
  apiIndex?: RunnerApiIndex | null,
): boolean {
  const ctx = inspectCompletionContext(value, cursor, apiIndex);
  if (ctx.kind === "none") return false;
  if (ctx.kind === "api") return ctx.prefix.length >= 2;
  if (ctx.kind === "prop") return true;
  if (ctx.inString) return true;
  if (/[A-Za-z_][\w]*\s*\(\s*$/.test(value.slice(0, cursor))) return true;
  return ctx.prefix.length >= 1;
}
