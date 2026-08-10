/**
 * Session party combat aggregator (channels, history, bar rows).
 *
 * Damage ownership: this module owns the Combat panel metrics.
 * Hit DPS (10s) uses combatMeter.ts instead — see that file's header.
 * RankMeter is presentational; strategy panels (PDPS/coop) are separate.
 */
import { getEntitiesRecord, getObserving, getObservingId } from "../host/al";
import type { EntityLike } from "../host/globals";
import { onDamage, type DamageEvent } from "../sockets/hub";
import type { PartyScope } from "../lib/settings";
import type { RankRow } from "./RankMeter";
import {
  COMBAT_CHANNELS,
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  type CombatChannel,
} from "./combatChannels";

export type { CombatChannel };
export { COMBAT_CHANNELS, CHANNEL_COLORS, CHANNEL_LABELS };

/** Idle this long → new combat segment (shared timer, no late-joiner inflation). */
const COMBAT_BREAK_MS = 12_000;
const HISTORY_MS = 5_000;
const MAX_HISTORY = 60;

type PlayerSums = {
  dealt: number;
  base: number;
  blast: number;
  burn: number;
  cleave: number;
  heal: number;
  mana: number;
  dr: number;
  /** Announce-only; excluded from DPS (landed reflect is in dealt). */
  reflect: number;
  name: string;
  ctype?: string;
  partyKey: string;
};

type VitalsShadow = {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
};

export type CombatPlayerRow = {
  id: string;
  name: string;
  ctype?: string;
  partyKey: string;
  rates: Record<CombatChannel, number>;
};

export type HistoryPoint = {
  at: number;
  /** partyKey -> channel -> rate */
  parties: Record<string, Partial<Record<CombatChannel, number>>>;
};

const players: Record<string, PlayerSums> = {};
const vitalsShadow: Record<string, VitalsShadow> = {};
const history: HistoryPoint[] = [];
let lastHistoryAt = 0;
let sessionStartedAt = 0;
let lastCombatAt = 0;
let unsub: (() => void) | null = null;
let playerMeta: Record<
  string,
  { name: string; ctype?: string; partyKey: string }
> = {};
let watchedPartyIds = new Set<string>();
let watchedPartyKey = "";
/** Player ids currently present in the comm entity snapshot (vision range). */
let visiblePlayerIds = new Set<string>();

function soloKey(id: string, name?: string): string {
  return `solo:${name || id}`;
}

function partyKeyFor(ent: EntityLike | undefined, id: string): string {
  if (!ent) return soloKey(id);
  if (ent.party) return ent.party;
  return soloKey(id, ent.name);
}

/** Shared session clock — same denominator for every player. */
function rate(sum: number, now: number): number {
  if (!sessionStartedAt) return 0;
  const elapsed = Math.max(now - sessionStartedAt, 1_000);
  return (sum * 1000) / elapsed;
}

function channelRate(p: PlayerSums, ch: CombatChannel, now: number): number {
  switch (ch) {
    case "dps":
      // Pure dealt damage. DR / RF are separate channels (not folded in).
      return rate(p.dealt, now);
    case "base":
      return rate(p.base, now);
    case "blast":
      return rate(p.blast, now);
    case "burn":
      return rate(p.burn, now);
    case "cleave":
      return rate(p.cleave, now);
    case "hps":
      return rate(p.heal, now);
    case "mps":
      return rate(p.mana, now);
    case "dr":
      return rate(p.dr, now);
    case "reflect":
      return rate(p.reflect, now);
    default: {
      const _exhaustive: never = ch;
      return _exhaustive;
    }
  }
}

function ensurePlayer(id: string): PlayerSums {
  let p = players[id];
  if (!p) {
    const meta = playerMeta[id];
    p = {
      dealt: 0,
      base: 0,
      blast: 0,
      burn: 0,
      cleave: 0,
      heal: 0,
      mana: 0,
      dr: 0,
      reflect: 0,
      name: meta?.name || id,
      ctype: meta?.ctype,
      partyKey: meta?.partyKey || soloKey(id),
    };
    players[id] = p;
  }
  return p;
}

