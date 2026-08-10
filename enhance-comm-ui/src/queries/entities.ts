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

export function coopBosses(entities: EntityLike[]): EntityLike[] {
  const out: EntityLike[] = [];
  for (let i = 0; i < entities.length; i++) {
    if (isCoopBoss(entities[i])) out.push(entities[i]);
  }
  return out;
}

export function findEntity(
  entities: EntityLike[],
  id: string | undefined,
): EntityLike | undefined {
  if (!id) return undefined;
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].id === id) return entities[i];
  }
  return undefined;
}
