/**
 * Forward ability CD rows for abilityTimeline panel.
 * Data: G.monsters[mtype].abilities + entity.s[id].ms (observer /comm).
 */

import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";
import { findEntity } from "../queries/entities";
import { formatDurationCompact, syncEndsAt } from "../lib/format";
import {
  DEFAULT_ABILITY_TIMELINE_PREFS,
  type AbilityTimelinePrefs,
  type AbilityTimelineScope,
} from "./abilityTimelinePrefs";

export type AbilityTimelineRow = {
  id: string;
  name: string;
  /** Live remaining ms (sticky-interpolated between sparse entity.s packets). */
  ms: number;
  cooldown: number;
  /** 0–1 remaining fraction of cooldown (1 = just fired / full CD). */
  frac: number;
  imminent: boolean;
  ready: boolean;
  /** Pinned in the static zone (remaining > windowMs on long CDs). */
  pinned: boolean;
  /**
   * Icon-scroll axis position: 0 = NOW edge, 1 = far start.
   */
  scrollPos: number;
  /**
   * Absolute fire time (sticky). 0 when ready.
   * Motion writes % from this once per castGen instead of Date.now()+ms.
   */
  endsAt: number;
  /**
   * Bumps when remaining jumps to a new CD so React remounts the marker.
   * Same DOM node must never travel backward along the rail.
   */
  castGen: number;
};

export type AbilityTimelineSection = {
  targetName: string;
  targetId: string;
  targetMtype?: string;
  rows: AbilityTimelineRow[];
};

/** One or more bosses — each section is a monster with trackable abilities. */
export type AbilityTimelinePanelModel = {
  sections: AbilityTimelineSection[];
};

/** @deprecated single-boss alias */
export type AbilityTimelineModel = AbilityTimelineSection;

type StickySlot = {
  endsAt: number;
  lastMs: number;
  gen: number;
  cooldown?: number;
};

/** Sticky absolute end times — smooth sparse entity.s rebroadcasts. */
const stickyByKey = new Map<string, StickySlot>();
let stickyTargetSig = "";

function resetStickyIfTargetsChanged(targetIds: string[]): void {
  const sig = targetIds.slice().sort().join("|");
  if (sig === stickyTargetSig) return;
  const keep = new Set(targetIds);
  const keys = Array.from(stickyByKey.keys());
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cut = key.indexOf(":");
    const targetId = cut < 0 ? key : key.slice(0, cut);
    if (!keep.has(targetId)) stickyByKey.delete(key);
  }
  stickyTargetSig = sig;
}

function skillName(id: string): string {
  const g = getG()?.skills?.[id]?.name;
  if (typeof g === "string" && g) return g;
  return id.replace(/_/g, " ");
}

function stickyKey(targetId: string, abilityId: string): string {
  return `${targetId}:${abilityId}`;
}

export function monsterHasTrackableAbilities(
  mtype: string | undefined,
): boolean {
  if (!mtype) return false;
  const abilities = getG()?.monsters?.[mtype]?.abilities;
  if (!abilities || typeof abilities !== "object") return false;
  const ids = Object.keys(abilities);
  for (let i = 0; i < ids.length; i++) {
    const ab = abilities[ids[i]];
    if (ab.aura || ab.unlimited) continue;
    if (typeof ab.cooldown === "number" && ab.cooldown > 0) return true;
  }
  return false;
}

/**
 * Short-CD auto-cycle threshold. Abilities with cooldown at or below this
 * are assumed to fire repeatedly. When the sticky slot expires without a
 * fresh wire sample the model synthesizes a new cycle from the known CD.
 */
const AUTO_CYCLE_MAX_CD = 3000;

/**
 * Map sparse wire `ms` onto a locally ticking remaining value.
 * Same sticky logic as buff icons (syncEndsAt).
 *
 * @param cooldown  Known ability cooldown (ms). Enables auto-cycle for short CDs
 *                  whose server updates are too sparse to catch every cast.
 */