function isPlayerId(id: string | undefined): boolean {
  if (!id) return false;
  if (playerMeta[id]) return true;
  const ent = getEntitiesRecord()[id];
  if (ent) {
    return !!(ent.player || ent.type === "character");
  }
  // Off-screen / not yet cached: player ids are names; monster ids are numeric.
  return !/^\d+$/.test(id);
}

function syncShadowFromEntity(id: string, ent: EntityLike | undefined): void {
  if (!ent) return;
  const maxHp = ent.max_hp || 0;
  const maxMp = ent.max_mp || 0;
  if (!(maxHp > 0) && !(maxMp > 0)) return;
  vitalsShadow[id] = {
    hp: ent.hp != null ? ent.hp : maxHp,
    maxHp,
    mp: ent.mp != null ? ent.mp : maxMp,
    maxMp,
  };
}

function ensureShadow(id: string): VitalsShadow | null {
  let s = vitalsShadow[id];
  if (s) return s;
  const ent = getEntitiesRecord()[id];
  if (!ent) return null;
  syncShadowFromEntity(id, ent);
  return vitalsShadow[id] || null;
}

/**
 * Clamp heal/resource gain against the best pre-event vitals estimate, then advance shadow.
 * Uses min(live, shadow) so a post-hit entity sync cannot zero effective heal (Crown bug).
 */
function effectiveGain(
  id: string,
  amount: number,
  kind: "hp" | "mp",
): number {
  if (!(amount > 0)) return 0;
  const live = getEntitiesRecord()[id];
  const s = ensureShadow(id);
  if (kind === "hp") {
    const maxHp = (s && s.maxHp) || live?.max_hp || 0;
    if (!(maxHp > 0)) return amount;
    const liveHp = live?.hp;
    const shadowHp = s ? s.hp : undefined;
    let hp: number;
    if (liveHp != null && shadowHp != null) hp = Math.min(liveHp, shadowHp);
    else if (shadowHp != null) hp = shadowHp;
    else if (liveHp != null) hp = liveHp;
    else return amount;
    const missing = Math.max(0, maxHp - hp);
    const gained = Math.min(amount, missing);
    const next = Math.min(maxHp, hp + gained);
    if (s) {
      s.hp = next;
      s.maxHp = maxHp;
    } else {
      vitalsShadow[id] = {
        hp: next,
        maxHp,
        mp: live?.mp || 0,
        maxMp: live?.max_mp || 0,
      };
    }
    return gained;
  }
  const maxMp = (s && s.maxMp) || live?.max_mp || 0;
  if (!(maxMp > 0)) return amount;
  const liveMp = live?.mp;
  const shadowMp = s ? s.mp : undefined;
  let mp: number;
  if (liveMp != null && shadowMp != null) mp = Math.min(liveMp, shadowMp);
  else if (shadowMp != null) mp = shadowMp;
  else if (liveMp != null) mp = liveMp;
  else return amount;
  const missing = Math.max(0, maxMp - mp);
  const gained = Math.min(amount, missing);
  const next = Math.min(maxMp, mp + gained);
  if (s) {
    s.mp = next;
    s.maxMp = maxMp;
  } else {
    vitalsShadow[id] = {
      hp: live?.hp || 0,
      maxHp: live?.max_hp || 0,
      mp: next,
      maxMp,
    };
  }
  return gained;
}

function applyDamageToShadow(id: string, damage: number): void {
  if (!(damage > 0)) return;
  const s = ensureShadow(id);
  if (!s || !(s.maxHp > 0)) return;
  s.hp = Math.max(0, s.hp - damage);
}

function noteCombatActivity(now: number): void {
  if (
    sessionStartedAt &&
    lastCombatAt &&
    now - lastCombatAt > COMBAT_BREAK_MS
  ) {
    resetPartyCombat();
  }
  lastCombatAt = now;
  if (!sessionStartedAt) sessionStartedAt = now;
}

