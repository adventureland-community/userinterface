import { e } from "../../host/react";
import { classColors } from "../../lib/colors";
import { outOfRange } from "../../geometry/combat";
import { aggroByTarget, partyGroups } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { setXTarget } from "../../host/icons";
import { EffectsRow } from "../chrome/EffectsRow";

export type PlayersProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string | undefined) => void;
  selectedEntity?: string;
  /** Watched /comm character id — pink observe chrome, not paperdoll select. */
  observingId?: string;
  /** Watched entity for out-of-range dimming. */
  observing?: EntityLike | null;
};

function hpPct(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.hp || 0) / max) * 100)));
}

function mpPct(entity: EntityLike): number {
  const max = entity.max_mp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.mp || 0) / max) * 100)));
}

/** Soft dim without wiping HP/MP meter fills. */
function chipOpacity(dead: boolean, oor: boolean): number {
  if (dead) return 0.42;
  if (oor) return 0.62;
  return 1;
}

/** observe-hud style party chips: name inside HP bar, thin MP underlay, effects + aggro. */
export function Players(props: PlayersProps): any {
  const parties = partyGroups(props.entities);
  const byTarget = aggroByTarget(props.entities);
  const observing = props.observing;

  return e(
    "div",
    {
      className: "ecu-roster",
      style: {
        padding: "4px",
        display: "flex",
        gap: "6px",
        flexDirection: "column",
        maxWidth: "min(560px, 78vw)",
      },
    },
    parties.length
      ? null
      : e(
          "div",
          {
            style: {
              color: "#aaa",
              padding: "4px 2px",
              fontSize: "14px",
            },
          },
          "No parties in vision",
        ),
    ...parties.map((party) =>
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
            style: {
              fontSize: "12px",
              color: "#ccc",
              background: "rgba(0,0,0,0.55)",
              display: "inline-block",
              padding: "2px 6px",
              marginBottom: "4px",
            },
          },
          party[0] || "(no party)",
        ),
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "stretch",
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
            const dead = !!player.dead;
            const oor =
              !dead &&
              !observed &&
              !!observing &&
              outOfRange(observing, player) === true;
            const aggroTitle = hasAggro
              ? `Aggro: ${aggroMobs.length} mob${aggroMobs.length === 1 ? "" : "s"}`
              : "";
            const nameTitle = [
              `${player.name || player.id}`,
              observed ? "Observing" : "",
              oor ? "Out of range" : "",
              dead ? "Dead" : "",
              aggroTitle,
            ]
              .filter(Boolean)
              .join(" · ");

            let outline: string | undefined;
            if (hasAggro) outline = "1px solid #e05555";
            else if (observed) outline = "1px solid #e13758";
            else if (selected) outline = "1px solid #fff";

            return e(
              "div",
              {
                key: player.id,
                className:
                  "ecu-chip" +
                  (selected ? " is-selected" : "") +
                  (observed ? " is-observed" : "") +
                  (hasAggro ? " has-aggro" : "") +
                  (dead ? " is-rip" : "") +
                  (oor ? " is-oor" : ""),
                title: nameTitle,
                style: {
                  position: "relative",
                  flex: "0 0 auto",
                  width: "168px",
                  background: "transparent",
                  cursor: "pointer",
                  overflow: "visible",
                  boxSizing: "border-box",
                  opacity: chipOpacity(dead, oor),
                },
                onClick: () => {
                  // Toggle paperdoll clear when clicking the same chip again.
                  if (selected) {
                    setXTarget(null);
                    props.setSelectedEntity(undefined);
                    return;
                  }
                  setXTarget(player);
                  props.setSelectedEntity(player.id);
                },
              },
              e(
                "div",
                {
                  style: {
                    position: "relative",
                    height: "22px",
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
                      right: hasAggro ? 18 : 0,
                      top: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 7px",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      fontSize: "15px",
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                      color: "#fff",
                      pointerEvents: "none",
                      fontWeight: "normal",
                      textShadow: "none",
                    },
                  },
                  `${player.level ?? ""} ${player.id}`,
                ),
                hasAggro
                  ? e(
                      "div",
                      {
                        className: "ecu-chip-aggro",
                        title: aggroTitle,
                        style: {
                          position: "absolute",
                          top: 2,
                          right: 2,
                          minWidth: "14px",
                          height: "14px",
                          padding: "0 3px",
                          boxSizing: "border-box",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#8a1e1e",
                          border: "1px solid #e05555",
                          color: "#ffd0d0",
                          fontSize: "11px",
                          lineHeight: 1,
                          fontWeight: "normal",
                          textShadow: "none",
                          pointerEvents: "none",
                        },
                      },
                      String(aggroMobs.length),
                    )
                  : null,
              ),
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
              e(EffectsRow, {
                key: `fx-${pid}`,
                entity: player,
                iconSize: 22,
                compact: true,
                maxVisible: 4,
              }),
            );
          }),
        ),
      ),
    ),
  );
}
