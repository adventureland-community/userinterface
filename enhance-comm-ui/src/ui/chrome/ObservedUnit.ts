import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { VitalsColumn } from "./VitalsColumn";
import type { EntityLike } from "../../host/globals";
import { AGGRO_BADGE, PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type ObservedUnitProps = {
  entity: EntityLike;
  hpColor?: string;
  fontSize?: string | number;
  trailing?: any;
  onSelect?: (id: string) => void;
  showEffects?: boolean;
  /** Compact EffectsRow (party-chip density / +N overflow). */
  effectsCompact?: boolean;
  effectsMaxVisible?: number;
  effectsIconSize?: number;
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
    effectsCompact,
    effectsMaxVisible,
    effectsIconSize,
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
              minWidth: AGGRO_BADGE.minWidth,
              height: AGGRO_BADGE.height,
              padding: `0 ${AGGRO_BADGE.padX}`,
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#8a1e1e",
              border: "1px solid #e05555",
              color: "#ffd0d0",
              fontSize: AGGRO_BADGE.fontSize,
              lineHeight: 1,
              ...PIXEL_TEXT,
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
              fontSize: TYPE.nameLg,
              opacity: 0.95,
              flexShrink: 0,
              ...PIXEL_TEXT,
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
          compact: !!effectsCompact,
          maxVisible: effectsMaxVisible,
          iconSize: effectsIconSize,
        })
      : null,
  );
}
