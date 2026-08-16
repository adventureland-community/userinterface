/**
 * Camera session: live/past RAM, keep-or-close, idle, archive wiring.
 * meterEngine stays the hub subscriber.
 */

import {
  getCurrentIn,
  getCurrentMap,
  getObserving,
  getObservingId,
  getServerIdentifier,
  getServerRegion,
  resolvePlayerCtype,
} from "../host/al";
import type { EntityLike } from "../host/globals";
import { getMeterAppearance } from "./meterAppearance";
import {
  clearDraft,
  ensureHydrated,
  noteLive,
  requestHydrate,
  sealSegment,
  setArchiveFavorite,
  startArchive,
  trimRamPast,
} from "./meterArchive";
import {
  eventOnMap,
  isInstanceMap,
  suppressIdleBreak,
} from "./meterRun";
import { buildSegmentChoices, partsForRun } from "./meterSegmentCatalog";
import {
  decideSegmentBoundary,
  type MeterCamera,
} from "./meterSegmentBoundary";
import { autoSegmentLabel, inferSegmentOutcome } from "./meterSegmentMeta";
import type { SegmentChoice } from "./meterSegmentRef";
import {
  emptySegment,
  isSegmentEmpty,
  mergeSegments,
} from "./sessionSegment";
import type { CombatSegment, SegmentCloseReason, SegmentRef } from "./meterTypes";
import { markMeterDirty } from "./meterUiTick";

const HISTORY_MS = 5_000;
const MAX_HISTORY = 60;

export type HistoryPoint = {
  at: number;
  values: Record<string, number>;
};

type SessionLiveClosed = () => void;

let live: CombatSegment | null = null;
let past: CombatSegment[] = [];
let history: HistoryPoint[] = [];
let lastHistoryAt = 0;
let lastCombatAt = 0;
let inCombat = false;
let segSeq = 0;
let lastCamera: MeterCamera | null = null;
let pendingBossKind = false;
let onLiveClosed: SessionLiveClosed | null = null;
/** Past fights the UI is looking at — never LRU-evict on a camera hop. */
let pinnedPastIds: Record<string, boolean> = {};

export function soloKey(id: string, name?: string): string {
  return `solo:${name || id}`;
}

export function partyKeyFor(ent: EntityLike | undefined, id: string): string {
  if (!ent) return soloKey(id);
  if (ent.party) return ent.party;
  return soloKey(id, ent.name);
}

function combatBreakMs(): number {
  return getMeterAppearance().combatBreakSec * 1000;
}

function maxPastCap(): number {
  return getMeterAppearance().maxPastSegments;
}

function protectMapIn(): string {
  if (!lastCamera || !isInstanceMap(lastCamera.map) || !lastCamera.mapIn) {
    return "";
  }
  return lastCamera.mapIn;
}

function insertPast(seg: CombatSegment): void {
  for (let i = 0; i < past.length; i++) {
    if (past[i].id === seg.id) return;
  }
  let i = 0;
  while (i < past.length && past[i].startedAt >= seg.startedAt) i += 1;
  past.splice(i, 0, seg);
  past = trimRamPast(past, maxPastCap(), protectMapIn(), pinnedPastIds);
}

function readCamera(): MeterCamera {
  const observing = getObserving();
  const observingId = getObservingId();
  const id = observingId ? String(observingId) : "";
  const map = getCurrentMap() || "";
  const mapIn = getCurrentIn() || "";
  return {
    observingId: id,
    map,
    mapIn,
    event: eventOnMap(map, live?.event),
    serverRegion: getServerRegion() || "",
    serverIdentifier: getServerIdentifier() || "",
    partyKey: observing
      ? partyKeyFor(observing, id || String(observing.id || ""))
      : "",
    observingName: observing?.name || "",
    observingCtype: observing
      ? resolvePlayerCtype(id, observing) || observing.ctype || ""
      : "",
  };
}

