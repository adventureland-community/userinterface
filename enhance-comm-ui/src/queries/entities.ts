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
    if (ent.player && ent.type === "character") out.push(ent);
  }
  return out;
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

/** Map targetId -> monsters currently targeting them. */
export function aggroByTarget(
  entities: EntityLike[],
): Record<string, EntityLike[]> {
  const out: Record<string, EntityLike[]> = {};
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type !== "monster" || !ent.target) continue;
    if (!out[ent.target]) out[ent.target] = [];
    out[ent.target].push(ent);
  }
  return out;
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
