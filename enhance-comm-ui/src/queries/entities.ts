import { CRYPT_BOSSES_MTYPES } from "../crypt/tracker";
import type { EntityLike } from "../host/globals";

const MTYPES_TO_SQUASH = ["nerfedbat", "nerfedmummy", "zapper0", "crab"];

export function isCoopBoss(entity: EntityLike): boolean {
  return entity.cooperative === true;
}

export function shouldSquash(mtype: string | undefined): boolean {
  if (!mtype) return false;
  return MTYPES_TO_SQUASH.indexOf(mtype) >= 0;
}

export function playersList(entities: EntityLike[]): EntityLike[] {
  const out: EntityLike[] = [];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (isFocusablePlayer(ent)) out.push(ent);
  }
  return out;
}

/**
 * Party / world players + local self.
 * Soft-synced others get `player:true`; local `character` gets `me` and
 * `type:"character"` but usually not `player` (game.js skips self in entities).
 */
export function isFocusablePlayer(
  entity: EntityLike | null | undefined,
): boolean {
  if (!entity || entity.type !== "character") return false;
  return !!(entity.player || entity.me);
}

export function partyGroups(
  entities: EntityLike[],
): Array<[string, EntityLike[]]> {
  const players = playersList(entities);
  const result: Record<string, EntityLike[]> = {};
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const key = player.party || "";
    if (!result[key]) result[key] = [];
    result[key].push(player);
  }
  const entries = Object.entries(result);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  for (let i = 0; i < entries.length; i++) {
    entries[i][1].sort((a, b) => a.id.localeCompare(b.id));
  }
  return entries;
}

/** Map targetId (string) -> monsters currently targeting them. */
export function aggroByTarget(
  entities: EntityLike[],
): Record<string, EntityLike[]> {
  const out: Record<string, EntityLike[]> = {};
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type !== "monster" || ent.target == null || ent.target === "") {
      continue;
    }
    const tid = String(ent.target);
    if (!out[tid]) out[tid] = [];
    out[tid].push(ent);
  }
  return out;
}

/** Lookup aggro list for an id; keys are always stringified. */
export function aggroOn(
  byTarget: Record<string, EntityLike[]>,
  id: string | number | null | undefined,
): EntityLike[] {
  if (id == null || id === "") return [];
  return byTarget[String(id)] || [];
}

/**
 * Aggro list for a framed unit. Players/characters get mobs targeting them;
 * monsters (and anything else) get [] — never paint observer aggro on a goo.
 */
export function aggroMobsForFramedEntity(
  byTarget: Record<string, EntityLike[]>,
  entity: EntityLike | null | undefined,
): EntityLike[] {
  if (!isFocusablePlayer(entity)) return [];
  return aggroOn(byTarget, entity!.id);
}

/** Local self (`me`) when present in the entity snapshot. */
export function findLocalSelf(
  entities: EntityLike[],
): EntityLike | undefined {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent && ent.me) return ent;
  }
  return undefined;
}

export function aggroedMonsters(entities: EntityLike[]): EntityLike[] {
  const out: EntityLike[] = [];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type === "monster" && ent.cooperative !== true && ent.target) {
      out.push(ent);
    }
  }
  out.sort((a, b) => {
    const cmp = (a.mtype || "").localeCompare(b.mtype || "");
    if (cmp !== 0) return cmp;
    return a.id < b.id ? -1 : 1;
  });
  return out;
}

export function isCryptBossEntity(entity: EntityLike): boolean {
  if (entity.type !== "monster" || !entity.mtype) return false;
  return CRYPT_BOSSES_MTYPES.indexOf(entity.mtype) >= 0;
}

function isAliveMonster(entity: EntityLike): boolean {
  if (entity.type !== "monster") return false;
  if (entity.dead) return false;
  if (entity.hp != null && entity.hp <= 0) return false;
  return true;
}

/** Live cooperative or crypt bosses visible in entity snapshot. */
export function activeBosses(entities: EntityLike[]): EntityLike[] {
  const out: EntityLike[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!isAliveMonster(ent)) continue;
    if (!isCoopBoss(ent) && !isCryptBossEntity(ent)) continue;
    const id = String(ent.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(ent);
  }
  out.sort((a, b) => {
    const lb = b.level || 0;
    const la = a.level || 0;
    if (lb !== la) return lb - la;
    const cmp = String(a.name || a.mtype || a.id).localeCompare(
      String(b.name || b.mtype || b.id),
    );
    if (cmp !== 0) return cmp;
    return a.id < b.id ? -1 : 1;
  });
  return out;
}

export function findEntity(
  entities: EntityLike[],
  id: string | number | undefined,
): EntityLike | undefined {
  if (id == null || id === "") return undefined;
  const tid = String(id);
  for (let i = 0; i < entities.length; i++) {
    if (String(entities[i].id) === tid) return entities[i];
  }
  return undefined;
}