function stampCamera(seg: CombatSegment, cam: MeterCamera): void {
  seg.observingId = cam.observingId || undefined;
  seg.observingName = cam.observingName || undefined;
  seg.observingCtype = cam.observingCtype || undefined;
  seg.map = cam.map || undefined;
  seg.mapIn = cam.mapIn || undefined;
  seg.event = cam.event;
  seg.serverRegion = cam.serverRegion || undefined;
  seg.serverIdentifier = cam.serverIdentifier || undefined;
  seg.partyKey = cam.partyKey || undefined;
}

function hydrateForCamera(prev: MeterCamera | null, next: MeterCamera): void {
  if (next.mapIn && next.mapIn !== prev?.mapIn && isInstanceMap(next.map)) {
    ensureHydrated((m) => m.mapIn === next.mapIn);
  }
  if (next.event && next.event !== prev?.event) {
    ensureHydrated((m) => m.event === next.event);
  }
}

function applyBoundary(now: number, hitMtype?: string): void {
  const prev = lastCamera;
  const next = readCamera();
  const decision = decideSegmentBoundary({
    prev,
    next,
    live,
    hitMtype,
  });
  lastCamera = next;
  hydrateForCamera(prev, next);
  if (decision.action === "close") {
    endLive(now, decision.reason);
    if (decision.wipeSessionOverall) clearRollingHistory();
    return;
  }
  if (live) stampCamera(live, next);
}

function clearRollingHistory(): void {
  history = [];
  lastHistoryAt = 0;
  markMeterDirty();
}

function pinPastId(id: string): void {
  if (!id) return;
  pinnedPastIds[id] = true;
}

/**
 * Retention favorite — survives archive/RAM cleanup. Not a camera resolve pin.
 */
export function setSegmentFavorite(id: string, favorite: boolean): void {
  if (!id) return;
  const fav = !!favorite;
  for (let i = 0; i < past.length; i++) {
    if (past[i].id === id) {
      past[i].favorite = fav;
      break;
    }
  }
  setArchiveFavorite(id, fav);
}

function nextSegId(): string {
  segSeq += 1;
  return `fight-${segSeq}-${Date.now()}`;
}

function partyActorIds(seg: CombatSegment): string[] {
  const ids: string[] = [];
  const keys = Object.keys(seg.actors);
  for (let i = 0; i < keys.length; i++) {
    const a = seg.actors[keys[i]];
    if (a.ctype || a.partyKey) ids.push(keys[i]);
  }
  return ids;
}

export function ensureLive(now: number): CombatSegment {
  if (!live) {
    if (!lastCamera) lastCamera = readCamera();
    live = emptySegment(nextSegId(), now);
    inCombat = true;
    stampCamera(live, lastCamera);
    if (live.map === "crypt") {
      live.kind = pendingBossKind ? "boss" : "pull";
    }
    pendingBossKind = false;
  }
  return live;
}

function endLive(now: number, reason?: SegmentCloseReason): void {
  if (!live) return;
  live.endedAt = now;
  if (reason) live.closeReason = reason;
  if (reason === "boss_start") pendingBossKind = true;
  live.seq = segSeq;
  live.outcome = inferSegmentOutcome(live, partyActorIds(live));
  live.label = autoSegmentLabel(live, segSeq);
  const sealed = live;
  if (!isSegmentEmpty(sealed)) {
    insertPast(sealed);
    void sealSegment(sealed);
  } else {
    void clearDraft();
  }
  live = null;
  inCombat = false;
  if (onLiveClosed) onLiveClosed();
  markMeterDirty();
}

function idleDue(now: number): boolean {
  if (!inCombat || !lastCombatAt) return false;
  if (now - lastCombatAt <= combatBreakMs()) return false;
  const cam = lastCamera;
  if (cam && suppressIdleBreak(cam.map, cam.event)) return false;
  return true;
}

/**
 * Apply camera close + idle, then optionally open/keep live combat.
 * Packets and the tick share this one step.
 */
