import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import type { PaperdollEconomy } from "./inspectStats";
import { goldDelta, luckDelta } from "./inspectStats";

function DeltaStat(props: {
  label: string;
  theirs: number | undefined | null;
  ours: number | undefined | null;
  pct?: boolean;
}): any {
  if (props.theirs == null || props.ours == null) return null;
  const d = props.theirs - props.ours;
  if (!Number.isFinite(d) || Math.abs(d) < 0.0001) return null;
  const positive = d > 0;
  const text = props.pct
    ? `${positive ? "+" : ""}${d.toFixed(1)}%`
    : `${positive ? "+" : ""}${Number.isInteger(d) ? d : d.toFixed(1)}`;
  return e(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: "6px",
        fontSize: TYPE.micro,
        lineHeight: "15px",
        ...PIXEL_TEXT,
      },
    },
    e("span", { style: { color: "#888" } }, props.label),
    e(
      "span",
      {
        style: {
          color: positive ? "#85c76b" : "#e07070",
          fontVariantNumeric: "tabular-nums",
        },
      },
      text,
    ),
  );
}

export type CompareToWatchedProps = {
  entity: EntityLike;
  watching: EntityLike;
  entityEco: PaperdollEconomy;
  watchEco: PaperdollEconomy;
};

export function CompareToWatched(props: CompareToWatchedProps): any {
  const { entity, watching, entityEco, watchEco } = props;
  const watchName = watching.name || watching.id;
  const luck = luckDelta(entityEco, watchEco);
  const gold = goldDelta(entityEco, watchEco);
  return e(
    "div",
    {
      style: {
        borderTop: "1px solid #2a2a2a",
        paddingTop: "6px",
      },
    },
    e(
      "div",
      {
        style: {
          fontSize: TYPE.micro,
          color: "#888",
          marginBottom: "4px",
          letterSpacing: "0.04em",
          ...PIXEL_TEXT,
        },
      },
      `VS ${watchName}`,
    ),
    e(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1px 8px",
          padding: "4px 6px",
          background: "#0a0a0a",
          border: "1px solid #2a2a2a",
        },
      },
      e(DeltaStat, {
        label: "ATK",
        theirs: entity.attack,
        ours: watching.attack,
      }),
      e(DeltaStat, {
        label: "Heal",
        theirs: entity.heal,
        ours: watching.heal,
      }),
      e(DeltaStat, {
        label: "Armor",
        theirs: entity.armor ?? 0,
        ours: watching.armor ?? 0,
      }),
      e(DeltaStat, {
        label: "Res",
        theirs: entity.resistance ?? 0,
        ours: watching.resistance ?? 0,
      }),
      e(DeltaStat, {
        label: "Eva",
        theirs: entity.evasion,
        ours: watching.evasion,
        pct: true,
      }),
      e(DeltaStat, {
        label: "Refl",
        theirs: entity.reflection,
        ours: watching.reflection,
        pct: true,
      }),
      e(DeltaStat, {
        label: "Speed",
        theirs: entity.speed,
        ours: watching.speed,
      }),
      e(DeltaStat, {
        label: "Freq",
        theirs: entity.frequency,
        ours: watching.frequency,
      }),
      e(DeltaStat, {
        label: "HP",
        theirs: entity.max_hp,
        ours: watching.max_hp,
      }),
      e(DeltaStat, {
        label: "MP",
        theirs: entity.max_mp,
        ours: watching.max_mp,
      }),
      luck
        ? e(DeltaStat, {
            label: "🍀",
            theirs: luck.theirs,
            ours: luck.ours,
            pct: luck.pct,
          })
        : null,
      gold
        ? e(DeltaStat, {
            label: "Gold",
            theirs: gold.theirs,
            ours: gold.ours,
            pct: gold.pct,
          })
        : null,
    ),
  );
}
