import { e } from "../../host/react";
import { getALServerTime } from "../../lib/format";
import type { ServerInfoLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { GameIcon } from "../chrome/GameIcon";
import {
  listServerEventChips,
  listServerSeasonChips,
  readServerBlessing,
} from "./serverInfoModel";
import { openServerChip } from "./serverInfoOpen";

export type ServerInfoProps = {
  S?: ServerInfoLike;
  serverRegion?: string;
  serverIdentifier?: string;
};

const chipStyle: Record<string, any> = {
  background: "rgba(0, 0, 0, 0.82)",
  border: "1px solid #555",
  padding: "4px 8px",
  fontSize: TYPE.chrome,
  lineHeight: 1.25,
  color: "#eee",
  whiteSpace: "nowrap",
  // Idle PositionedPanel shells are pointer-events:none; chips must opt in.
  pointerEvents: "auto",
  ...PIXEL_TEXT,
};

const clickableChipStyle: Record<string, any> = {
  ...chipStyle,
  cursor: "pointer",
  textAlign: "left",
  font: "inherit",
};

/** Compact observe-hud status chips for server clock + live/upcoming events. */
export function ServerInfo(props: ServerInfoProps): any {
  const timeOffset = props.S?.schedule?.time_offset ?? 0;
  const night = !!props.S?.schedule?.night;
  const events = listServerEventChips(props.S);
  const seasons = listServerSeasonChips(props.S);
  const blessing = readServerBlessing(props.S);

  const region = props.serverRegion ?? "";
  const ident = props.serverIdentifier ?? "";
  const serverLabel = `${region} ${ident}`.trim() || "—";

  return e(
    "div",
    {
      key: "content",
      className: "ecu-server-info",
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        justifyContent: "center",
        alignItems: "stretch",
        pointerEvents: "auto",
      },
    },
    e(
      "button",
      {
        type: "button",
        title: "Open Events schedule",
        onClick: () => openServerChip("clock"),
        style: clickableChipStyle,
      },
      e(
        "div",
        {
          style: {
            fontSize: TYPE.chromeMeta,
            color: "#f2f2f2",
            letterSpacing: "0.02em",
          },
        },
        serverLabel,
      ),
      e(
        "div",
        {
          style: {
            fontSize: TYPE.chromeMeta,
            color: "#85c76b",
            fontVariantNumeric: "tabular-nums",
          },
        },
        getALServerTime(timeOffset) + (night ? " night" : " day"),
      ),
    ),
    blessing
      ? e(
          "button",
          {
            key: "blessing",
            type: "button",
            title: `Server blessed by ${blessing.by} · click for guide`,
            onClick: () => openServerChip("blessing"),
            style: {
              ...clickableChipStyle,
              borderColor: "#8F70D8",
            },
          },
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: "#cbb6f0",
              },
            },
            `Blessed · ${blessing.by}`,
          ),
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: "#8F70D8",
                fontVariantNumeric: "tabular-nums",
              },
            },
            blessing.remainLabel,
          ),
        )
      : null,
    ...seasons.map((season) => {
      const accent = season.accent || "#F0B742";
      return e(
        "button",
        {
          key: "season-" + season.id,
          type: "button",
          title: season.title + " · click for guide",
          onClick: () => openServerChip(season.id),
          style: {
            ...clickableChipStyle,
            borderColor: season.live ? "#9ACA87" : accent,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          },
        },
        season.sprite
          ? e(GameIcon, {
              id: season.sprite,
              kind: "item",
              size: 22,
              title: season.label,
            })
          : null,
        e(
          "div",
          null,
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: season.live ? "#b6e3a4" : accent,
              },
            },
            season.label,
          ),
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: season.live ? "#9ACA87" : "rgba(255,255,255,0.72)",
                maxWidth: "260px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },
            season.detail,
          ),
        ),
      );
    }),
    ...events.map((event) => {
      return e(
        "button",
        {
          key: event.id,
          type: "button",
          title: event.title + " · click for info",
          onClick: () => openServerChip(event.id),
          style: {
            ...clickableChipStyle,
            borderColor: event.live ? "#85c76b" : "#555",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.chromeMeta,
              color: event.live ? "#b6e3a4" : "#eee",
            },
          },
          event.label,
        ),
        e(
          "div",
          {
            style: {
              fontSize: TYPE.chromeMeta,
              color: event.live ? "#85c76b" : "rgba(255,255,255,0.55)",
              fontVariantNumeric: "tabular-nums",
            },
          },
          event.detail,
        ),
      );
    }),
  );
}