export function syncAbilityRemainingMs(
  targetId: string,
  abilityId: string,
  rawMs: number,
  now: number = Date.now(),
  cooldown: number = 0,
): number {
  const key = stickyKey(targetId, abilityId);
  if (!(rawMs > 0)) {
    const prev = stickyByKey.get(key);
    // A single 0 while sticky still has time is a wrap/glitch (sim period
    // boundary, dropped packet) — keep counting down instead of snapping to NOW.
    if (prev && prev.endsAt > now + 250) {
      return Math.max(0, prev.endsAt - now);
    }
    // Short-CD auto-cycle: the ability just came off CD — assume it fires
    // again immediately and synthesize a new cycle from the known cooldown.
    const cd = cooldown || prev?.cooldown || 0;
    if (prev && cd > 0 && cd <= AUTO_CYCLE_MAX_CD && prev.endsAt > 0) {
      const elapsed = now - prev.endsAt;
      if (elapsed >= 0 && elapsed < cd * 2) {
        const newEndsAt = now + cd;
        const newGen = prev.gen + 1;
        stickyByKey.set(key, {
          endsAt: newEndsAt,
          lastMs: cd,
          gen: newGen,
          cooldown: cd,
        });
        return cd;
      }
    }
    if (prev) {
      stickyByKey.set(key, {
        endsAt: now,
        lastMs: 0,
        gen: prev.gen,
        cooldown: prev.cooldown,
      });
    }
    return 0;
  }
  const prev = stickyByKey.get(key);
  let endsAt = syncEndsAt(prev?.endsAt || 0, rawMs, now, prev?.lastMs);
  let gen = prev?.gen || 0;
  // syncEndsAt treats +750ms as a fresh end. On the rail that yanks the
  // icon backward. Keep small increases; accept only a real recast.
  if (prev && endsAt > prev.endsAt + 200 && endsAt - prev.endsAt < 2000) {
    endsAt = prev.endsAt;
  } else if (prev && endsAt >= prev.endsAt + 2000) {
    gen = prev.gen + 1;
  }
  stickyByKey.set(key, {
    endsAt,
    lastMs: rawMs,
    gen,
    cooldown: cooldown || prev?.cooldown,
  });
  return Math.max(0, endsAt - now);
}

/** Read sticky remaining without consuming a new wire sample. */
export function peekAbilityRemainingMs(
  targetId: string,
  abilityId: string,
  now: number = Date.now(),
): number | null {
  const slot = stickyByKey.get(stickyKey(targetId, abilityId));
  if (!slot || !(slot.endsAt > now)) return null;
  return Math.max(0, slot.endsAt - now);
}

/** Remount generation — bumps on recast so the icon does not rewind. */
export function peekAbilityCastGen(
  targetId: string,
  abilityId: string,
): number {
  return stickyByKey.get(stickyKey(targetId, abilityId))?.gen || 0;
}

/** Sticky absolute end time — 0 when the slot is idle. */
export function peekAbilityEndsAt(targetId: string, abilityId: string): number {
  return stickyByKey.get(stickyKey(targetId, abilityId))?.endsAt || 0;
}

export function abilityInStatic(
  ms: number,
  cooldown: number,
  ready: boolean,
  windowMs: number = DEFAULT_ABILITY_TIMELINE_PREFS.windowMs,
): boolean {
  return !ready && cooldown > windowMs && ms > windowMs;
}

/** 0 = NOW edge, 1 = far start (static pin / full CD remaining). */
export function abilityScrollPos(
  ms: number,
  _cooldown: number,
  ready: boolean,
  windowMs: number = DEFAULT_ABILITY_TIMELINE_PREFS.windowMs,
): number {
  if (ready || ms <= 0) return 0;
  if (ms > windowMs) return 1;
  return Math.max(0, Math.min(1, ms / windowMs));
}

/** Geometry + chrome flags from remaining ms and prefs. */
export function decorateAbilityRow(
  id: string,
  name: string,
  ms: number,
  cooldown: number,
  prefs: AbilityTimelinePrefs,
  castGen: number = 0,
  endsAt: number = 0,
): AbilityTimelineRow | null {
  const ready = ms <= 0;
  if (ready && !prefs.showReady) return null;
  return {
    id,
    name,
    ms,
    cooldown,
    frac: ready ? 0 : Math.min(1, ms / cooldown),
    imminent: !ready && ms < prefs.imminentMs,
    ready,
    pinned: abilityInStatic(ms, cooldown, ready, prefs.windowMs),
    scrollPos: abilityScrollPos(ms, cooldown, ready, prefs.windowMs),
    endsAt: ready ? 0 : endsAt,
    castGen,
  };
}

/**
 * Visible alive monsters that fire a cooldown ability (not aura / unlimited).
 */
export function hasVisibleAbilityCasters(entities: EntityLike[]): boolean {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.type !== "monster" || !ent.visible || ent.dead) continue;
    if (ent.hp != null && ent.hp <= 0) continue;
    if (monsterHasTrackableAbilities(ent.mtype)) return true;
  }
  return false;
}

/**
 * Casters for the rail. `all` mixes every visible cooldown caster;
 * `target` is the selected monster (else observe target).
 */
