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

/** Continuous HP% in [0, 100]. */
function hpPctRaw(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return Math.max(0, Math.min(100, ((entity.hp || 0) / max) * 100));
}

/** Nearest 5% bucket — identical = same mtype + same bucket. */
function hpBucket(entity: EntityLike): number {
  return Math.round(hpPctRaw(entity) / 5) * 5;
}

type EnemyGroup = {
  key: string;
  members: EntityLike[];
  /** Lowest-HP member: bar fill + click target (safer for awareness). */
  focus: EntityLike;
  /** Display HP% from focus (lowest in group). */
  hpPct: number;
};

/**
 * Collapse monsters that share mtype and a 5%-quantized HP bucket.
 * Bar and click use the lowest-HP member so urgency stays visible.
 */
function groupIdenticalEnemies(enemies: EntityLike[]): EnemyGroup[] {
  const buckets: Record<string, EntityLike[]> = {};
  const order: string[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const mtype = enemy.mtype || "?";
    const key = `${mtype}@${hpBucket(enemy)}`;
    if (!buckets[key]) {
      buckets[key] = [];
      order.push(key);
    }
    buckets[key].push(enemy);
  }

  const groups: EnemyGroup[] = [];
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const members = buckets[key];
    let focus = members[0];
    let lowest = hpPctRaw(focus);
    for (let j = 1; j < members.length; j++) {
      const pct = hpPctRaw(members[j]);
      if (pct < lowest) {
        lowest = pct;
        focus = members[j];
      }
    }
    groups.push({
      key,
      members,
      focus,
      hpPct: Math.round(lowest),
    });
  }
  return groups;
}

function groupContainsId(group: EnemyGroup, id: string | undefined): boolean {
  if (id == null) return false;
  const tid = String(id);
  for (let i = 0; i < group.members.length; i++) {
    if (String(group.members[i].id) === tid) return true;
  }
  return false;
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

  const groups = groupIdenticalEnemies(importantEnemies);
  const maxGroupsToShow = 10;
  const shown = groups.slice(0, maxGroupsToShow);
  let moreEnemiesCount = 0;
  for (let i = maxGroupsToShow; i < groups.length; i++) {
    moreEnemiesCount += groups[i].members.length;
  }
  const squashKeys = Object.keys(squashEnemiesCounts);

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
      ...shown.map((group) => {
        const focus = group.focus;
        const count = group.members.length;
        const selected = groupContainsId(group, props.selectedEntity);
        const label = focus.name || focus.mtype || focus.id;
        return e(
          "div",
          {
            key: group.key,
            style: {
              position: "relative",
              flex: "0 0 auto",
              width: "168px",
              cursor: "pointer",
              overflow: "hidden",
              boxSizing: "border-box",
            },
            onClick: () => {
              setXTarget(focus);
              props.setSelectedEntity(focus.id);
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
                width: `${group.hpPct}%`,
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
                  gap: "4px",
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
              e(
                "span",
                {
                  style: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    ...PIXEL_TEXT,
                  },
                },
                label,
              ),
              count > 1
                ? e(
                    "span",
                    {
                      style: {
                        flexShrink: 0,
                        fontSize: TYPE.count,
                        color: "#ffe8e8",
                        ...PIXEL_TEXT,
                      },
                    },
                    `×${count}`,
                  )
                : undefined,
            ),
          ),
        );
      }),
    ),
    ...squashKeys.map((enemyMtype) => {
      // Compact trash line — still clickable: target lowest-HP of that mtype.
      const members: EntityLike[] = [];
      for (let i = 0; i < enemiesToSquash.length; i++) {
        const m = enemiesToSquash[i];
        if ((m.mtype || "?") === enemyMtype) members.push(m);
      }
      let focus = members[0];
      let lowest = hpPctRaw(focus);
      for (let j = 1; j < members.length; j++) {
        const pct = hpPctRaw(members[j]);
        if (pct < lowest) {
          lowest = pct;
          focus = members[j];
        }
      }
      const selected = groupContainsId(
        { key: enemyMtype, members, focus, hpPct: Math.round(lowest) },
        props.selectedEntity,
      );
      return e(
        "div",
        {
          key: enemyMtype,
          role: "button",
          title: `Target ${enemyMtype}`,
          style: {
            background: "rgba(0,0,0,0.55)",
            padding: "3px 8px",
            fontSize: TYPE.secondaryMin,
            color: "#aaa",
            cursor: "pointer",
            outline: selected ? "1px solid #fff" : undefined,
            ...PIXEL_TEXT,
          },
          onClick: () => {
            setXTarget(focus);
            props.setSelectedEntity(focus.id);
          },
        },
        `also ${squashEnemiesCounts[enemyMtype]} aggroed ${enemyMtype}'s`,
      );
    }),
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
