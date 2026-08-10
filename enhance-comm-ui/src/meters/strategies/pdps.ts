import type { EntityLike } from "../../host/globals";
import { playersList } from "../../queries/entities";
import type { RankRow } from "../RankMeter";

export function buildPdpsRows(entities: EntityLike[]): RankRow[] {
  const players = playersList(entities)
    .filter((p) => (p.pdps || 0) > 0)
    .sort((a, b) => (b.pdps || 0) - (a.pdps || 0));

  let maxPdps = 0;
  for (let i = 0; i < players.length; i++) {
    maxPdps = Math.max(maxPdps, players[i].pdps || 0);
  }
  if (!maxPdps || players.length === 0) return [];

  return players.map((player) => {
    const value = player.pdps || 0;
    return {
      id: player.id,
      name: player.name || player.id,
      ctype: player.ctype,
      value,
      barMax: maxPdps,
      label: value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    };
  });
}
