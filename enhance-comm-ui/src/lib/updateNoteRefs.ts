/**
 * Find Adventure.land entities mentioned in server update-note text so Comm
 * can render GameIcon chips next to those names.
 */

import { getG } from "../host/al";
import type { GameIconKind } from "./gameIcon";

export type UpdateNoteRefKind =
  | "item"
  | "skill"
  | "monster"
  | "class"
  | "condition";

export type UpdateNoteLexEntry = {
  /** Lowercase match phrase. */
  phrase: string;
  id: string;
  kind: UpdateNoteRefKind;
};

export type UpdateNoteSegment =
  | { type: "text"; text: string }
  | {
      type: "ref";
      id: string;
      kind: UpdateNoteRefKind;
      /** Original casing from the note. */
      text: string;
    };

/** Single-word names too generic to match safely (substring / common nouns). */
const GENERIC_SINGLE_NAMES = new Set(
  [
    "bow",
    "wand",
    "cape",
    "coat",
    "belt",
    "ring",
    "staff",
    "sword",
    "mace",
    "claw",
    "orb",
    "egg",
    "gift",
    "test",
    "ink",
    "ale",
    "gum",
    "coal",
    "rod",
    "axe",
    "spear",
    "blade",
    "shield",
    "helmet",
    "boots",
    "gloves",
    "pants",
    "shoes",
    "shirt",
    "armor",
    "scroll",
    "potion",
    "gem",
    "key",
    "box",
    "bag",
    "misc",
    "stone",
    "wood",
    "iron",
    "gold",
    "silver",
    "code",
    "server",
    "client",
    "event",
    "attack",
    "heal",
    "move",
    "stop",
    "use",
    "open",
    "blink",
  ].map((s) => s.toLowerCase()),
);

let cachedVersion: string | number | null = null;
let cachedLexicon: UpdateNoteLexEntry[] = [];

function isBoundary(ch: string | undefined): boolean {
  if (ch == null || ch === "") return true;
  return !/[A-Za-z0-9_]/.test(ch);
}

function phraseAllowed(phrase: string, source: "name" | "id"): boolean {
  const p = phrase.trim();
  if (p.length < 3) return false;
  const lower = p.toLowerCase();
  if (GENERIC_SINGLE_NAMES.has(lower)) return false;
  if (/\s/.test(p)) return p.length >= 5;
  if (source === "id") {
    // Code-like item ids (fcape, snakefang) — not English display titles.
    return /^[a-z][a-z0-9_]{3,}$/i.test(p);
  }
  // Single-word display names need enough length to avoid "Wand"/"Bow".
  return p.length >= 7;
}

function pushEntry(
  out: UpdateNoteLexEntry[],
  seen: Set<string>,
  phrase: string,
  id: string,
  kind: UpdateNoteRefKind,
  source: "name" | "id",
): void {
  if (!phraseAllowed(phrase, source)) return;
  const key = `${kind}\0${id}\0${phrase.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ phrase: phrase.toLowerCase(), id, kind });
}

/** Build match phrases from live G (names preferred; ids when distinctive). */
export function buildUpdateNoteLexicon(G: unknown): UpdateNoteLexEntry[] {
  const g = G as {
    items?: Record<string, { name?: string } | undefined>;
    skills?: Record<string, { name?: string } | undefined>;
    monsters?: Record<string, { name?: string } | undefined>;
    classes?: Record<string, { name?: string } | undefined>;
    conditions?: Record<string, { name?: string } | undefined>;
  } | null;
  if (!g) return [];

  const out: UpdateNoteLexEntry[] = [];
  const seen = new Set<string>();

  const tables: Array<{
    bag: Record<string, { name?: string } | undefined> | undefined;
    kind: UpdateNoteRefKind;
  }> = [
    { bag: g.items, kind: "item" },
    { bag: g.skills, kind: "skill" },
    { bag: g.monsters, kind: "monster" },
    { bag: g.conditions, kind: "condition" },
  ];

  for (let t = 0; t < tables.length; t++) {
    const { bag, kind } = tables[t];
    if (!bag) continue;
    for (const id of Object.keys(bag)) {
      const def = bag[id];
      if (def && typeof def.name === "string" && def.name.trim()) {
        pushEntry(out, seen, def.name.trim(), id, kind, "name");
      }
      pushEntry(out, seen, id, id, kind, "id");
    }
  }

  if (g.classes) {
    for (const id of Object.keys(g.classes)) {
      const def = g.classes[id];
      const name =
        def && typeof def.name === "string" && def.name.trim()
          ? def.name.trim()
          : id;
      // Class names are short but intentional (Priest, Rogue, …).
      const lower = name.toLowerCase();
      if (name.length < 3 || GENERIC_SINGLE_NAMES.has(lower)) continue;
      const key = `class\0${id}\0${lower}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ phrase: lower, id, kind: "class" });
      if (id.toLowerCase() !== lower) {
        const idKey = `class\0${id}\0${id.toLowerCase()}`;
        if (!seen.has(idKey)) {
          seen.add(idKey);
          out.push({ phrase: id.toLowerCase(), id, kind: "class" });
        }
      }
    }
  }

  out.sort((a, b) => b.phrase.length - a.phrase.length || a.phrase.localeCompare(b.phrase));
  return out;
}

