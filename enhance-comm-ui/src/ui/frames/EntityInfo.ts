/**
 * Paperdoll / entity inspect panel.
 * Keeps last-known data when the unit leaves vision instead of closing.
 */

import { getReact, e } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { classColors } from "../../lib/colors";
import { getPercent } from "../../lib/format";
import { findEntity } from "../../queries/entities";
import { GearGrid } from "../chrome/GearGrid";
import type { EntityLike } from "../../host/globals";
import { CompareToWatched } from "../paperdoll/CompareToWatched";
import { PaperdollDummy, PAPERDOLL_SHELL } from "../paperdoll/PaperdollDummy";
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

  const close = () => {
    if (props.onClose) props.onClose();
    else setXTarget(null);
  };

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
          gap: "8px",
          padding: "8px 10px",
          background: `linear-gradient(90deg, ${accent}33, transparent)`,
          borderBottom: `1px solid ${accent}66`,
        },
      },
      e("div", {
        style: {
          width: "8px",
          height: "8px",
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
            fontSize: TYPE.title,
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
            width: "32px",
            height: "32px",
            lineHeight: "28px",
            padding: 0,
            flexShrink: 0,
            fontSize: "18px",
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
              padding: "6px 10px",
              background: "rgba(201, 162, 39, 0.14)",
              borderBottom: "1px solid rgba(201, 162, 39, 0.35)",
              color: "#e8c96a",
              fontSize: TYPE.body,
              lineHeight: 1.35,
              ...PIXEL_TEXT,
            },
          },
          "Out of vision — last known data. Updates when they return.",
        )
      : null,
    e(
      "div",
      {
        style: {
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 12px",
            fontSize: TYPE.body,
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
        {},
        e(VitalsBar, {
          label: "HP",
          current: entity.hp || 0,
          max: entity.max_hp || 1,
          color: isPlayer ? accent : "#c33",
        }),
        e(VitalsBar, {
          label: "MP",
          current: entity.mp || 0,
          max: entity.max_mp || 1,
          color: "#3a5fd4",
        }),
      ),
      e(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 14px",
            padding: "8px",
            background: "#0d0d0d",
            border: "1px solid #2a2a2a",
          },
        },
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
      ),
      compare ? e(CompareToWatched, { entity, watching }) : null,
      entity.slots
        ? e(
            "div",
            {
              style: {
                borderTop: "1px solid #2a2a2a",
                paddingTop: "8px",
              },
            },
            e(
              "div",
              {
                style: {
                  fontSize: TYPE.body,
                  color: "#888",
                  marginBottom: "6px",
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
