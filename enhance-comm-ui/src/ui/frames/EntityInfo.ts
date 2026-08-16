/**
 * Paperdoll / entity inspect panel.
 * Keeps last-known data when the unit leaves vision instead of closing.
 */

import { getReact, e } from "../../host/react";
import { getG } from "../../host/al";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { formatCompactNumber, getPercent } from "../../lib/format";
import { findEntity } from "../../queries/entities";
import { GearGrid } from "../chrome/GearGrid";
import type { EntityLike } from "../../host/globals";
import { CompareToWatched } from "../paperdoll/CompareToWatched";
import {
  PaperdollDummy,
  PAPERDOLL_BODY,
  PAPERDOLL_SHELL,
  PAPERDOLL_STATS_GRID,
  PAPERDOLL_VITALS,
} from "../paperdoll/PaperdollDummy";
import {
  goldDisplay,
  luckDisplay,
  resolvePaperdollEconomy,
} from "../paperdoll/inspectStats";
import { Stat } from "../paperdoll/Stat";
import { VitalsBar } from "../paperdoll/VitalsBar";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type EntityInfoProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  onClose?: () => void;
  /** When true and nothing is selected, show a layout placeholder. */
  layoutEdit?: boolean;
  /** Watched character — used for “compare to watched” delta stats. */
  observing?: EntityLike | null;
};

/** Shallow snapshot so departing entities do not wipe cached paperdoll fields. */
function snapshotEntity(ent: EntityLike): EntityLike {
  const copy: EntityLike = Object.assign({}, ent);
  if (ent.slots) copy.slots = Object.assign({}, ent.slots);
  if (ent.s) copy.s = Object.assign({}, ent.s);
  return copy;
}

/** Soft sync omits max_xp; G.levels[level] is the same table the server uses. */
function resolveMaxXp(entity: EntityLike): number | undefined {
  if (entity.max_xp != null && entity.max_xp > 0) return entity.max_xp;
  const level = entity.level;
  if (level == null) return undefined;
  const cap = getG()?.levels?.[String(level)];
  return typeof cap === "number" && cap > 0 ? cap : undefined;
}

