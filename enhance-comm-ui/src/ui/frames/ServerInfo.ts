import { e } from "../../host/react";
import { getALServerTime, getTimeUntil } from "../../lib/format";
import type { ServerInfoLike } from "../../host/globals";

export type ServerInfoProps = {
  S?: ServerInfoLike;
  serverRegion?: string;
  serverIdentifier?: string;
};

const chipStyle: Record<string, any> = {
  background: "rgba(0, 0, 0, 0.82)",
  border: "1px solid #555",
  padding: "4px 8px",
  fontSize: "14px",
  lineHeight: 1.25,
  color: "#eee",
  whiteSpace: "nowrap",
};

/** Compact observe-hud status chips for server clock + live/upcoming events. */
export function ServerInfo(props: ServerInfoProps): any {
  const timeOffset = props.S?.schedule?.time_offset ?? 0;
  const night = !!props.S?.schedule?.night;
  const events = Object.entries(props.S ?? {}).filter(
    (entry) => entry[0] !== "schedule",
  );

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
            fontSize: "13px",
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
            fontSize: "12px",
            color: "#85c76b",
            fontVariantNumeric: "tabular-nums",
          },
        },
        getALServerTime(timeOffset) + (night ? " night" : " day"),
      ),
    ),
    ...events.map((event) => {
      const live = !!event[1]?.live;
      const until = event[1]?.event ? getTimeUntil(event[1].event) : "";
      return e(
        "div",
        {
          key: event[0],
          style: {
            ...chipStyle,
            borderColor: live ? "#85c76b" : "#555",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: "13px",
              color: live ? "#b6e3a4" : "#eee",
            },
          },
          event[0],
        ),
        e(
          "div",
          {
            style: {
              fontSize: "12px",
              color: live ? "#85c76b" : "rgba(255,255,255,0.55)",
              fontVariantNumeric: "tabular-nums",
            },
          },
          live ? "live" : until,
        ),
      );
    }),
  );
}
