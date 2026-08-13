/**
 * IndexedDB fight archive. Engine never opens IDB; query stays sync.
 * segments: one row per sealed fight. draft: key "current" for live.
 */

import { getMeterAppearance } from "./meterAppearance";
import { isProtectedInstance } from "./meterRun";
import {
  packSegment,
  unpackTapes,
  type PackedTapes,
  type SegmentAgg,
} from "./meterSegmentPack";
import { playerNamesFromSegment } from "./meterSegmentMeta";
import type { CombatSegment } from "./meterTypes";
import { markMeterDirty } from "./meterUiTick";

const DB_NAME = "ecu-meter-archive";
const DB_VER = 1;
const STORE_SEGMENTS = "segments";
const STORE_DRAFT = "draft";
const DRAFT_KEY = "current";
const DRAFT_MS = 5000;
const MAX_QUOTA_EVICT = 8;

export type ArchiveMeta = {
  id: string;
  startedAt: number;
  map?: string;
  mapIn?: string;
  event?: string;
  label?: string;
  outcome?: CombatSegment["outcome"];
  kind?: CombatSegment["kind"];
  endedAt?: number;
  observingName?: string;
  playerNames?: string[];
  deaths?: number;
  serverRegion?: string;
  serverIdentifier?: string;
  /**
   * Retention favorite. Missing/undefined migrates as false.
   * Cleanup never deletes favorites; archive may exceed maxArchivedSegments
   * when favorites alone push past the cap.
   */
  favorite?: boolean;
};

type SegmentRow = ArchiveMeta & {
  endedAt?: number;
  aggGzip: ArrayBuffer;
  tapes: PackedTapes;
  gzip: 0 | 1;
};

type DraftRow = {
  id: string;
  startedAt: number;
  map?: string;
  mapIn?: string;
  event?: string;
  agg: SegmentAgg;
  tapes: PackedTapes;
};

type ArchiveHooks = {
  getLive: () => CombatSegment | null;
  getPastIds: () => string[];
  adoptPast: (segs: CombatSegment[]) => void;
  adoptLive: (seg: CombatSegment) => void;
  protectMapIn: () => string;
};

let hooks: ArchiveHooks | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let meta: ArchiveMeta[] = [];
let draftTimer: ReturnType<typeof setTimeout> | null = null;
let draftDirty = false;
let hydrating: Record<string, boolean> = {};
let started = false;
let unsubLife: (() => void) | null = null;

function archiveCap(): number {
  return getMeterAppearance().maxArchivedSegments;
}

function ramCap(): number {
  return getMeterAppearance().maxPastSegments;
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SEGMENTS)) {
        const segs = db.createObjectStore(STORE_SEGMENTS, { keyPath: "id" });
        segs.createIndex("startedAt", "startedAt");
        segs.createIndex("map", "map");
        segs.createIndex("mapIn", "mapIn");
      }
      if (!db.objectStoreNames.contains(STORE_DRAFT)) {
        db.createObjectStore(STORE_DRAFT);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function commitTx(tx: IDBTransaction): void {
  const anyTx = tx as IDBTransaction & { commit?: () => void };
  if (typeof anyTx.commit === "function") anyTx.commit();
}

function isQuota(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  const name = e && e.name;
  const msg = (e && e.message) || "";
  return name === "QuotaExceededError" || /quota/i.test(msg);
}

async function gzipUtf8(
  text: string,
): Promise<{ buf: ArrayBuffer; gzip: 0 | 1 }> {
  const bytes = new TextEncoder().encode(text);
  const CS = (globalThis as { CompressionStream?: typeof CompressionStream })
    .CompressionStream;
  const copy = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  if (typeof CS !== "function") return { buf: copy, gzip: 0 };
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CS("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    return { buf, gzip: 1 };
  } catch {
    return { buf: copy, gzip: 0 };
  }
}

async function gunzipUtf8(buf: ArrayBuffer, gzip: 0 | 1): Promise<string> {
  if (!gzip) return new TextDecoder().decode(buf);
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream })
    .DecompressionStream;
  if (typeof DS !== "function") return new TextDecoder().decode(buf);
  const stream = new Blob([buf]).stream().pipeThrough(new DS("gzip"));
  return await new Response(stream).text();
}

