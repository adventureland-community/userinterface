import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { getPercent } from "../../lib/format";
import { aggroedMonsters, shouldSquash } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";

export type EnemiesProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string) => void;
};

export function Enemies(props: EnemiesProps): any {
  const enemies = aggroedMonsters(props.entities);
  const enemiesToSquash: EntityLike[] = [];
  const importantEnemies: EntityLike[] = [];
  for (let i = 0; i < enemies.length; i++) {
    if (shouldSquash(enemies[i].mtype)) enemiesToSquash.push(enemies[i]);
    else importantEnemies.push(enemies[i]);
  }

  const squashEnemiesCounts: Record<string, number> = {};
  for (let i = 0; i < enemiesToSquash.length; i++) {
    const mtype = enemiesToSquash[i].mtype || "?";
    squashEnemiesCounts[mtype] = (squashEnemiesCounts[mtype] || 0) + 1;
  }

  const maxEnemiesToShow = 10;
  const moreEnemiesCount = Math.max(0, importantEnemies.length - maxEnemiesToShow);
  const squashKeys = Object.keys(squashEnemiesCounts);

  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        paddingTop: "4px",
      },
    },
    ...importantEnemies.slice(0, maxEnemiesToShow).map((enemy) =>
      e(
        "div",
        {
          key: enemy.id,
          style: {
            display: "flex",
            width: "100%",
            flexDirection: "column",
            textAlign: "left",
          },
        },
        e(
          "div",
          { style: { background: "black", position: "relative" } },
          e("div", {
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              width: getPercent((enemy.hp || 0) / (enemy.max_hp || 1), 1),
              background: "red",
            },
          }),
          e(
            "div",
            {
              style: {
                padding: "4px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                position: "relative",
                textShadow: "0 0 2px black",
                cursor: "pointer",
              },
              onClick: () => {
                setXTarget(enemy);
                props.setSelectedEntity(enemy.id);
              },
            },
            `${enemy.level ?? 1} ${enemy.name} #${enemy.id} (${getPercent((enemy.hp || 0) / (enemy.max_hp || 1), 1)})`,
          ),
        ),
        e(
          "div",
          { style: { background: "black" } },
          e("div", {
            style: {
              background: "blue",
              height: "4px",
              width: getPercent((enemy.mp || 0) / (enemy.max_mp || 1), 1),
            },
          }),
        ),
      ),
    ),
    ...squashKeys.map((enemyMtype) =>
      e(
        "div",
        { key: enemyMtype, style: { background: "black" } },
        `also ${squashEnemiesCounts[enemyMtype]} aggroed ${enemyMtype}'s`,
      ),
    ),
    moreEnemiesCount
      ? e(
          "div",
          { style: { background: "black" } },
          `...and ${moreEnemiesCount} more aggroed enemies`,
        )
      : undefined,
  );
}
