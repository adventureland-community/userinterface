/**
 * Phone server picker — show current realm (players + ping + events) and switch.
 */

import { e, getReact } from "../../../host/react";
import {
  averagePingMs,
  pingColor,
  pingSparkBars,
  readPingSamples,
  type PingSparkBar,
} from "../../../host/commChrome/pingHud";
import { selectServer } from "../../../host/commChrome/serverDropdown";
import {
  ensureServerEventsPolling,
  getServerEventBadges,
  type ServerEventBadge,
} from "../../../host/commChrome/serverEvents";
import { ensurePhoneNavCss } from "./phoneNavCss";

export type PhoneServerSheetProps = {
  open: boolean;
  onClose: () => void;
};

type ServerRow = {
  index: number;
  label: string;
  region: string;
  name: string;
  players: number;
  active: boolean;
  events: ServerEventBadge[];
};

function readServers(): {
  rows: ServerRow[];
  currentLabel: string;
  currentPlayers: number | null;
  pingMs: number | null;
  pingCss: string;
  pingBars: PingSparkBar[];
} {
  const servers = (window.X && window.X.servers) || [];
  const rows: ServerRow[] = [];
  let currentIndex = -1;
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    const active =
      window.server_region === server.region &&
      window.server_identifier === server.name;
    if (active) currentIndex = i;
    rows.push({
      index: i,
      label: String(server.region) + " " + String(server.name),
      region: String(server.region || ""),
      name: String(server.name || ""),
      players: Number(server.players) || 0,
      active,
      events: getServerEventBadges(server.region, server.name),
    });
  }
  let currentLabel = "";
  let currentPlayers: number | null = null;
  if (currentIndex >= 0) {
    currentLabel = rows[currentIndex].label;
    currentPlayers = rows[currentIndex].players;
  } else if (window.server_region) {
    currentLabel =
      String(window.server_region) +
      (window.server_identifier ? " " + String(window.server_identifier) : "");
  }
  const samples = readPingSamples();
  const avg = averagePingMs(samples);
  const pingMs = avg == null ? null : Math.round(avg);
  return {
    rows,
    currentLabel,
    currentPlayers,
    pingMs,
    pingCss: pingMs == null ? "#8ab4c9" : pingColor(pingMs),
    pingBars: pingSparkBars(samples),
  };
}

function eventChips(events: ServerEventBadge[], keyPrefix: string): any[] {
  const shown = events.slice(0, 6);
  const chips: any[] = [];
  for (let i = 0; i < shown.length; i++) {
    const ev = shown[i];
    chips.push(
      e(
        "span",
        {
          key: keyPrefix + "-" + ev.type,
          className:
            "ecu-phone-pick__event" + (ev.live ? " is-live" : ""),
          title: ev.type + (ev.live ? " live" : ""),
        },
        ev.type,
      ),
    );
  }
  if (events.length > shown.length) {
    chips.push(
      e(
        "span",
        {
          key: keyPrefix + "-more",
          className: "ecu-phone-pick__event ecu-phone-pick__event--more",
          title: events
            .slice(6)
            .map((b) => b.type)
            .join(", "),
        },
        "+" + String(events.length - shown.length),
      ),
    );
  }
  return chips;
}