export function resolveAbilityTimelineTargets(
  entities: EntityLike[],
  selectedId?: string,
  observing?: EntityLike | null,
  scope: AbilityTimelineScope = DEFAULT_ABILITY_TIMELINE_PREFS.scope,
): EntityLike[] {
  const out: EntityLike[] = [];
  const seen = new Set<string>();
  const add = (ent: EntityLike | null | undefined): void => {
    if (!ent || ent.type !== "monster" || !ent.visible || ent.dead) return;
    if (ent.hp != null && ent.hp <= 0) return;
    if (!monsterHasTrackableAbilities(ent.mtype)) return;
    const id = String(ent.id);
    if (seen.has(id)) return;
    seen.add(id);
    out.push(ent);
  };

  if (selectedId) add(findEntity(entities, selectedId));
  if (observing && observing.target != null) {
    add(findEntity(entities, observing.target));
  }

  switch (scope) {
    case "target":
      break;
    case "all": {
      for (let i = 0; i < entities.length; i++) add(entities[i]);
      break;
    }
    default: {
      const _never: never = scope;
      void _never;
      break;
    }
  }

  return out;
}

/** @deprecated Prefer resolveAbilityTimelineTargets */
export function resolveAbilityTimelineTarget(
  entities: EntityLike[],
  selectedId?: string,
  observing?: EntityLike | null,
): EntityLike | null {
  const targets = resolveAbilityTimelineTargets(
    entities,
    selectedId,
    observing,
  );
  return targets.length ? targets[0] : null;
}

export function buildAbilityTimelineModel(
  target: EntityLike | null,
  now: number = Date.now(),
  prefs: AbilityTimelinePrefs = DEFAULT_ABILITY_TIMELINE_PREFS,
): AbilityTimelineSection | null {
  if (!target || !target.mtype) return null;
  const targetId = String(target.id);

  const def = getG()?.monsters?.[target.mtype];
  const abilities =
    def && typeof def.abilities === "object" ? def.abilities : null;
  if (!abilities) return null;
  const ids = Object.keys(abilities);
  if (!ids.length) return null;
  const rows: AbilityTimelineRow[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ab = abilities[id];
    if (ab.aura || ab.unlimited) continue;
    const cooldown =
      typeof ab.cooldown === "number" && ab.cooldown > 0 ? ab.cooldown : 0;
    if (!cooldown) continue;
    const st = target.s?.[id];
    const rawMs = st && typeof st.ms === "number" ? Math.max(0, st.ms) : 0;
    const ms = syncAbilityRemainingMs(targetId, id, rawMs, now, cooldown);
    const row = decorateAbilityRow(
      id,
      skillName(id),
      ms,
      cooldown,
      prefs,
      peekAbilityCastGen(targetId, id),
      peekAbilityEndsAt(targetId, id),
    );
    if (row) rows.push(row);
  }
  if (!rows.length) return null;
  rows.sort((a, b) => {
    // Ready (0) last; imminent first among active.
    if (a.ms === 0 && b.ms !== 0) return 1;
    if (b.ms === 0 && a.ms !== 0) return -1;
    return a.ms - b.ms;
  });
  return {
    targetName: target.name || target.mtype || targetId,
    targetId,
    targetMtype: target.mtype,
    rows,
  };
}

/** Build timeline sections for every visible caster (etc.) with trackable abilities. */
export function buildAbilityTimelinePanelModel(
  entities: EntityLike[],
  selectedId?: string,
  observing?: EntityLike | null,
  now: number = Date.now(),
  prefs: AbilityTimelinePrefs = DEFAULT_ABILITY_TIMELINE_PREFS,
): AbilityTimelinePanelModel | null {
  const targets = resolveAbilityTimelineTargets(
    entities,
    selectedId,
    observing,
    prefs.scope,
  );
  if (!targets.length) return null;
  resetStickyIfTargetsChanged(targets.map((t) => String(t.id)));

  const sections: AbilityTimelineSection[] = [];
  for (let i = 0; i < targets.length; i++) {
    const section = buildAbilityTimelineModel(targets[i], now, prefs);
    if (section) sections.push(section);
  }
  if (!sections.length) return null;
  return { sections };
}

/** Panel title for one or many boss sections. */
export function abilityTimelinePanelTitle(
  sections: AbilityTimelineSection[],
): string {
  if (sections.length === 1) return sections[0].targetName;
  if (sections.length === 2) {
    return `${sections[0].targetName} · ${sections[1].targetName}`;
  }
  return `${sections.length} casters`;
}

export function formatAbilityMs(ms: number): string {
  if (ms <= 0) return "ready";
  return formatDurationCompact(ms / 1000) || `${Math.ceil(ms / 1000)}s`;
}

/** Stack index among currently pinned rows (longest remaining first). */
export function staticStackIndex(
  rows: AbilityTimelineRow[],
  abilityId: string,
): number {
  const pinned: AbilityTimelineRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].pinned) pinned.push(rows[i]);
  }
  pinned.sort((a, b) => b.ms - a.ms || a.id.localeCompare(b.id));
  for (let i = 0; i < pinned.length; i++) {
    if (pinned[i].id === abilityId) return i;
  }
  return 0;
}
