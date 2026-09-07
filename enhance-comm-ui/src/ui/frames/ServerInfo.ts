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
  ...PIXEL_TEXT,
};

function openSeasonGuide(modal: string | undefined, docsUrl: string): void {
  const openGuide = (window as any).open_guide;
  if (typeof openGuide === "function") {
    openGuide(modal || docsUrl.replace(/^\/docs\/ref\//, "event-"), docsUrl);
    return;
  }
  try {
    window.open(docsUrl, "_blank", "noopener,noreferrer");
  } catch {
    /* ignore */
  }
}

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
      },
    },
    e(
      "div",
      { style: chipStyle },
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
          "div",
          {
            key: "blessing",
            title: `Server blessed by ${blessing.by}`,
            style: {
              ...chipStyle,
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
          onClick: () => openSeasonGuide(season.modal, season.docsUrl),
          style: {
            ...chipStyle,
            borderColor: accent,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textAlign: "left",
            font: "inherit",
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
                color: accent,
              },
            },
            season.label,
          ),
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: "rgba(255,255,255,0.72)",
                maxWidth: "220px",
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
        "div",
        {
          key: event.id,
          title: event.title,
          style: {
            ...chipStyle,
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