export function PhoneServerSheet(props: PhoneServerSheetProps): any {
  const React = getReact();
  ensurePhoneNavCss();
  const sheetRef = React.useRef(null as HTMLDivElement | null);
  const dragStartY = React.useRef(0);
  const dragDy = React.useRef(0);
  const dragging = React.useRef(false);
  const [rows, setRows] = React.useState([] as ServerRow[]);
  const [currentLabel, setCurrentLabel] = React.useState("");
  const [currentPlayers, setCurrentPlayers] = React.useState(
    null as number | null,
  );
  const [pingMs, setPingMs] = React.useState(null as number | null);
  const [pingCss, setPingCss] = React.useState("#8ab4c9");
  const [pingBars, setPingBars] = React.useState([] as PingSparkBar[]);

  const onClose = props.onClose;

  React.useEffect(() => {
    if (!props.open) return;
    const refresh = () => {
      const snap = readServers();
      setRows(snap.rows);
      setCurrentLabel(snap.currentLabel);
      setCurrentPlayers(snap.currentPlayers);
      setPingMs(snap.pingMs);
      setPingCss(snap.pingCss);
      setPingBars(snap.pingBars);
    };
    // Start ALData poll if desktop chrome has not; do not steal its onUpdate.
    ensureServerEventsPolling();
    refresh();
    const id = window.setInterval(refresh, 500);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [props.open, onClose]);

  if (!props.open) return null;

  const resetDrag = () => {
    dragging.current = false;
    dragDy.current = 0;
    const el = sheetRef.current;
    if (el) {
      el.style.transform = "";
      el.style.transition = "";
    }
  };

  const onHandleTouchStart = (ev: TouchEvent) => {
    if (!ev.touches.length) return;
    dragging.current = true;
    dragStartY.current = ev.touches[0].clientY;
    dragDy.current = 0;
    const el = sheetRef.current;
    if (el) el.style.transition = "none";
  };

  const onHandleTouchMove = (ev: TouchEvent) => {
    if (!dragging.current || !ev.touches.length) return;
    const dy = Math.max(0, ev.touches[0].clientY - dragStartY.current);
    dragDy.current = dy;
    const el = sheetRef.current;
    if (el) el.style.transform = "translateY(" + dy + "px)";
    if (dy > 8) ev.preventDefault();
  };

  const onHandleTouchEnd = () => {
    if (!dragging.current) return;
    const dy = dragDy.current;
    if (dy > 90) {
      resetDrag();
      props.onClose();
      return;
    }
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "transform 0.18s ease";
      el.style.transform = "translateY(0)";
    }
    dragging.current = false;
    dragDy.current = 0;
  };

  const bannerMeta: string[] = [];
  if (currentPlayers != null) {
    bannerMeta.push(
      String(currentPlayers) +
        " player" +
        (currentPlayers === 1 ? "" : "s"),
    );
  }
  const sheetBarKids: any[] = [];
  for (let i = 0; i < pingBars.length; i++) {
    const bar = pingBars[i];
    sheetBarKids.push(
      e("span", {
        key: "pb" + i,
        className: "ecu-phone-pick__ping-bar",
        style: { height: bar.pct + "%", background: bar.color },
      }),
    );
  }
  const kids: any[] = [];
  kids.push(
    e(
      "div",
      {
        key: "cur",
        className: "ecu-phone-pick__banner",
        role: "status",
      },
      e(
        "div",
        { className: "ecu-phone-pick__banner-main" },
        e("strong", null, currentLabel ? "On " + currentLabel : "No server"),
        e(
          "span",
          { className: "ecu-phone-pick__banner-meta" },
          bannerMeta.length
            ? bannerMeta.join(" · ")
            : currentLabel
              ? "Tap another realm to reconnect there."
              : "Connect or pick a realm below.",
        ),
      ),
      pingBars.length || pingMs != null
        ? e(
            "span",
            {
              className: "ecu-phone-pick__ping",
              title:
                pingMs != null
                  ? "Avg ping " + pingMs + "ms"
                  : "Ping unavailable",
            },
            sheetBarKids.length
              ? e(
                  "span",
                  {
                    className: "ecu-phone-pick__ping-bars",
                    "aria-hidden": "true",
                  },
                  ...sheetBarKids,
                )
              : null,
            e(
              "span",
              {
                className: "ecu-phone-pick__ping-ms",
                style: { color: pingCss },
              },
              pingMs != null ? String(pingMs) + "ms" : "—",
            ),
          )
        : null,
    ),
  );

  kids.push(
    e("div", { key: "sec", className: "ecu-phone-sheet__sec" }, "Realms"),
  );

  if (!rows.length) {
    kids.push(
      e(
        "div",
        { key: "none", className: "ecu-phone-pick__empty" },
        "No servers online",
      ),
    );
  } else {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const playersTitle =
        String(row.players) +
        " player" +
        (row.players === 1 ? "" : "s") +
        " online";
      kids.push(
        e(
          "button",
          {
            key: "s-" + row.index,
            type: "button",
            className:
              "ecu-phone-pick__row ecu-phone-pick__row--server" +
              (row.active ? " is-on" : ""),
            onClick: () => {
              selectServer(row.index);
              props.onClose();
            },
          },
          e(
            "span",
            { className: "ecu-phone-pick__text" },
            e(
              "span",
              { className: "ecu-phone-pick__title-row" },
              e(
                "span",
                { className: "ecu-phone-pick__title" },
                row.label,
              ),
              row.active
                ? e(
                    "span",
                    { className: "ecu-phone-pick__badge" },
                    "current",
                  )
                : null,
            ),
            row.events.length
              ? e(
                  "span",
                  { className: "ecu-phone-pick__events" },
                  ...eventChips(row.events, "s" + row.index),
                )
              : null,
          ),
          e(
            "span",
            {
              className: "ecu-phone-pick__players",
              title: playersTitle,
            },
            e("span", { className: "ecu-phone-pick__players-n" }, String(row.players)),
            e("span", { className: "ecu-phone-pick__players-lbl" }, "online"),
          ),
        ),
      );
    }
  }

  return e(
    React.Fragment,
    null,
    e("button", {
      type: "button",
      className: "ecu-phone-sheet-scrim",
      "aria-label": "Dismiss",
      onClick: props.onClose,
    }),
    e(
      "div",
      {
        ref: sheetRef,
        className: "ecu-phone-sheet",
        role: "dialog",
        "aria-label": "Server",
      },
      e("div", {
        className: "ecu-phone-sheet__handle",
        onTouchStart: onHandleTouchStart,
        onTouchMove: onHandleTouchMove,
        onTouchEnd: onHandleTouchEnd,
        onTouchCancel: onHandleTouchEnd,
      }),
      e(
        "div",
        {
          className: "ecu-phone-sheet__hd",
          onTouchStart: onHandleTouchStart,
          onTouchMove: onHandleTouchMove,
          onTouchEnd: onHandleTouchEnd,
          onTouchCancel: onHandleTouchEnd,
        },
        e("h2", { className: "ecu-phone-sheet__title" }, "Server"),
        e(
          "button",
          {
            type: "button",
            className: "ecu-phone-sheet__done",
            onClick: props.onClose,
          },
          "Done",
        ),
      ),
      e(
        "div",
        {
          className: "ecu-phone-sheet__body",
          "data-ecu-tour": "phone-server-list",
        },
        ...kids,
      ),
    ),
  );
}