export function syncSession(
  now: number,
  hitMtype?: string,
  combat?: boolean,
): CombatSegment | null {
  applyBoundary(now, hitMtype);
  if (idleDue(now)) endLive(now, "idle");
  if (combat) {
    lastCombatAt = now;
    return ensureLive(now);
  }
  return live;
}

export function sampleHistory(now: number): void {
  if (now - lastHistoryAt < HISTORY_MS) return;
  lastHistoryAt = now;
  const seg = live;
  if (!seg || !seg.startedAt) return;
  const elapsed = Math.max(now - seg.startedAt, 1000);
  const values: Record<string, number> = {};
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    values[a.id] = (a.damage * 1000) / elapsed;
  }
  history.push({ at: now, values });
  while (history.length > MAX_HISTORY) history.shift();
}

export function noteLiveDraft(): void {
  if (live) noteLive(live);
}

export function resolveSegment(
  ref: SegmentRef | undefined,
): CombatSegment | null {
  const r = ref || "current";
  if (r === "total") {
    const parts = partsForRun("total", live, past);
    if (!parts.length) return null;
    return mergeSegments("total", parts, Date.now());
  }
  if (r === "current") {
    if (inCombat && live) return live;
    if (past.length) return past[0];
    return live;
  }
  if ("pastId" in r) {
    pinPastId(r.pastId);
    for (let i = 0; i < past.length; i++) {
      if (past[i].id === r.pastId) return past[i];
    }
    requestHydrate(r.pastId);
    return null;
  }
  if ("mapIn" in r) {
    ensureHydrated((m) => m.mapIn === r.mapIn);
    const parts = partsForRun(r, live, past);
    if (!parts.length) return null;
    return mergeSegments(`run-in-${r.mapIn}`, parts, Date.now());
  }
  if ("event" in r) {
    ensureHydrated((m) => m.event === r.event);
    const parts = partsForRun(r, live, past);
    if (!parts.length) return null;
    return mergeSegments(`run-ev-${r.event}`, parts, Date.now());
  }
  const _never: never = r;
  return _never;
}

export function listSegmentChoices(): SegmentChoice[] {
  return buildSegmentChoices({ live, past, camera: lastCamera });
}

export function listPastSegments(): CombatSegment[] {
  return past.slice();
}

export function getLiveSegment(): CombatSegment | null {
  return live;
}

export function isMeterInCombat(): boolean {
  return inCombat;
}

/** True when `seg` is the in-combat live pull (not last-fight Current / archive). */
export function isLiveCombatSegment(seg: CombatSegment): boolean {
  return inCombat && !!live && live.id === seg.id;
}

export function getHistoryPoints(): HistoryPoint[] {
  return history;
}

export function resetSessionAll(): void {
  live = null;
  past = [];
  history = [];
  lastHistoryAt = 0;
  lastCombatAt = 0;
  inCombat = false;
  lastCamera = null;
  pendingBossKind = false;
  pinnedPastIds = {};
}

export function resetSessionCurrent(): void {
  live = null;
  lastCombatAt = 0;
  inCombat = false;
  pendingBossKind = false;
  void clearDraft();
  // Same tape/gear teardown as endLive — keep cast-watch warm.
  if (onLiveClosed) onLiveClosed();
}

export function resetSessionOverall(): void {
  past = [];
  history = [];
  lastHistoryAt = 0;
}

export function startSession(hooks?: { onLiveClosed?: SessionLiveClosed }): () => void {
  onLiveClosed = hooks?.onLiveClosed || null;
  return startArchive({
    getLive: () => live,
    getPastIds: () => {
      const ids: string[] = [];
      for (let i = 0; i < past.length; i++) ids.push(past[i].id);
      return ids;
    },
    adoptPast: (segs) => {
      for (let i = 0; i < segs.length; i++) insertPast(segs[i]);
    },
    adoptLive: (seg) => {
      if (live) return;
      live = seg;
      inCombat = !seg.endedAt;
      lastCombatAt = Date.now();
    },
    protectMapIn,
  });
}