function metaOf(row: ArchiveMeta): ArchiveMeta {
  return {
    id: row.id,
    startedAt: row.startedAt,
    map: row.map,
    mapIn: row.mapIn,
    event: row.event,
    label: row.label,
    outcome: row.outcome,
    kind: row.kind,
    endedAt: row.endedAt,
    observingName: row.observingName,
    playerNames: row.playerNames,
    deaths: row.deaths,
    serverRegion: row.serverRegion,
    serverIdentifier: row.serverIdentifier,
    favorite: !!row.favorite,
  };
}

function sortMetaNewest(list: ArchiveMeta[]): void {
  list.sort((a, b) => b.startedAt - a.startedAt);
}

export function listArchiveMeta(): ArchiveMeta[] {
  return meta.slice();
}

/**
 * Drop oldest RAM past fights down to `cap`. Never drops camera-pinned ids,
 * protected instance fights, or retention favorites (may leave past.length > cap).
 */
export function trimRamPast(
  past: CombatSegment[],
  cap: number,
  protectMapIn: string,
  keepIds?: Record<string, boolean>,
): CombatSegment[] {
  if (past.length <= cap) return past;
  const out: CombatSegment[] = [];
  let dropped = past.length - cap;
  for (let i = past.length - 1; i >= 0; i--) {
    const seg = past[i];
    const keep =
      !!seg.favorite ||
      !!(keepIds && keepIds[seg.id]) ||
      isProtectedInstance(seg.map, seg.mapIn, protectMapIn);
    if (!keep && dropped > 0) {
      dropped -= 1;
      continue;
    }
    out.push(seg);
  }
  out.reverse();
  return out;
}

/**
 * Delete the oldest non-favorite, non-protected segment.
 * Returns false when nothing is eligible (favorites/protected may exceed cap).
 */
async function evictOldest(
  db: IDBDatabase,
  protectMapIn: string,
): Promise<boolean> {
  const tx = db.transaction(STORE_SEGMENTS, "readwrite");
  const store = tx.objectStore(STORE_SEGMENTS);
  const idx = store.index("startedAt");
  const rows = (await reqToPromise(idx.getAll())) as SegmentRow[];
  sortMetaNewest(rows);
  let victim: SegmentRow | null = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.favorite) continue;
    if (isProtectedInstance(row.map, row.mapIn, protectMapIn)) {
      continue;
    }
    victim = row;
    break;
  }
  if (!victim) {
    commitTx(tx);
    return false;
  }
  await reqToPromise(store.delete(victim.id));
  commitTx(tx);
  await txDone(tx);
  const next: ArchiveMeta[] = [];
  for (let i = 0; i < meta.length; i++) {
    if (meta[i].id !== victim.id) next.push(meta[i]);
  }
  meta = next;
  return true;
}

async function putWithQuota(
  db: IDBDatabase,
  row: SegmentRow,
  protectMapIn: string,
): Promise<void> {
  let tries = 0;
  while (tries < MAX_QUOTA_EVICT) {
    try {
      const tx = db.transaction(STORE_SEGMENTS, "readwrite");
      const store = tx.objectStore(STORE_SEGMENTS);
      store.put(row);
      commitTx(tx);
      await txDone(tx);
      return;
    } catch (err) {
      if (!isQuota(err)) throw err;
      const evicted = await evictOldest(db, protectMapIn);
      if (!evicted) throw err;
      tries += 1;
    }
  }
}

/**
 * Evict oldest non-favorites until at/under maxArchivedSegments.
 * If only favorites (and protected) remain above the cap, stop — keep them.
 */
async function trimArchiveStore(
  db: IDBDatabase,
  protectMapIn: string,
): Promise<void> {
  const cap = archiveCap();
  while (meta.length > cap) {
    const evicted = await evictOldest(db, protectMapIn);
    if (!evicted) break;
  }
}

