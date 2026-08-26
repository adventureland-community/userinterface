/**
 * Adventure.land server update notes for /comm.
 *
 * Stock dumps them into #gamelog on welcome and opens a modal for history.
 * /comm has no gamelog, so we bridge add_update_notes / show_update_notes
 * into Comm UI and read the same page globals + /update-notes API.
 */

export type UpdateNote = {
  deployed: string;
  date: string;
  note: string;
};

export type UpdateNotesOpenMode = "latest" | "all";

export type UpdateNotesOpenPayload = {
  mode: UpdateNotesOpenMode;
};

type Listener = (payload: UpdateNotesOpenPayload) => void;

const listeners: Listener[] = [];

/** Pending open if welcome fires before CommUI subscribes. */
let pendingOpen: UpdateNotesOpenPayload | null = null;

export function subscribeUpdateNotesOpen(fn: Listener): () => void {
  listeners.push(fn);
  if (pendingOpen) {
    const payload = pendingOpen;
    pendingOpen = null;
    fn(payload);
  }
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function openUpdateNotes(mode: UpdateNotesOpenMode): void {
  const payload: UpdateNotesOpenPayload = { mode };
  if (!listeners.length) {
    pendingOpen = payload;
    return;
  }
  pendingOpen = null;
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](payload);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function normalizeNote(raw: unknown): UpdateNote | null {
  if (typeof raw === "string") {
    const note = raw.trim();
    if (!note) return null;
    return { deployed: "", date: "", note };
  }
  const obj = asRecord(raw);
  if (!obj) return null;
  const note = typeof obj.note === "string" ? obj.note.trim() : "";
  if (!note) return null;
  const deployed = typeof obj.deployed === "string" ? obj.deployed : "";
  const date =
    typeof obj.date === "string" && obj.date
      ? obj.date
      : deployed || "";
  return { deployed, date, note };
}

export function normalizeUpdateNotes(raw: unknown): UpdateNote[] {
  if (!Array.isArray(raw)) return [];
  const out: UpdateNote[] = [];
  for (let i = 0; i < raw.length; i++) {
    const note = normalizeNote(raw[i]);
    if (note) out.push(note);
  }
  return out;
}

type UpdateNotesWindow = Window & {
  update_notes?: unknown;
  update_notes_more?: boolean;
  last_deploy?: string;
  add_update_notes?: () => void;
  show_update_notes?: () => void;
  __ecuAddUpdateNotes?: () => void;
  __ecuShowUpdateNotes?: () => void;
};

function getW(): UpdateNotesWindow {
  return window as UpdateNotesWindow;
}

/** Page-injected notes (same source stock uses before /update-notes paging). */
export function readPageUpdateNotes(): UpdateNote[] {
  return normalizeUpdateNotes(getW().update_notes);
}

export function readPageUpdateNotesMore(): boolean {
  return !!getW().update_notes_more;
}

/**
 * Stock `last_deploy`, or the newest note's deploy stamp when the page
 * forgot to inject the global (the crash that shipped on some deploys).
 */
export function readLastDeploy(notes?: UpdateNote[]): string {
  const w = getW();
  if (typeof w.last_deploy === "string" && w.last_deploy) return w.last_deploy;
  const list = notes || readPageUpdateNotes();
  for (let i = 0; i < list.length; i++) {
    if (list[i].deployed) return list[i].deployed;
  }
  return "";
}

/** Notes for the latest deploy batch — mirrors stock add_update_notes filter. */
export function latestDeployNotes(
  notes: UpdateNote[],
  lastDeploy?: string,
): { lastDeploy: string; notes: UpdateNote[]; pending: boolean } {
  const deploy = lastDeploy || readLastDeploy(notes);
  const latestStamp =
    (notes.length && notes[0].deployed) || deploy || "";
  const filtered: UpdateNote[] = [];
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (!latestStamp || n.deployed === latestStamp || !n.deployed) {
      filtered.push(n);
    }
  }
  return {
    lastDeploy: deploy,
    notes: filtered,
    pending: !!(notes.length && latestStamp && deploy && latestStamp !== deploy),
  };
}

/** Stock gamelog accent colors for seasonal / event notes. */
export function updateNoteAccent(note: string): string {
  if (note.indexOf("Holiday") !== -1) return "#C82F17";
  if (note.indexOf("Duelland") !== -1) return "#3BB7CB";
  if (note.indexOf("Lunar") !== -1) return "#B02B16";
  if (note.indexOf("Valentine") !== -1) return "#C987B7";
  if (note.indexOf("Halloween") !== -1) return "#DE6E37";
  if (note.indexOf("Egg Hunt Event") !== -1) return "#DE5CB8";
  return "#c8c0b4";
}

export type UpdateNoteKind =
  | "code"
  | "items"
  | "fix"
  | "event"
  | "client"
  | "other";

export type UpdateNoteGroup = {
  stamp: string;
  notes: UpdateNote[];
};

