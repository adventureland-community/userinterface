import { getEntitiesRecord } from "../host/al";
import { onKill, type KillEvent } from "../sockets/hub";

const mtypeCounts: Record<string, number> = {};
const lastSeenMtype = new Map<string, string>();
let totalKills = 0;
let unsub: (() => void) | null = null;

function handleKill(ev: KillEvent): void {
  const mtype =
    lastSeenMtype.get(ev.id) || getEntitiesRecord()[ev.id]?.mtype || "?";
  mtypeCounts[mtype] = (mtypeCounts[mtype] || 0) + 1;
  totalKills += 1;
}

/** Call from tick/render with current entities so deaths keep mtype. */
export function updateSeenMtypes(
  entities: Array<{ id: string; mtype?: string; type?: string }>,
): void {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type === "monster" && ent.mtype) {
      lastSeenMtype.set(ent.id, ent.mtype);
    }
  }
}

export function startSessionKills(): () => void {
  if (!unsub) {
    unsub = onKill(handleKill);
  }
  return () => {
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
}

export function getStats(): {
  total: number;
  byMtype: Array<{ mtype: string; count: number }>;
} {
  const byMtype: Array<{ mtype: string; count: number }> = [];
  const keys = Object.keys(mtypeCounts);
  for (let i = 0; i < keys.length; i++) {
    byMtype.push({ mtype: keys[i], count: mtypeCounts[keys[i]] });
  }
  byMtype.sort((a, b) => b.count - a.count);
  return { total: totalKills, byMtype };
}
