import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { ControlBadge } from "./ControlBadge";
import { VitalsColumn } from "./VitalsColumn";
import type { EntityLike } from "../../host/globals";
import {
  controlBorderTint,
  getControlStates,
} from "../../lib/controlState";
import { AGGRO_BADGE, PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type ObservedUnitProps = {
  entity: EntityLike;
  hpColor?: string;
  fontSize?: string | number;
  trailing?: any;
  onSelect?: (id: string) => void;
  showEffects?: boolean;
  /** Compact EffectsRow (party-chip density). */
  effectsCompact?: boolean;
  /** Cap visible icons (+N overflow). 0 / omit with non-compact = unlimited. */
  effectsMaxVisible?: number;
  effectsIconSize?: number;
  /**
   * Paint EffectsRow absolutely under vitals so it does not grow unit chrome height.
   * Used by bc-anchored player/target frames so HP/MP stay put when buffs appear/clear.
   * Boss bars / party chips leave this off (in-flow growth is fine).
   */
  effectsOverlay?: boolean;
  showMp?: boolean;
  /** Mobs currently aggroed on the watched character (target-frame threat spark). */
  threatCount?: number;
  /**
   * Compact aggro text inside the HP bar (boss bars), between name and HP%.
   * Pass a full label like `Aggro · Tank`; omit to hide.
   */
  aggroLabel?: string;
  /** Highlight in-bar aggro when this unit is on the observer. */
  aggroHot?: boolean;
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
    effectsOverlay = false,
    showMp = true,
    threatCount = 0,
    aggroLabel,
    aggroHot = false,
  } = props;

  const controlStates = getControlStates(entity);
  const controlTint = controlBorderTint(controlStates);

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
        flex: "1 1 auto",
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

  const aggroChip =
    aggroLabel != null && aggroLabel !== ""
      ? e(
          "span",
          {
            className: "comm-boss-aggro",
            title: aggroHot ? "Aggro on you" : aggroLabel,
            style: {
              flex: "0 1 auto",
              minWidth: 0,
              maxWidth: "42%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "1px 6px",
              boxSizing: "border-box",
              background: aggroHot
                ? "rgba(138,30,30,0.85)"
                : "rgba(0,0,0,0.45)",
              border: aggroHot ? "1px solid #e05555" : "1px solid #555",
              color: aggroHot ? "#ffd0d0" : "#bbb",
              fontSize: TYPE.secondary,
              lineHeight: "1.2",
              ...PIXEL_TEXT,
            },
          },
          aggroLabel,
        )
      : null;

  const trailingEl =
    trailing != null
      ? e(
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
        )
      : null;

  const label =
    trailingEl || aggroChip
      ? e(
          "span",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              width: "100%",
              alignItems: "center",
              minWidth: 0,
            },
          },
          nameBlock,
          aggroChip,
          trailingEl,
        )
      : nameBlock;

  const effectsRow = showEffects
    ? e(EffectsRow, {
        key: `fx-${String(entity.id)}`,
        entity,
        compact: !!effectsCompact,
        maxVisible: effectsMaxVisible,
        iconSize: effectsIconSize,
      })
    : null;

  // Overlay keeps PositionedPanel height = vitals only (bc anchors stay put).
  // EffectsRow still collapses to null when empty — no reserved empty strip.
  const effectsSlot =
    effectsRow == null
      ? null
      : effectsOverlay
        ? e(
            "div",
            {
              className: "comm-fx-overlay",
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                top: "100%",
                width: "100%",
                boxSizing: "border-box",
                pointerEvents: "auto",
                zIndex: 1,
              },
            },
            effectsRow,
          )
        : effectsRow;

  const controlBadge = e(ControlBadge, {
    states: controlStates,
    compact: false,
    iconSize: 20,
  });

  return e(
    "div",
    {
      className:
        "comm-unit" +
        (effectsOverlay ? " has-fx-overlay" : "") +
        (controlStates.length ? " has-control" : ""),
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
        // Overlay row is out of flow; skip flex gap so vitals hug the panel edge.
        gap: effectsOverlay ? 0 : "6px",
        position: "relative",
        overflow: effectsOverlay ? "visible" : undefined,
        outline: controlTint ? `1px solid ${controlTint}` : undefined,
        outlineOffset: controlTint ? "1px" : undefined,
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
    controlBadge,
    effectsSlot,
  );
}
