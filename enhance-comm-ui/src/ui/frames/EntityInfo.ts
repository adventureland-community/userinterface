import { e } from "../../host/react";
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

export type EntityInfoProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  onClose?: () => void;
  /** When true and nothing is selected, show a layout placeholder. */
  layoutEdit?: boolean;
  /** Watched character — used for “compare to watched” delta stats. */
  observing?: EntityLike | null;
};

export function EntityInfo(props: EntityInfoProps): any {
  const entity = findEntity(props.entities, props.selectedEntity);
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
      className: "comm-paperdoll",
      style: Object.assign({}, PAPERDOLL_SHELL, {
        border: `2px solid ${accent}`,
      }),
      onClick: (ev: any) => {
        ev.stopPropagation();
        setXTarget(entity);
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
          background: accent,
          flexShrink: 0,
        },
      }),
      e(
        "div",
        {
          style: {
            flex: 1,
            minWidth: 0,
            fontSize: "17px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "none",
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
          },
        },
        "×",
      ),
    ),
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
            fontSize: "14px",
            color: "#bdbdbd",
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
                  fontSize: "14px",
                  color: "#888",
                  marginBottom: "6px",
                  letterSpacing: "0.04em",
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
