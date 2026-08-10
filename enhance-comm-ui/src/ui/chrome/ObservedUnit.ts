import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { VitalsColumn } from "./VitalsColumn";
import type { EntityLike } from "../../host/globals";

export type ObservedUnitProps = {
  entity: EntityLike;
  hpColor?: string;
  fontSize?: string | number;
  trailing?: any;
  onSelect?: (id: string) => void;
  showEffects?: boolean;
  showMp?: boolean;
  /** Mobs currently aggroed on the watched character (target-frame threat spark). */
  threatCount?: number;
};

export function ObservedUnit(props: ObservedUnitProps): any {
  const {
    entity,
    hpColor,
    fontSize,
    trailing,
    onSelect,
    showEffects = true,
    showMp = true,
    threatCount = 0,
  } = props;

  const name =
    `${entity.level ?? 1} ${entity.name || entity.id}` +
    (entity.type === "monster" ? ` #${entity.id}` : "");

  const threatSpark =
    threatCount > 0
      ? e(
          "span",
          {
            className: "comm-threat-spark",
            title: `Threat: ${threatCount} mob${threatCount === 1 ? "" : "s"} on you`,
            style: {
              flexShrink: 0,
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#8a1e1e",
              border: "1px solid #e05555",
              color: "#ffd0d0",
              fontSize: "12px",
              lineHeight: 1,
              fontWeight: "normal",
              textShadow: "none",
            },
          },
          String(threatCount),
        )
      : null;

  const nameBlock = e(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        minWidth: 0,
        overflow: "hidden",
      },
    },
    threatSpark,
    e(
      "span",
      {
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        },
      },
      name,
    ),
  );

  const label = trailing
    ? e(
        "span",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            width: "100%",
            alignItems: "center",
          },
        },
        nameBlock,
        e(
          "span",
          {
            style: {
              fontSize: "17px",
              opacity: 0.95,
              flexShrink: 0,
              fontWeight: "normal",
            },
          },
          trailing,
        ),
      )
    : nameBlock;

  return e(
    "div",
    {
      className: "comm-unit",
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
        gap: "6px",
      },
    },
    e(
      VitalsColumn,
      {
        hp: entity.hp || 0,
        maxHp: entity.max_hp || 1,
        mp: entity.mp,
        maxMp: entity.max_mp,
        hpColor,
        showMp,
        nameStyle: {
          fontSize: fontSize != null ? fontSize : "21px",
          fontWeight: "normal",
        },
        onClick: onSelect ? () => onSelect(entity.id) : undefined,
      },
      label,
    ),
    showEffects
      ? e(EffectsRow, {
          key: `fx-${String(entity.id)}`,
          entity,
        })
      : null,
  );
}