export function getUpdateNoteLexicon(): UpdateNoteLexEntry[] {
  const G = getG() as { version?: string | number } | undefined;
  const version = G && G.version != null ? G.version : null;
  if (version !== cachedVersion || !cachedLexicon.length) {
    cachedVersion = version;
    cachedLexicon = buildUpdateNoteLexicon(G);
  }
  return cachedLexicon;
}

/** Test helper — drop cached lexicon. */
export function resetUpdateNoteLexiconCache(): void {
  cachedVersion = null;
  cachedLexicon = [];
}

type Hit = {
  start: number;
  end: number;
  id: string;
  kind: UpdateNoteRefKind;
};

/**
 * Longest-first, non-overlapping matches with alphanumeric word boundaries.
 */
export function findUpdateNoteRefs(
  note: string,
  lexicon: UpdateNoteLexEntry[] = getUpdateNoteLexicon(),
): Hit[] {
  if (!note || !lexicon.length) return [];
  const lower = note.toLowerCase();
  const candidates: Hit[] = [];

  for (let i = 0; i < lexicon.length; i++) {
    const entry = lexicon[i];
    const phrase = entry.phrase;
    if (!phrase) continue;
    let from = 0;
    while (from <= lower.length - phrase.length) {
      const at = lower.indexOf(phrase, from);
      if (at < 0) break;
      const before = at === 0 ? undefined : lower[at - 1];
      const after =
        at + phrase.length >= lower.length
          ? undefined
          : lower[at + phrase.length];
      if (isBoundary(before) && isBoundary(after)) {
        candidates.push({
          start: at,
          end: at + phrase.length,
          id: entry.id,
          kind: entry.kind,
        });
      }
      from = at + 1;
    }
  }

  candidates.sort(
    (a, b) =>
      a.start - b.start || b.end - b.start - (a.end - a.start) || a.kind.localeCompare(b.kind),
  );

  const hits: Hit[] = [];
  let cursor = 0;
  for (let i = 0; i < candidates.length; i++) {
    const hit = candidates[i];
    if (hit.start < cursor) continue;
    hits.push(hit);
    cursor = hit.end;
  }
  return hits;
}

export function segmentUpdateNote(
  note: string,
  lexicon?: UpdateNoteLexEntry[],
): UpdateNoteSegment[] {
  const hits = findUpdateNoteRefs(note, lexicon);
  if (!hits.length) return [{ type: "text", text: note }];

  const segments: UpdateNoteSegment[] = [];
  let cursor = 0;
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (hit.start > cursor) {
      segments.push({ type: "text", text: note.slice(cursor, hit.start) });
    }
    segments.push({
      type: "ref",
      id: hit.id,
      kind: hit.kind,
      text: note.slice(hit.start, hit.end),
    });
    cursor = hit.end;
  }
  if (cursor < note.length) {
    segments.push({ type: "text", text: note.slice(cursor) });
  }
  return segments;
}

export function updateNoteRefIconKind(
  kind: UpdateNoteRefKind,
): Exclude<GameIconKind, "auto" | "actor" | "target" | "death" | "character"> {
  switch (kind) {
    case "item":
      return "item";
    case "skill":
      return "skill";
    case "monster":
      return "monster";
    case "class":
      return "class";
    case "condition":
      return "condition";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Unique refs in note order (for optional icon strips). */
export function uniqueUpdateNoteRefs(
  note: string,
  lexicon?: UpdateNoteLexEntry[],
): Array<{ id: string; kind: UpdateNoteRefKind; text: string }> {
  const hits = findUpdateNoteRefs(note, lexicon);
  const out: Array<{ id: string; kind: UpdateNoteRefKind; text: string }> = [];
  const seen = new Set<string>();
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: hit.id,
      kind: hit.kind,
      text: note.slice(hit.start, hit.end),
    });
  }
  return out;
}