/** Soft tags for scanning — heuristics only, not server categories. */
export function updateNoteKind(note: string): UpdateNoteKind {
  const t = note.toLowerCase();
  if (
    t.indexOf("steam") !== -1 ||
    t.indexOf("macos") !== -1 ||
    t.indexOf("messagepack") !== -1
  ) {
    return "client";
  }
  if (
    /\bcode\b/.test(t) ||
    t.indexOf("server.status") !== -1 ||
    t.indexOf("asynchronous functions") !== -1
  ) {
    return "code";
  }
  if (
    t.indexOf("fixed") !== -1 ||
    t.indexOf("corrected") !== -1 ||
    /\bfix(?:ed|es|ing)?\b/.test(t)
  ) {
    return "fix";
  }
  if (
    t.indexOf("item") !== -1 ||
    t.indexOf("craft") !== -1 ||
    t.indexOf("drop") !== -1 ||
    t.indexOf("shop") !== -1 ||
    t.indexOf("weapon") !== -1 ||
    t.indexOf("equipment") !== -1 ||
    t.indexOf("rogue items") !== -1
  ) {
    return "items";
  }
  if (
    t.indexOf("holiday") !== -1 ||
    t.indexOf("duelland") !== -1 ||
    t.indexOf("lunar") !== -1 ||
    t.indexOf("valentine") !== -1 ||
    t.indexOf("halloween") !== -1 ||
    t.indexOf("egg hunt") !== -1 ||
    t.indexOf("coming soon") !== -1 ||
    t.indexOf("anniversary") !== -1 ||
    /\bevents?\b/.test(t)
  ) {
    return "event";
  }
  return "other";
}

export function updateNoteKindLabel(kind: UpdateNoteKind): string | null {
  switch (kind) {
    case "code":
      return "CODE";
    case "items":
      return "Items";
    case "fix":
      return "Fix";
    case "event":
      return "Event";
    case "client":
      return "Client";
    case "other":
      return null;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Group notes by deploy/date stamp, preserving page order. */
export function groupUpdateNotesByStamp(notes: UpdateNote[]): UpdateNoteGroup[] {
  const groups: UpdateNoteGroup[] = [];
  const indexByStamp = new Map<string, number>();
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const stamp = note.deployed || note.date || "";
    const existing = indexByStamp.get(stamp);
    if (existing === undefined) {
      indexByStamp.set(stamp, groups.length);
      groups.push({ stamp, notes: [note] });
    } else {
      groups[existing].notes.push(note);
    }
  }
  return groups;
}

export type UpdateNotesPage = {
  notes: UpdateNote[];
  more: boolean;
};

export async function fetchUpdateNotesPage(
  offset: number,
): Promise<UpdateNotesPage> {
  const url = `/update-notes?offset=${Math.max(0, Math.floor(offset))}`;
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`update-notes HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  const obj = asRecord(data);
  return {
    notes: normalizeUpdateNotes(obj ? obj.notes : data),
    more: !!(obj && obj.more),
  };
}

/**
 * Merge a fetched page into the live page global so stock load-more stays
 * consistent if anything else still reads window.update_notes.
 */
export function appendPageUpdateNotes(page: UpdateNotesPage): UpdateNote[] {
  const w = getW();
  const merged = readPageUpdateNotes().concat(page.notes);
  w.update_notes = merged;
  w.update_notes_more = page.more;
  return merged;
}

function ensureLastDeployGlobal(): void {
  const w = getW();
  if (typeof w.last_deploy === "string" && w.last_deploy) return;
  const inferred = readLastDeploy();
  if (inferred) w.last_deploy = inferred;
}

function ourAddUpdateNotes(): void {
  ensureLastDeployGlobal();
  openUpdateNotes("latest");
}

function ourShowUpdateNotes(): void {
  ensureLastDeployGlobal();
  openUpdateNotes("all");
}

/**
 * Replace stock gamelog / modal update-notes entry points.
 * Re-applies briefly in case functions.js defines them after us.
 */
export function installUpdateNotesHooks(): void {
  const w = getW();
  ensureLastDeployGlobal();

  const apply = () => {
    ensureLastDeployGlobal();
    if (w.add_update_notes !== ourAddUpdateNotes) {
      if (
        typeof w.add_update_notes === "function" &&
        w.add_update_notes !== ourAddUpdateNotes &&
        !w.__ecuAddUpdateNotes
      ) {
        w.__ecuAddUpdateNotes = w.add_update_notes;
      }
      w.add_update_notes = ourAddUpdateNotes;
    }
    if (w.show_update_notes !== ourShowUpdateNotes) {
      if (
        typeof w.show_update_notes === "function" &&
        w.show_update_notes !== ourShowUpdateNotes &&
        !w.__ecuShowUpdateNotes
      ) {
        w.__ecuShowUpdateNotes = w.show_update_notes;
      }
      w.show_update_notes = ourShowUpdateNotes;
    }
  };

  apply();
  let ticks = 0;
  const timer = window.setInterval(() => {
    apply();
    ticks += 1;
    if (ticks >= 40) window.clearInterval(timer);
  }, 500);
}
