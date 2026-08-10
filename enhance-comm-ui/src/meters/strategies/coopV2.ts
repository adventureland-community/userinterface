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

function pointsPow065(player: EntityLike): number {
  return Math.pow(Math.max(0, player?.s?.coop?.p ?? 0), 0.65);
}

/** Server share: pow(p, 0.65) / (0.1 + Σ pow(p_i, 0.65)). */
export function buildCoopV2Rows(entities: EntityLike[]): RankRow[] {
  const players = coopPlayers(entities);
  if (players.length === 0) return [];

  const powers: number[] = [];
  let maxPower = 0;
  // NOTE: initial value 0.1 is what is used on server
  let totalPower = 0.1;
  for (let i = 0; i < players.length; i++) {
    const p = pointsPow065(players[i]);
    powers.push(p);
    maxPower = Math.max(maxPower, p);
    totalPower += p;
  }

  return players.map((player, i) => {
    const value = powers[i];
    return {
      id: player.id,
      name: player.name || player.id,
      ctype: player.ctype,
      value,
      barMax: maxPower || 1,
      label: `${getPercent(value / totalPower, 3)} | ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    };
  });
}
