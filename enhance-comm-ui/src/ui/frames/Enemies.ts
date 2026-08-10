import { e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { aggroedMonsters, shouldSquash } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type EnemiesProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string) => void;
  selectedEntity?: string;
};

function hpPct(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.hp || 0) / max) * 100)));
}

/** observe-hud aggro chips (right strip). */
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
  const moreEnemiesCount = Math.max(
    0,
    importantEnemies.length - maxEnemiesToShow,
  );
  const squashKeys = Object.keys(squashEnemiesCounts);
  const shown = importantEnemies.slice(0, maxEnemiesToShow);

  if (!shown.length && !squashKeys.length) return null;

  return e(
    "div",
    {
      className: "ecu-aggro",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        paddingTop: "4px",
        alignItems: "flex-end",
      },
    },
    e(
      "div",
      {
        style: {
          fontSize: TYPE.secondary,
          color: "#ccc",
          background: "rgba(0,0,0,0.55)",
          display: "inline-block",
          padding: "3px 8px",
          alignSelf: "flex-end",
          ...PIXEL_TEXT,
        },
      },
      "Aggro",
    ),
    e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: "5px",
        },
      },
      ...shown.map((enemy) => {
        const selected =
          props.selectedEntity != null &&
          String(props.selectedEntity) === String(enemy.id);
        return e(
          "div",
          {
            key: enemy.id,
            style: {
              position: "relative",
              flex: "0 0 auto",
              width: "168px",
              cursor: "pointer",
              overflow: "hidden",
              boxSizing: "border-box",
            },
            onClick: () => {
              setXTarget(enemy);
              props.setSelectedEntity(enemy.id);
            },
          },
          e(
            "div",
            {
              style: {
                position: "relative",
                height: "26px",
                overflow: "hidden",
                background: "rgba(0,0,0,0.45)",
                outline: selected ? "1px solid #fff" : undefined,
              },
            },
            e("div", {
              style: {
                display: "block",
                height: "100%",
                width: `${hpPct(enemy)}%`,
                background: "#c44",
              },
            }),
            e(
              "div",
              {
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 7px",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  fontSize: TYPE.name,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  color: "#ffd0d0",
                  pointerEvents: "none",
                  ...PIXEL_TEXT,
                },
              },
              enemy.name || enemy.mtype || enemy.id,
            ),
          ),
        );
      }),
    ),
    ...squashKeys.map((enemyMtype) =>
      e(
        "div",
        {
          key: enemyMtype,
          style: {
            background: "rgba(0,0,0,0.55)",
            padding: "3px 8px",
            fontSize: TYPE.secondaryMin,
            color: "#aaa",
            ...PIXEL_TEXT,
          },
        },
        `also ${squashEnemiesCounts[enemyMtype]} aggroed ${enemyMtype}'s`,
      ),
    ),
    moreEnemiesCount
      ? e(
          "div",
          {
            style: {
              background: "rgba(0,0,0,0.55)",
              padding: "3px 8px",
              fontSize: TYPE.secondaryMin,
              color: "#aaa",
              ...PIXEL_TEXT,
            },
          },
          `...and ${moreEnemiesCount} more aggroed enemies`,
        )
      : undefined,
  );
}