export function EntityInfo(props: EntityInfoProps): any {
  const React = getReact();
  const selectedId =
    props.selectedEntity != null && props.selectedEntity !== ""
      ? String(props.selectedEntity)
      : "";

  const live = selectedId ? findEntity(props.entities, selectedId) : undefined;

  // Retain last in-vision snapshot so the paperdoll stays open out of range.
  const cacheRef = React.useRef(null as EntityLike | null);
  if (!selectedId) {
    cacheRef.current = null;
  } else if (live) {
    cacheRef.current = snapshotEntity(live);
  } else if (cacheRef.current && String(cacheRef.current.id) !== selectedId) {
    cacheRef.current = null;
  }

  const entity = live || cacheRef.current;
  const stale = !live && !!entity;

  if (!entity) {
    if (!props.layoutEdit) return null;
    return e(PaperdollDummy);
  }

  const accent =
    classColors[entity.ctype || ""] ||
    (entity.type === "monster" ? "#c44" : "#888");
  const isPlayer = !!(entity.player || entity.type === "character");
  const title =
    `${entity.name || entity.id}` +
    (entity.mtype ? ` (${entity.mtype})` : "") +
    ` · ${entity.level ?? 1}` +
    (entity.type === "monster" ? ` #${entity.id}` : "");
  const watching = props.observing;
  const compare =
    !stale &&
    isPlayer &&
    watching &&
    String(watching.id) !== String(entity.id) &&
    !!(watching.player || watching.type === "character");

  const welcomeSnap = window.observing;
  const eco = resolvePaperdollEconomy(entity, welcomeSnap);
  const watchEco = watching
    ? resolvePaperdollEconomy(watching, welcomeSnap)
    : undefined;
  const luck = luckDisplay(eco);
  const gold = goldDisplay(eco);

  const close = () => {
    if (props.onClose) props.onClose();
    else setXTarget(null);
  };

  const maxXp = isPlayer ? resolveMaxXp(entity) : undefined;
  const xpBar =
    isPlayer && entity.xp != null && maxXp != null
      ? e(VitalsBar, {
          label: "XP",
          current: entity.xp,
          max: maxXp,
          color: "#368C2B",
          valueText: `${formatCompactNumber(entity.xp)} / ${formatCompactNumber(maxXp)}`,
        })
      : null;

  return e(
    "div",
    {
      className: "comm-paperdoll" + (stale ? " comm-paperdoll-stale" : ""),
      style: Object.assign({}, PAPERDOLL_SHELL, {
        border: stale ? "2px dashed #c9a227" : `2px solid ${accent}`,
        opacity: stale ? 0.92 : 1,
      }),
      onClick: (ev: any) => {
        ev.stopPropagation();
        if (!stale) setXTarget(entity);
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 6px",
          background: `linear-gradient(90deg, ${accent}33, transparent)`,
          borderBottom: `1px solid ${accent}66`,
        },
      },
      e("div", {
        style: {
          width: "7px",
          height: "7px",
          background: stale ? "#c9a227" : accent,
          flexShrink: 0,
        },
      }),
      e(
        "div",
        {
          style: {
            flex: 1,
            minWidth: 0,
            fontSize: TYPE.name,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...PIXEL_TEXT,
          },
          title,
        },
        title,
      ),
      e(
        "button",
        {
          type: "button",
          title: "Close",
          onClick: (ev: any) => {
            ev.stopPropagation();
            close();
          },
          style: {
            cursor: "pointer",
            border: "1px solid #555",
            background: "#1c1c1c",
            color: "#ddd",
            width: "22px",
            height: "22px",
            lineHeight: "18px",
            padding: 0,
            flexShrink: 0,
            fontSize: TYPE.body,
            ...PIXEL_TEXT,
          },
        },
        "×",
      ),
    ),
    stale
      ? e(
          "div",
          {
            style: {
              padding: "4px 6px",
              background: "rgba(201, 162, 39, 0.14)",
              borderBottom: "1px solid rgba(201, 162, 39, 0.35)",
              color: "#e8c96a",
              fontSize: TYPE.micro,
              lineHeight: 1.3,
              ...PIXEL_TEXT,
            },
          },
          "Out of vision — last known data.",
        )
      : null,
    e(
      "div",
      { style: PAPERDOLL_BODY },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 8px",
            fontSize: TYPE.micro,
            color: "#bdbdbd",
            ...PIXEL_TEXT,
          },
        },
        entity.ctype
          ? e("span", { style: { color: accent } }, entity.ctype)
          : null,
        entity.party ? e("span", {}, `party ${entity.party}`) : null,
        entity.age != null ? e("span", {}, `age ${entity.age}`) : null,
        !isPlayer && entity.mtype ? e("span", {}, entity.mtype) : null,
      ),
      e(
        "div",
        { style: PAPERDOLL_VITALS },
        e(VitalsBar, {
          label: "HP",
          current: entity.hp || 0,
          max: entity.max_hp || 1,
          color: "#c33",
        }),
        e(VitalsBar, {
          label: "MP",
          current: entity.mp || 0,
          max: entity.max_mp || 1,
          color: "#3a5fd4",
        }),
        xpBar,
      ),
      e(
        "div",
        { style: PAPERDOLL_STATS_GRID },
        entity.attack
          ? e(Stat, {
              label: "ATK",
              value: `${entity.attack}${entity.damage_type ? ` ${entity.damage_type}` : ""}`,
            })
          : null,
        entity.heal ? e(Stat, { label: "Heal", value: entity.heal }) : null,
        e(Stat, { label: "Armor", value: entity.armor ?? 0 }),
        e(Stat, { label: "Res", value: entity.resistance ?? 0 }),
        entity.evasion
          ? e(Stat, {
              label: "Eva",
              value: getPercent(entity.evasion / 100, 1),
            })
          : null,
        entity.reflection
          ? e(Stat, {
              label: "Refl",
              value: getPercent(entity.reflection / 100, 1),
            })
          : null,
        entity.speed != null
          ? e(Stat, { label: "Speed", value: entity.speed.toFixed(1) })
          : null,
        entity.frequency != null
          ? e(Stat, {
              label: "Freq",
              value: entity.frequency.toFixed(2),
            })
          : null,
        isPlayer
          ? e(Stat, {
              label: "🍀 Luck",
              value: luck.value,
              accent: luck.accent,
              title: luck.title,
            })
          : null,
        isPlayer
          ? e(Stat, {
              label: "Gold",
              value: gold.value,
              accent: gold.accent,
              title: gold.title,
            })
          : null,
      ),
      compare && watching && watchEco
        ? e(CompareToWatched, {
            entity,
            watching,
            entityEco: eco,
            watchEco,
          })
        : null,
      entity.slots
        ? e(
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
              compare ? "GEAR · Δ vs watched" : "GEAR",
            ),
            e(GearGrid, {
              entity,
              compareTo: compare ? watching : null,
            }),
          )
        : null,
    ),
  );
}