/**
 * Toggle retention favorite on an archived (or sealing) fight.
 * Updates in-memory meta immediately; patches IndexedDB when the row exists.
 */
export function setArchiveFavorite(id: string, favorite: boolean): void {
  if (!id) return;
  const fav = !!favorite;
  const next: ArchiveMeta[] = [];
  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    if (m.id === id) next.push({ ...m, favorite: fav });
    else next.push(m);
  }
  meta = next;
  markMeterDirty();
  void persistFavoriteFlag(id, fav);
}

async function persistFavoriteFlag(
  id: string,
  favorite: boolean,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_SEGMENTS, "readwrite");
    const store = tx.objectStore(STORE_SEGMENTS);
    const row = (await reqToPromise(store.get(id))) as SegmentRow | undefined;
    if (!row) {
      commitTx(tx);
      return;
    }
    row.favorite = favorite;
    store.put(row);
    commitTx(tx);
    await txDone(tx);
  } catch {
    /* ignore */
  }
}

function upsertMeta(row: ArchiveMeta): void {
  const next: ArchiveMeta[] = [metaOf(row)];
  for (let i = 0; i < meta.length; i++) {
    if (meta[i].id !== row.id) next.push(meta[i]);
  }
  meta = next;
  sortMetaNewest(meta);
}

async function persistHint(): Promise<void> {
  try {
    const nav = navigator as Navigator & {
      storage?: { persist?: () => Promise<boolean> };
    };
    if (nav.storage && typeof nav.storage.persist === "function") {
      await nav.storage.persist();
    }
  } catch {
    /* Safari may refuse */
  }
}

async function rowToSegment(row: SegmentRow): Promise<CombatSegment> {
  const json = await gunzipUtf8(row.aggGzip, row.gzip);
  const agg = JSON.parse(json) as SegmentAgg;
  const seg = unpackTapes(agg, row.tapes);
  // Row flag is source of truth for retention (old rows / agg may omit it).
  seg.favorite = !!row.favorite || !!seg.favorite;
  return seg;
}

function ramHas(id: string): boolean {
  if (!hooks) return false;
  const ids = hooks.getPastIds();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === id) return true;
  }
  const live = hooks.getLive();
  return !!(live && live.id === id);
}

export function requestHydrate(id: string): void {
  if (!id || ramHas(id) || hydrating[id]) return;
  hydrating[id] = true;
  void (async () => {
    try {
      const db = await openDb();
      if (!db) return;
      const tx = db.transaction(STORE_SEGMENTS, "readonly");
      const row = (await reqToPromise(
        tx.objectStore(STORE_SEGMENTS).get(id),
      )) as SegmentRow | undefined;
      if (!row) return;
      const seg = await rowToSegment(row);
      if (hooks && !ramHas(id)) hooks.adoptPast([seg]);
      markMeterDirty();
    } catch {
      /* ignore */
    } finally {
      delete hydrating[id];
    }
  })();
}

export function ensureHydrated(match: (m: ArchiveMeta) => boolean): void {
  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    if (match(m)) requestHydrate(m.id);
  }
}

export async function sealSegment(seg: CombatSegment): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const packed = packSegment(seg);
  const json = JSON.stringify(packed.agg);
  const gz = await gzipUtf8(json);
  let favorite = !!seg.favorite;
  for (let i = 0; i < meta.length; i++) {
    if (meta[i].id === seg.id && meta[i].favorite) {
      favorite = true;
      break;
    }
  }
  const row: SegmentRow = {
    id: seg.id,
    startedAt: seg.startedAt,
    map: seg.map || "",
    mapIn: seg.mapIn || "",
    event: seg.event,
    label: seg.label,
    outcome: seg.outcome,
    kind: seg.kind,
    endedAt: seg.endedAt,
    observingName: seg.observingName,
    playerNames: playerNamesFromSegment(seg),
    deaths: seg.deaths.length,
    serverRegion: seg.serverRegion,
    serverIdentifier: seg.serverIdentifier,
    favorite,
    aggGzip: gz.buf,
    tapes: packed.tapes,
    gzip: gz.gzip,
  };
  const protect = hooks ? hooks.protectMapIn() : "";
  await putWithQuota(db, row, protect);
  upsertMeta(row);
  await trimArchiveStore(db, protect);
  await clearDraft();
}