function onEvent(ev: DamageEvent): void {
  const now = ev.at;
  const actorIsPlayer = isPlayerId(ev.actor);
  const targetIsPlayer = isPlayerId(ev.target);

  const hasCombatSignal =
    !!(ev.damage && ev.damage > 0) ||
    !!(ev.heal && ev.heal > 0) ||
    !!(ev.lifesteal && ev.lifesteal > 0) ||
    !!(ev.manasteal && ev.manasteal > 0) ||
    !!(ev.dreturn && ev.dreturn > 0) ||
    !!(ev.reflect && ev.reflect > 0);

  if (!hasCombatSignal) return;

  // Only party-relevant activity extends/resets the session clock
  const relevant =
    (actorIsPlayer && !!ev.actor) ||
    (targetIsPlayer && (!!ev.dreturn || !!ev.reflect));
  if (relevant) noteCombatActivity(now);

  // DR / RF announce: credit the defending player when hit by a non-player
  if (ev.dreturn && targetIsPlayer && ev.target && !actorIsPlayer) {
    ensurePlayer(ev.target).dr += ev.dreturn;
  }
  if (ev.reflect && targetIsPlayer && ev.target && !actorIsPlayer) {
    ensurePlayer(ev.target).reflect += ev.reflect;
  }

  // Keep shadow HP in sync for players taking damage (pre-heal baseline).
  if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
    applyDamageToShadow(ev.target, ev.damage);
  }

  if (!ev.actor || !actorIsPlayer) return;
  const p = ensurePlayer(ev.actor);

  if (ev.heal && ev.heal > 0 && ev.target) {
    p.heal += effectiveGain(ev.target, ev.heal, "hp");
  }
  if (ev.lifesteal && ev.lifesteal > 0) {
    // Lifesteal packet is attempted amount; clamp against healer shadow HP.
    p.heal += effectiveGain(ev.actor, ev.lifesteal, "hp");
  }
  if (ev.manasteal && ev.manasteal > 0) {
    p.mana += effectiveGain(ev.actor, ev.manasteal, "mp");
  }

  if (ev.damage && ev.damage > 0) {
    p.dealt += ev.damage;
    if (ev.source === "burn") p.burn += ev.damage;
    else if (ev.splash) p.blast += ev.damage;
    else if (ev.source === "cleave") p.cleave += ev.damage;
    else p.base += ev.damage;
  }

  maybeSampleHistory(now);
}

function maybeSampleHistory(now: number): void {
  if (now - lastHistoryAt < HISTORY_MS) return;
  lastHistoryAt = now;
  const parties: HistoryPoint["parties"] = {};
  const ids = Object.keys(players);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = players[id];
    const key = p.partyKey;
    if (!parties[key]) parties[key] = {};
    const bucket = parties[key];
    for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
      const ch = COMBAT_CHANNELS[c];
      bucket[ch] = (bucket[ch] || 0) + channelRate(p, ch, now);
    }
  }
  history.push({ at: now, parties });
  while (history.length > MAX_HISTORY) history.shift();
}

/** Refresh names/party keys + vitals shadow from live entities; call each tick. */
export function updateCombatContext(entities: EntityLike[]): void {
  const observing = getObserving();
  const observingId = getObservingId();
  const nextMeta: typeof playerMeta = {};
  const nextWatched = new Set<string>();
  const now = Date.now();

  // Idle combat-break even with no new hits (UI timer / rates go quiet until next fight).
  if (
    sessionStartedAt &&
    lastCombatAt &&
    now - lastCombatAt > COMBAT_BREAK_MS
  ) {
    resetPartyCombat();
  }

  if (observingId && observing) {
    nextWatched.add(String(observingId));
    watchedPartyKey =
      observing.party || soloKey(String(observingId), observing.name);
    if (observing.party) {
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (ent.player && ent.party === observing.party) {
          nextWatched.add(String(ent.id));
        }
      }
    }
  } else {
    watchedPartyKey = "";
  }
  watchedPartyIds = nextWatched;

  const nextVisible = new Set<string>();
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent.player || !ent.id) continue;
    const id = String(ent.id);
    nextVisible.add(id);
    nextMeta[id] = {
      name: ent.name || id,
      ctype: ent.ctype,
      partyKey: partyKeyFor(ent, id),
    };
    syncShadowFromEntity(id, ent);
    if (players[id]) {
      players[id].name = nextMeta[id].name;
      players[id].ctype = nextMeta[id].ctype;
      players[id].partyKey = nextMeta[id].partyKey;
    }
  }
  visiblePlayerIds = nextVisible;
  playerMeta = nextMeta;
}

