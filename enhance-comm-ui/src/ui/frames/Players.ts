import { e } from "../../host/react";
import { classColors } from "../../lib/colors";
import { getPercent } from "../../lib/format";
import { partyGroups } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { setXTarget } from "../../host/icons";

export type PlayersProps = {
  entities: EntityLike[];
  setSelectedEntity: (id: string) => void;
};

export function Players(props: PlayersProps): any {
  const parties = partyGroups(props.entities);

  return e(
    "div",
    {
      style: {
        padding: "4px",
        display: "flex",
        gap: "4px",
        flexDirection: "column",
      },
    },
    ...parties.map((party) =>
      e(
        "div",
        {
          key: party[0],
          style: {
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
          },
        },
        e(
          "div",
          { style: { flex: "0 0 100%" } },
          e(
            "span",
            { style: { color: "white", padding: "4px", background: "black" } },
            party[0] || "(no party)",
          ),
        ),
        ...party[1].map((player) =>
          e(
            "div",
            {
              key: player.id,
              className: "player",
              style: {
                display: "flex",
                width: "120px",
                background: "black",
                flexDirection: "column",
              },
            },
            e(
              "div",
              { style: { position: "relative" } },
              e("div", {
                style: {
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: getPercent(
                    (player.hp || 0) / (player.max_hp || 1),
                    1,
                  ),
                  background: classColors[player.ctype || ""] || "#666",
                },
              }),
              e(
                "div",
                {
                  style: {
                    padding: "2px",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    position: "relative",
                    textShadow: "0 0 2px black",
                    cursor: "pointer",
                  },
                  onClick: () => {
                    setXTarget(player);
                    props.setSelectedEntity(player.id);
                  },
                },
                `${player.level} ${player.id}`,
              ),
            ),
            e("div", {
              style: {
                background: "blue",
                height: "4px",
                width: getPercent(
                  (player.mp || 0) / (player.max_mp || 1),
                  1,
                ),
              },
            }),
          ),
        ),
      ),
    ),
  );
}
