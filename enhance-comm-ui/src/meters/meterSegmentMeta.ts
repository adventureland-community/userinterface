/**
 * Segment labels, hover copy, and wipe/kill outcome (Details red/green).
 * Never put instance `in` (`mapIn`) in UI — screenshots would leak join ids.
 */

import { formatRelativeAge } from "../lib/format";
import { eventDisplayName, mapDisplayName } from "./meterRun";
import type { ActorAgg, CombatSegment } from "./meterTypes";

export type SegmentOutcome = "kill" | "wipe" | "timeout";

/** Fields used for picker titles / hover. No mapIn. */
export type FightLabelSource = {
  startedAt: number;
  endedAt?: number;
  map?: string;
  event?: string;
  kind?: CombatSegment["kind"];
  observingName?: string;
  outcome?: CombatSegment["outcome"];
  deaths?: number;
  playerNames?: string[];
  serverRegion?: string;
  serverIdentifier?: string;
  /** Retention favorite — not a camera pin. */
  favorite?: boolean;
};

const MAX_TIP_NAMES = 12;

function isPlayerActor(a: ActorAgg): boolean {
  if (a.ctype) return true;
  if (!a.id || /^\d+$/.test(a.id)) return false;
  return true;
}

export function playerNamesFromSegment(seg: CombatSegment): string[] {
  const ids = Object.keys(seg.actors);
  const players: ActorAgg[] = [];
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (isPlayerActor(a)) players.push(a);
  }
  players.sort((a, b) => b.damage - a.damage);
  const names: string[] = [];
  for (let i = 0; i < players.length; i++) {
    names.push(players[i].name || players[i].id);
  }
  return names;
}

export function sourceFromSegment(seg: CombatSegment): FightLabelSource {
  return {
    startedAt: seg.startedAt,
    endedAt: seg.endedAt,
    map: seg.map,
    event: seg.event,
    kind: seg.kind,
    observingName: seg.observingName,
    outcome: seg.outcome,
    deaths: seg.deaths.length,
    playerNames: playerNamesFromSegment(seg),
    serverRegion: seg.serverRegion,
    serverIdentifier: seg.serverIdentifier,
    favorite: !!seg.favorite,
  };
}

/** Archive row / picker meta. Never copy `mapIn` onto the label source. */
export function sourceFromMeta(m: FightLabelSource): FightLabelSource {
  return {
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    map: m.map,
    event: m.event,
    kind: m.kind,
    observingName: m.observingName,
    outcome: m.outcome,
    deaths: m.deaths,
    playerNames: m.playerNames,
    serverRegion: m.serverRegion,
    serverIdentifier: m.serverIdentifier,
    favorite: !!m.favorite,
  };
}

