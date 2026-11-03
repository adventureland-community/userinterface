import { e } from "../../host/react";
import { EffectsRow } from "./EffectsRow";
import { NameWithControl } from "./NameWithControl";
import { AggroSpark } from "./AggroSpark";
import { InspectButton } from "./InspectButton";
import { VitalsColumn } from "./VitalsColumn";
import { isCooltipHovering } from "./cooltip";
import {
  unitCooltipHandlers,
  unitCooltipHtml,
  unitCooltipKey,
} from "./unitCooltip";
import type { EntityLike } from "../../host/globals";
import { controlBorderTint, getControlStates } from "../../lib/controlState";
import { isActuallyDead } from "../../lib/stickyPresence";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import type { HpThresholdMark } from "../../instance/monsterSpawns";

export type ObservedUnitProps = {
  entity: EntityLike;
  hpColor?: string;
  fontSize?: string | number;
  trailing?: any;
  /**
   * Boss bars: label just after the name/id (e.g. TTK), before the flex
   * spacer that pushes buffs / aggro / HP% to the right edge.
   */
  midLabel?: string | null;
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
  /**
   * Boss bars: keep EffectsRow / aggro / HP% inside the HP track (right side),
   * buffs left of aggro growing into the spacer — fixed bar width, no outer
   * meta strip that shrinks/grows the stack. Ignored when `effectsOverlay` is on.
   */
  effectsBeside?: boolean;
  showMp?: boolean;
  /**
   * Compact aggro text (boss bars). With `effectsBeside`, sits inside the HP
   * bar to the right of buffs; otherwise between name and HP%.
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
  /** Hide `{}` inspect (stock unit frames always show it). */
  hideInspect?: boolean;
};

export function ObservedUnit(props: ObservedUnitProps): any {
  const {
    entity,
    hpColor,
    fontSize,
    trailing,
    midLabel,
    onSelect,
    showEffects = true,
    effectsCompact,
    effectsMaxVisible,
    effectsIconSize,
    effectsOverlay = false,
    effectsBeside = false,
    showMp = true,
    aggroLabel,
    aggroHot = false,
    aggroMobs = [],
    hpThresholdMarks,
    footer,
    hideInspect = false,
  } = props;
  // In-bar right meta (buffs → aggro → %) — not an outer flex sibling.
  const inBarMeta = effectsBeside && !effectsOverlay;

  const controlStates = getControlStates(entity, aggroMobs);
  const controlTint = controlBorderTint(controlStates);
  const aggroCount = aggroMobs.length;
  const dead = isActuallyDead(entity);
  const tipKey = unitCooltipKey(String(entity.id));
  const tipHandlers = unitCooltipHandlers(tipKey, () =>
    unitCooltipHtml({
      entity,
      dead,
      controlStates,
      aggroCount,
    }),
  );

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
    entity,
    aggroMobs,
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
              maxWidth: inBarMeta ? "8em" : "42%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: inBarMeta ? "0" : "1px 6px",
              boxSizing: "border-box",
              background: inBarMeta
                ? "transparent"
                : aggroHot
                  ? "rgba(138,30,30,0.85)"
                  : "rgba(0,0,0,0.45)",
              border: inBarMeta
                ? "none"
                : aggroHot
                  ? "1px solid #e05555"
                  : "1px solid #555",
              color: aggroHot ? "#ffd0d0" : "#bbb",
              fontSize: inBarMeta ? TYPE.body : TYPE.secondary,
              lineHeight: "1.2",
              textShadow: inBarMeta ? "1px 1px 0 #000" : undefined,
              ...PIXEL_TEXT,
            },
          },
          aggroLabel,
        )
      : null;

  const midEl =
    midLabel != null && midLabel !== ""
      ? e(
          "span",
          {
            className: "comm-boss-mid",
            style: {
              flex: "0 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: TYPE.body,
              opacity: 0.9,
              ...PIXEL_TEXT,
            },
          },
          midLabel,
        )
      : null;

  const trailingEl =
    trailing != null
      ? e(
          "span",
          {
            className: "comm-boss-pct",
            style: {
              fontSize: TYPE.nameLg,
              opacity: 0.95,
              flexShrink: 0,
              marginLeft: "auto",
              ...PIXEL_TEXT,
            },
          },
          trailing,
        )
      : null;

  const effectsRow = showEffects
    ? e(EffectsRow, {
        key: `fx-${String(entity.id)}`,
        entity,
        compact: !!effectsCompact || inBarMeta,
        inline: inBarMeta,
        maxVisible: effectsMaxVisible,
        iconSize: effectsIconSize,
      })
    : null;

  const hasRightMeta = !!(
    aggroChip ||
    trailingEl ||
    (inBarMeta && effectsRow)
  );

  const label = e(
    "span",
    {
      style: {
        display: "flex",
        width: "100%",
        alignItems: "center",
        // Keep `{}` tight to the level/name — gap + button margin used to read as a hole.
        gap: inBarMeta ? "6px" : "4px",
        minWidth: 0,
      },
    },
    hideInspect
      ? null
      : e(InspectButton, { entity, compact: inBarMeta }),
    nameCluster,
    // TTK (or other mid label) sits just right of the name/id.
    inBarMeta ? midEl : null,
    hasRightMeta || midEl
      ? e("span", { style: { flex: "1 1 auto", minWidth: 4 } })
      : null,
    // Right edge: buffs → aggro → HP% (flush right via trailing marginLeft auto).
    inBarMeta ? effectsRow : null,
    aggroChip,
    !inBarMeta ? midEl : null,
    trailingEl,
  );

  const effectsSlot =
    effectsRow == null || inBarMeta
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
                pointerEvents: "none",
                zIndex: 1,
              },
            },
            effectsRow,
          )
        : effectsRow;

  const vitals = e(
    "div",
    {
      className: "comm-unit-vitals",
      onMouseEnter: tipHandlers.onMouseEnter,
      onMouseMove: (ev: MouseEvent) => {
        const t = ev.target as Element | null;
        // Phase marks own the Comm cooltip; don't reclaim while over one.
        if (
          t &&
          typeof (t as any).closest === "function" &&
          (t as any).closest(".comm-hp-threshold")
        ) {
          return;
        }
        // After leaving a phase mark, tip is cleared — reopen unit tip.
        if (!isCooltipHovering(tipKey)) {
          tipHandlers.onMouseEnter(ev);
          return;
        }
        tipHandlers.onMouseMove(ev);
      },
      onMouseLeave: tipHandlers.onMouseLeave,
      style: {
        width: "100%",
        minWidth: 0,
        pointerEvents: "auto",
      },
    },
    e(
      VitalsColumn,
      {
        entityId: entity.id,
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
          // Boss in-bar meta sits flush to the track edge — drop stock 10px pad.
          ...(inBarMeta ? { padding: "0 4px 0 8px" } : null),
        },
        onClick: onSelect ? () => onSelect(entity.id) : undefined,
      },
      label,
    ),
  );

  return e(
    "div",
    {
      className:
        "comm-unit" +
        (effectsOverlay ? " has-fx-overlay" : "") +
        (inBarMeta ? " has-fx-inbar" : "") +
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
        pointerEvents: "none",
        outline: controlTint ? `1px solid ${controlTint}` : undefined,
        outlineOffset: controlTint ? "1px" : undefined,
      },
    },
    e(AggroSpark, {
      count: aggroCount,
      mobs: aggroMobs,
      owner: entity,
      ownerId: String(entity.id),
      ownerName: String(entity.name || entity.id),
    }),
    vitals,
    effectsSlot,
    footer || null,
  );
}
