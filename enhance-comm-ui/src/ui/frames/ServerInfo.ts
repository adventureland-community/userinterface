import { e } from "../../host/react";
import { getALServerTime, getTimeUntil } from "../../lib/format";
import type { ServerInfoLike } from "../../host/globals";

export type ServerInfoProps = {
  S?: ServerInfoLike;
  serverRegion?: string;
  serverIdentifier?: string;
};

export function ServerInfo(props: ServerInfoProps): any {
  const timeOffset = props.S?.schedule?.time_offset ?? 0;
  const events = Object.entries(props.S ?? {}).filter(
    (entry) => entry[0] !== "schedule",
  );

  return e(
    "div",
    {
      key: "content",
      style: {
        display: "flex",
        gap: "4px",
      },
    },
    e(
      "div",
      {
        style: {
          background: "black",
          border: "2px double gray",
          padding: "4px",
        },
      },
      `${props.serverRegion ?? ""} ${props.serverIdentifier ?? ""}`,
      e("br"),
      getALServerTime(timeOffset) + (props.S?.schedule?.night ? "🌛" : "☀️"),
    ),
    ...events.map((event) =>
      e(
        "div",
        {
          key: event[0],
          style: {
            background: "black",
            border: "2px double gray",
            padding: "4px",
          },
        },
        event[0],
        e("br"),
        event[1]?.live
          ? "live"
          : event[1]?.event
            ? getTimeUntil(event[1].event)
            : "",
      ),
    ),
  );
}
