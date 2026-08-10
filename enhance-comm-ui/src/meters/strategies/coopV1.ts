import type { EntityLike } from "../../host/globals";
import { getPercent } from "../../lib/format";
import type { RankRow } from "../RankMeter";

function coopPlayers(entities: EntityLike[]): EntityLike[] {
  const ids = new Set(entities.map((e) => e.id));
  return entities
    .filter(
      (e) =>
        e.player &&
        e.type === "character" &&
        (e.s?.coop?.p || 0) > 0 &&
        e.s?.coop?.id != null &&
        ids.has(String(e.s.coop.id)),
    )
    .sort((a, b) => (b.s?.coop?.p || 0) - (a.s?.coop?.p || 0));
}

export function buildCoopV1Rows(entities: EntityLike[]): RankRow[] {
  const players = coopPlayers(entities);
  let maxContribution = 0;
  let totalContribution = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i].s?.coop?.p || 0;
    maxContribution = Math.max(maxContribution, p);
    totalContribution += p;
  }
  if (!maxContribution || players.length === 0) return [];

  return players.map((player) => {
    const value = player.s?.coop?.p || 0;
    return {
      id: player.id,
      name: player.name || player.id,
      ctype: player.ctype,
      value,
      barMax: maxContribution,
      label: `${getPercent(value / totalContribution, 3)} | ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    };
  });
}