function scheduleDraft(): void {
  if (draftTimer) return;
  draftTimer = setTimeout(() => {
    draftTimer = null;
    if (draftDirty) void flushDraft();
  }, DRAFT_MS);
}

export function noteLive(seg: CombatSegment | null): void {
  if (!seg || !started) return;
  draftDirty = true;
  scheduleDraft();
}

async function flushDraft(): Promise<void> {
  draftDirty = false;
  const live = hooks ? hooks.getLive() : null;
  const db = await openDb();
  if (!db) return;
  if (!live) {
    await clearDraft();
    return;
  }
  const packed = packSegment(live);
  const row: DraftRow = {
    id: live.id,
    startedAt: live.startedAt,
    map: live.map,
    mapIn: live.mapIn,
    event: live.event,
    agg: packed.agg,
    tapes: packed.tapes,
  };
  try {
    const tx = db.transaction(STORE_DRAFT, "readwrite");
    await reqToPromise(tx.objectStore(STORE_DRAFT).put(row, DRAFT_KEY));
    commitTx(tx);
  } catch {
    /* quota: sealed rows matter more */
  }
}

export async function clearDraft(): Promise<void> {
  draftDirty = false;
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_DRAFT, "readwrite");
    await reqToPromise(tx.objectStore(STORE_DRAFT).delete(DRAFT_KEY));
    commitTx(tx);
  } catch {
    /* ignore */
  }
}

function onHidden(): void {
  if (document.visibilityState === "hidden") void flushDraft();
}

function onFreeze(): void {
  void flushDraft();
}

async function boot(): Promise<void> {
  await persistHint();
  const db = await openDb();
  if (!db || !hooks) return;
  const tx = db.transaction([STORE_SEGMENTS, STORE_DRAFT], "readonly");
  const rows = ((await reqToPromise(
    tx.objectStore(STORE_SEGMENTS).getAll(),
  )) || []) as SegmentRow[];
  const draft = (await reqToPromise(
    tx.objectStore(STORE_DRAFT).get(DRAFT_KEY),
  )) as DraftRow | undefined;
  sortMetaNewest(rows);
  meta = [];
  for (let i = 0; i < rows.length; i++) meta.push(metaOf(rows[i]));
  await trimArchiveStore(db, hooks.protectMapIn());
  const protect = hooks.protectMapIn();
  const cap = ramCap();
  const load: SegmentRow[] = [];
  const seen: Record<string, boolean> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prot = isProtectedInstance(row.map, row.mapIn, protect);
    const fav = !!row.favorite;
    // Favorites + protected always hydrate; others fill remaining RAM slots.
    if (prot || fav || load.length < cap) {
      if (!seen[row.id]) {
        seen[row.id] = true;
        load.push(row);
      }
    }
  }
  const segs: CombatSegment[] = [];
  for (let i = 0; i < load.length; i++) {
    try {
      segs.push(await rowToSegment(load[i]));
    } catch {
      /* skip corrupt */
    }
  }
  if (segs.length) hooks.adoptPast(segs);
  if (draft && draft.agg && !hooks.getLive()) {
    try {
      const liveSeg = unpackTapes(draft.agg, draft.tapes);
      hooks.adoptLive(liveSeg);
    } catch {
      /* skip */
    }
  }
  markMeterDirty();
}

export function startArchive(next: ArchiveHooks): () => void {
  hooks = next;
  started = true;
  void boot();
  document.addEventListener("visibilitychange", onHidden);
  document.addEventListener("freeze", onFreeze as EventListener);
  unsubLife = () => {
    document.removeEventListener("visibilitychange", onHidden);
    document.removeEventListener("freeze", onFreeze as EventListener);
  };
  return () => {
    started = false;
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }
    if (unsubLife) unsubLife();
    unsubLife = null;
    void flushDraft();
    hooks = null;
  };
}
