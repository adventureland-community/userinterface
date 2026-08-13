import { getReact, e } from "../../host/react";
import { classColors } from "../../lib/colors";
import {
  aggroByTarget,
  partyGroups,
  playersList,
} from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { setXTarget } from "../../host/icons";
import { ControlBadge } from "../chrome/ControlBadge";
import { EffectsRow } from "../chrome/EffectsRow";
import { SharedPartyEffects } from "../chrome/SharedPartyEffects";
import { controlBorderTint, getControlStates } from "../../lib/controlState";
import {
  getSettings,
  patchSettings,
  type PartyBuffMode,
} from "../../lib/settings";
import {
  nextPartyBuffMode,
  partyBuffModeLabel,
  partyBuffModeTitle,
  showUnderChipBuffs,
  underChipBuffMaxVisible,
} from "../../lib/partyBuffMode";
import { isActuallyDead } from "../../lib/stickyPresence";
import { AGGRO_BADGE, PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type PlayersProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string | undefined) => void;
  selectedEntity?: string;
  /** Watched /comm character id — pink observe chrome, not paperdoll select. */
  observingId?: string;
  /** Watched entity (fear overlay on observed chip, etc.). */
  observing?: EntityLike | null;
  /**
   * Layout-edit marker on the roster root (panel chrome owns lock/WC above).
   */
  layoutEdit?: boolean;
};

function hpPct(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.hp || 0) / max) * 100)));
}

function mpPct(entity: EntityLike): number {
  const max = entity.max_mp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.mp || 0) / max) * 100)));
}

/** Soft dim for RIP only — no attack-range dimming (skill ranges differ). */
function chipOpacity(dead: boolean): number {
  if (dead) return 0.42;
  return 1;
}

