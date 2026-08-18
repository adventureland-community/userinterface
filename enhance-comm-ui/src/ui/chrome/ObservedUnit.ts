import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { NameWithControl } from "./NameWithControl";
import { AggroSpark } from "./AggroSpark";
import { VitalsColumn } from "./VitalsColumn";
import type { EntityLike } from "../../host/globals";
import { controlBorderTint, getControlStates } from "../../lib/controlState";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import type { HpThresholdMark } from "../../instance/monsterSpawns";

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
  /**
   * Compact aggro text inside the HP bar (boss bars), between name and HP%.
   * Pass a full label like `Aggro · Tank`; omit to hide.
   */
  aggroLabel?: string;
  /** Highlight in-bar aggro when this boss is on the player-frame entity. */
  aggroHot?: boolean;
  /**
   * Monsters targeting **this** entity (the one in `entity`).
   * Caller must pass aggro for `entity.id` only — never another unit's list.
   * Drives fear simulation and the numeric aggro spark.
   */
  aggroMobs?: EntityLike[];
  /** HP-threshold spawn marks from G.monsters (boss bars). */
  hpThresholdMarks?: HpThresholdMark[];
  /** Optional row under vitals/effects (mechanic chips). */
  footer?: any;
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
    aggroLabel,
    aggroHot = false,
    aggroMobs = [],
    hpThresholdMarks,
    footer,
  } = props;

  const controlStates = getControlStates(entity, aggroMobs);
  const controlTint = controlBorderTint(controlStates);
  const aggroCount = aggroMobs.length;

  const name =
    `${entity.level ?? 1} ${entity.name || entity.id}` +
    (entity.type === "monster" ? ` #${entity.id}` : "");

  const nameCluster = e(NameWithControl, {
    name,
    states: controlStates,
    compact: false,
    // Keep fear/CC icons inside the fixed HP track so overlay buff timers
    // do not jump under neighboring panels when control appears.
    iconSize: 16,
  });

  const aggroChip =
    aggroLabel != null && aggroLabel !== ""
      ? e(
          "span",
          {
            className: "comm-boss-aggro",
            title: aggroHot ? "Aggro on player-frame unit" : aggroLabel,
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

  const label = e(
    "span",
    {
      style: {
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: "8px",
        minWidth: 0,
      },
    },
    nameCluster,
    trailingEl || aggroChip
      ? e("span", { style: { flex: "1 1 auto", minWidth: 0 } })
      : null,
    aggroChip,
    trailingEl,
  );

  const effectsRow = showEffects
    ? e(EffectsRow, {
        key: `fx-${String(entity.id)}`,
        entity,
        compact: !!effectsCompact,
        maxVisible: effectsMaxVisible,
        iconSize: effectsIconSize,
      })
    : null;

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

  return e(
    "div",
    {
      className:
        "comm-unit" +
        (effectsOverlay ? " has-fx-overlay" : "") +
        (controlStates.length ? " has-control" : "") +
        (aggroCount > 0 ? " has-aggro" : ""),
      "data-ecu-entity": entity.id != null ? String(entity.id) : "",
      "data-ecu-aggro": String(aggroCount),
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
        gap: effectsOverlay ? 0 : "6px",
        position: "relative",
        overflow: "visible",
        outline: controlTint ? `1px solid ${controlTint}` : undefined,
        outlineOffset: controlTint ? "1px" : undefined,
      },
    },
    e(AggroSpark, { count: aggroCount }),
    e(
      VitalsColumn,
      {
        hp: entity.hp || 0,
        maxHp: entity.max_hp || 1,
        mp: entity.mp,
        maxMp: entity.max_mp,
        hpColor,
        showMp,
        hpThresholdMarks,
        nameStyle: {
          fontSize: fontSize != null ? fontSize : "21px",
          fontWeight: "normal",
        },
        onClick: onSelect ? () => onSelect(entity.id) : undefined,
      },
      label,
    ),
    effectsSlot,
    footer || null,
  );
}