export function formatSpan(startedAt: number, endedAt?: number): string {
  const end = endedAt || Date.now();
  const sec = Math.max((end - startedAt) / 1000, 1);
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec)}s`;
}

export function formatSegmentDuration(seg: CombatSegment): string {
  return formatSpan(seg.startedAt, seg.endedAt);
}

export function formatRelativeAgo(at: number, now = Date.now()): string {
  return formatRelativeAge(at, now);
}

function formatClock(at: number): string {
  const d = new Date(at);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function whereLabel(src: FightLabelSource): string {
  if (src.event) return eventDisplayName(src.event);
  if (src.map) return mapDisplayName(src.map);
  return "Fight";
}

function kindBit(src: FightLabelSource): string {
  if (src.kind === "boss") return "boss";
  if (src.kind === "pull") return "pull";
  return "";
}

/** AL-style server bit: `EU I` (region + identifier). Empty if unknown. */
export function serverLabel(src: {
  serverRegion?: string;
  serverIdentifier?: string;
}): string {
  const region = src.serverRegion || "";
  const ident = src.serverIdentifier || "";
  return [region, ident].filter(Boolean).join(" ").trim();
}

/**
 * Disambiguate run-overall picker rows: `The Crypt overall · EU I · 8m ago`
 * (or `· live` while the camera is still in that instance).
 */
export function runOverallPickerTitle(
  baseTitle: string,
  src: {
    serverRegion?: string;
    serverIdentifier?: string;
    startedAt?: number;
    endedAt?: number;
  },
  now = Date.now(),
): string {
  const parts: string[] = [baseTitle];
  const server = serverLabel(src);
  if (server) parts.push(server);
  if (!src.endedAt && src.startedAt) {
    parts.push("live");
  } else if (src.endedAt || src.startedAt) {
    const at = src.endedAt || src.startedAt!;
    parts.push(formatRelativeAgo(at, now));
  }
  return parts.join(" · ");
}

/**
 * When the fight happened, for picker rows.
 * Recent sealed fights: relative from end (`5m ago`). Older: clock.
 * Missing end time: clock from start (old archive rows).
 */
function pickerWhenBit(src: FightLabelSource, now: number): string {
  if (!src.startedAt) return "";
  if (!src.endedAt) return formatClock(src.startedAt);
  const sec = Math.max(0, Math.round((now - src.endedAt) / 1000));
  if (sec < 3600) return formatRelativeAgo(src.endedAt, now);
  return formatClock(src.startedAt);
}

/** Header/chip: `The Crypt · pull` — chrome already appends duration. No server (keep short). */
export function fightChipTitle(src: FightLabelSource): string {
  const parts: string[] = [whereLabel(src)];
  const kind = kindBit(src);
  if (kind) parts.push(kind);
  return parts.join(" · ");
}

/** Picker row: `The Crypt · pull · EU I · 13s · 5m ago` — no Fight #, no instance id. */
export function fightPickerTitle(
  src: FightLabelSource,
  now = Date.now(),
): string {
  const parts: string[] = [fightChipTitle(src)];
  const server = serverLabel(src);
  if (server) parts.push(server);
  if (src.startedAt) {
    parts.push(formatSpan(src.startedAt, src.endedAt));
    const when = pickerWhenBit(src, now);
    if (when) parts.push(when);
  }
  return parts.join(" · ");
}

function joinNames(names: string[]): string {
  if (names.length <= MAX_TIP_NAMES) return names.join(", ");
  const shown = names.slice(0, MAX_TIP_NAMES);
  return `${shown.join(", ")} +${names.length - MAX_TIP_NAMES}`;
}

/**
 * Hover details. Instance `in` is omitted on purpose (joinable from a screenshot).
 */
export function fightHoverTip(src: FightLabelSource, now = Date.now()): string {
  const lines: string[] = [];
  const where = whereLabel(src);
  const mapName = src.map ? mapDisplayName(src.map) : "";
  if (src.event && mapName && mapName !== where) {
    lines.push(`${where} · ${mapName}`);
  } else {
    lines.push(where);
  }
  const kind = kindBit(src);
  if (kind) lines[0] += ` · ${kind}`;

  const bits: string[] = [];
  if (src.startedAt) {
    bits.push(`lasted ${formatSpan(src.startedAt, src.endedAt)}`);
  }
  const agoAt = src.endedAt || src.startedAt;
  if (agoAt) bits.push(formatRelativeAgo(agoAt, now));
  const clock = src.startedAt ? formatClock(src.startedAt) : "";
  if (clock) bits.push(clock);
  if (bits.length) lines.push(bits.join(" · "));

  const names = src.playerNames || [];
  if (names.length) {
    const n = names.length;
    lines.push(`${n} player${n === 1 ? "" : "s"}: ${joinNames(names)}`);
  }
  if (src.observingName) lines.push(`Watching ${src.observingName}`);
  if (src.outcome === "wipe") lines.push("Wipe");
  else if (src.outcome === "kill") lines.push("Kill");
  if (src.deaths && src.deaths > 0) {
    lines.push(
      `${src.deaths} death${src.deaths === 1 ? "" : "s"}`,
    );
  }
  const server = serverLabel(src);
  if (server) lines.push(server);
  if (src.favorite) lines.push("Favorited — kept when archive cleans up");
  return lines.join("\n");
}

export function autoSegmentLabel(seg: CombatSegment, _seq?: number): string {
  return fightPickerTitle(sourceFromSegment(seg));
}

/** Wipe if every tracked player actor died in this segment. */
export function inferSegmentOutcome(
  seg: CombatSegment,
  partyActorIds: string[],
): SegmentOutcome {
  if (seg.outcome) return seg.outcome;
  if (!partyActorIds.length) return "timeout";
  let dead = 0;
  for (let i = 0; i < partyActorIds.length; i++) {
    const id = partyActorIds[i];
    let wasDead = false;
    for (let d = 0; d < seg.deaths.length; d++) {
      if (seg.deaths[d].id === id) {
        wasDead = true;
        break;
      }
    }
    if (wasDead) dead += 1;
  }
  if (dead >= partyActorIds.length && dead > 0) return "wipe";
  if (seg.deaths.length === 0 && seg.endedAt) return "kill";
  return seg.deaths.length > 0 ? "wipe" : "kill";
}

export function segmentOutcomeClass(outcome?: SegmentOutcome): string {
  if (outcome === "wipe") return "ecu-seg-wipe";
  if (outcome === "kill") return "ecu-seg-kill";
  return "";
}