export function startPartyCombat(): () => void {
  if (!unsub) unsub = onDamage(onEvent);
  return () => {
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
}

export function resetPartyCombat(): void {
  const keys = Object.keys(players);
  for (let i = 0; i < keys.length; i++) delete players[keys[i]];
  history.length = 0;
  lastHistoryAt = 0;
  sessionStartedAt = 0;
  lastCombatAt = 0;
  // Keep vitalsShadow — still useful for the next fight's first heal clamp.
}

/** Player currently in the comm entity snapshot (Combat "Visible parties"). */
export function isVisiblePlayer(id: string): boolean {
  return visiblePlayerIds.has(id);
}

function includePlayer(id: string, scope: PartyScope): boolean {
  if (scope === "all") return true;
  if (scope === "visible") return isVisiblePlayer(id);
  if (!watchedPartyIds.size) return false;
  return watchedPartyIds.has(id);
}

export function listPartyKeys(scope: PartyScope): string[] {
  const set = new Set<string>();
  const ids = Object.keys(players);
  for (let i = 0; i < ids.length; i++) {
    if (!includePlayer(ids[i], scope)) continue;
    set.add(players[ids[i]].partyKey);
  }
  if (watchedPartyKey) set.add(watchedPartyKey);
  const out = Array.from(set);
  out.sort((a, b) => {
    if (a === watchedPartyKey) return -1;
    if (b === watchedPartyKey) return 1;
    return a.localeCompare(b);
  });
  return out;
}

export function getWatchedPartyKey(): string {
  return watchedPartyKey;
}

export function getCombatRows(
  scope: PartyScope,
  partyFilter?: string | null,
): CombatPlayerRow[] {
  const now = Date.now();
  const rows: CombatPlayerRow[] = [];
  const ids = Object.keys(players);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!includePlayer(id, scope)) continue;
    const p = players[id];
    if (partyFilter && p.partyKey !== partyFilter) continue;
    const rates = {} as Record<CombatChannel, number>;
    for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
      const ch = COMBAT_CHANNELS[c];
      rates[ch] = channelRate(p, ch, now);
    }
    rows.push({
      id,
      name: p.name,
      ctype: p.ctype,
      partyKey: p.partyKey,
      rates,
    });
  }
  rows.sort((a, b) => b.rates.dps - a.rates.dps);
  return rows;
}

export function buildCombatBarRows(
  scope: PartyScope,
  channel: CombatChannel,
  partyFilter?: string | null,
): RankRow[] {
  const rows = getCombatRows(scope, partyFilter);
  let max = 0;
  for (let i = 0; i < rows.length; i++) {
    max = Math.max(max, rows[i].rates[channel] || 0);
  }
  return rows
    .filter((r) => (r.rates[channel] || 0) > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      ctype: r.ctype,
      value: r.rates[channel] || 0,
      barMax: max || 1,
      label: Math.round(r.rates[channel] || 0).toLocaleString(),
    }));
}

export function getCombatHistory(): HistoryPoint[] {
  return history;
}

export function getCombatSessionStartedAt(): number {
  return sessionStartedAt;
}

export function getPartyTotals(
  scope: PartyScope,
  partyFilter?: string | null,
): Record<CombatChannel, number> {
  const rows = getCombatRows(scope, partyFilter);
  const out = {} as Record<CombatChannel, number>;
  for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
    out[COMBAT_CHANNELS[c]] = 0;
  }
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
      const ch = COMBAT_CHANNELS[c];
      out[ch] += rows[i].rates[ch] || 0;
    }
  }
  return out;
}