/** observe-hud style party chips: name inside HP bar, thin MP underlay, effects + aggro. */
export function Players(props: PlayersProps): any {
  const React = getReact();
  const [buffMode, setBuffMode] = React.useState(
    () => (getSettings().partyBuffMode || "auto") as PartyBuffMode,
  );

  const parties = partyGroups(props.entities);
  const byTarget = aggroByTarget(props.entities);
  const observing = props.observing;
  const visibleChipCount = playersList(props.entities).length;
  const sharedMode = buffMode === "shared";

  const cycleBuffMode = () => {
    const next = nextPartyBuffMode(buffMode);
    setBuffMode(patchSettings({ partyBuffMode: next }).partyBuffMode);
  };

  /** Gold chrome chip — same family as PositionedPanel lock / WC. */
  const buffsButton = e(
    "button",
    {
      type: "button",
      className: "ecu-roster-buffs",
      title: partyBuffModeTitle(buffMode),
      "aria-label": `Party buffs mode: ${partyBuffModeLabel(buffMode)}. Click to cycle.`,
      onClick: cycleBuffMode,
      style: {
        fontSize: TYPE.micro,
        ...PIXEL_TEXT,
      },
    },
    e("span", { className: "ecu-roster-buffs-k" }, "Buffs"),
    e("span", { className: "ecu-roster-buffs-sep" }, "·"),
    e(
      "span",
      { className: "ecu-roster-buffs-v" },
      partyBuffModeLabel(buffMode),
    ),
  );

  return e(
    "div",
    {
      className: "ecu-roster" + (props.layoutEdit ? " is-layout-edit" : ""),
      style: {
        padding: "4px",
        display: "flex",
        gap: "6px",
        flexDirection: "column",
        maxWidth: "min(560px, 78vw)",
        position: "relative",
      },
    },
    !parties.length
      ? e(
          "div",
          {
            className: "ecu-roster-header",
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "2px",
            },
          },
          e(
            "div",
            {
              style: {
                color: "#aaa",
                fontSize: TYPE.secondary,
                ...PIXEL_TEXT,
              },
            },
            "No parties in vision",
          ),
        )
      : null,
    ...parties.map((party, partyIdx) =>
      e(
        "div",
        {
          key: party[0] || "solo",
          className: "ecu-roster-party",
          style: { marginBottom: "2px" },
        },
        e(
          "div",
          {
            className: "ecu-roster-party-hd",
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
              flexWrap: "wrap",
            },
          },
          e(
            "div",
            {
              className: "ecu-roster-party-name",
              style: {
                fontSize: TYPE.secondary,
                color: "#ccc",
                background: "rgba(0,0,0,0.55)",
                display: "inline-block",
                padding: "2px 6px",
                ...PIXEL_TEXT,
              },
            },
            party[0] || "(no party)",
          ),
          // Mode is global — only on the first party header so it sits with roster chrome.
          partyIdx === 0 ? buffsButton : null,
        ),
        sharedMode
          ? e(SharedPartyEffects, {
              key: `shared-${party[0] || "solo"}`,
              members: party[1],
              iconSize: 22,
              maxVisible: 8,
            })
          : null,
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              // flex-start: chips without EffectsRow must not stretch to match buffs.
              alignItems: "flex-start",
              gap: "5px",
            },
          },
          ...party[1].map((player) => {
            const pid = String(player.id);
            const selected =
              props.selectedEntity != null &&
              String(props.selectedEntity) === pid;
            const observed =
              props.observingId != null && String(props.observingId) === pid;
            const aggroMobs = byTarget[pid] || byTarget[player.id] || [];
            const hasAggro = aggroMobs.length > 0;
            const color = classColors[player.ctype || ""] || "#888";
            const dead = isActuallyDead(player);
            const aggroTitle = hasAggro
              ? `Aggro: ${aggroMobs.length} mob${aggroMobs.length === 1 ? "" : "s"}`
              : "";
            const controlEntity =
              observed && observing && typeof observing.fear === "number"
                ? { ...player, fear: observing.fear }
                : player;
            const controlStates = getControlStates(controlEntity);
            const controlTint = controlBorderTint(controlStates);
            const controlTitle = controlStates
              .map((s) =>
                s.kind === "fear" ? `${s.label} (fear ${s.fear})` : s.label,
              )
              .join(" · ");
            const nameTitle = [
              `${player.name || player.id}`,
              observed ? "Observing" : "",
              dead ? "Dead" : "",
              controlTitle,
              aggroTitle,
            ]
              .filter(Boolean)
              .join(" · ");

            let outline: string | undefined;
            if (hasAggro) outline = "1px solid #e05555";
            else if (controlTint) outline = `1px solid ${controlTint}`;
            else if (observed) outline = "1px solid #e13758";
            else if (selected) outline = "1px solid #fff";

            const showBuffs = showUnderChipBuffs(
              buffMode,
              visibleChipCount,
              observed,
            );
            const maxVisible = underChipBuffMaxVisible(buffMode);

            return e(
              "div",
              {
                key: pid,
                className:
                  "ecu-chip" +
                  (selected ? " is-selected" : "") +
                  (observed ? " is-observed" : "") +
                  (hasAggro ? " has-aggro" : "") +
                  (controlStates.length ? " has-control" : "") +
                  (dead ? " is-rip" : ""),
                title: nameTitle,
                style: {
                  position: "relative",
                  flex: "0 0 auto",
                  width: "168px",
                  background: "transparent",
                  cursor: "pointer",
                  overflow: "visible",
                  boxSizing: "border-box",
                  opacity: chipOpacity(dead),
                },
                onClick: () => {
                  if (selected) {
                    setXTarget(null);
                    props.setSelectedEntity(undefined);
                    return;
                  }
                  setXTarget(player);
                  props.setSelectedEntity(player.id);
                },
              },
              e(ControlBadge, {
                states: controlStates,
                compact: true,
                iconSize: 16,
              }),
              e(
                "div",
                {
                  style: {
                    position: "relative",
                    height: "26px",
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.45)",
                    outline,
                    boxShadow: hasAggro
                      ? "inset 0 0 0 1px rgba(224,85,85,0.55)"
                      : observed
                        ? "inset 0 -2px 0 #e13758"
                        : undefined,
                  },
                },
                e("div", {
                  style: {
                    display: "block",
                    height: "100%",
                    width: `${hpPct(player)}%`,
                    background: color,
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
                      padding: "0 7px",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      fontSize: TYPE.name,
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                      color: "#fff",
                      pointerEvents: "none",
                      ...PIXEL_TEXT,
                    },
                  },
                  `${player.level ?? ""} ${player.id}`,
                ),
              ),
              hasAggro
                ? e(
                    "div",
                    {
                      className: "ecu-chip-aggro",
                      title: aggroTitle,
                      style: {
                        position: "absolute",
                        top: "-3px",
                        right: "-3px",
                        zIndex: 2,
                        minWidth: AGGRO_BADGE.minWidth,
                        height: AGGRO_BADGE.height,
                        padding: `0 ${AGGRO_BADGE.padX}`,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#8a1e1e",
                        border: "1px solid #e05555",
                        color: "#ffd0d0",
                        fontSize: AGGRO_BADGE.fontSize,
                        lineHeight: 1,
                        ...PIXEL_TEXT,
                        pointerEvents: "none",
                      },
                    },
                    String(aggroMobs.length),
                  )
                : null,
              e(
                "div",
                {
                  style: {
                    marginTop: "2px",
                    height: "5px",
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.45)",
                  },
                },
                e("div", {
                  style: {
                    display: "block",
                    height: "100%",
                    width: `${mpPct(player)}%`,
                    background: "#3a6fd8",
                  },
                }),
              ),
              showBuffs
                ? e(EffectsRow, {
                    key: `fx-${pid}`,
                    entity: player,
                    iconSize: 22,
                    compact: true,
                    maxVisible,
                  })
                : null,
            );
          }),
        ),
      ),
    ),
  );
}
