/**
 * Resolve / open ServerInfo chips from G + stock helpers — no per-event
 * allowlists. Mirrors stock `render_server` / `open_event_announcement` /
 * `emonster_click`.
 */

import { getG } from "../../host/al";
import type { GLike } from "../../host/globals";

export type ServerChipOpen =
  | { kind: "events_window" }
  | { kind: "emonster"; id: string }
  | { kind: "announcement"; id: string; modal: string; docsUrl: string }
  | { kind: "guide"; modal: string; docsUrl: string };

type EventDef = {
  type?: string;
  modal?: string;
};

function eventsTable(G?: GLike | null): Record<string, EventDef> {
  const src = G || getG();
  return (src?.events || {}) as Record<string, EventDef>;
}

function monstersTable(G?: GLike | null): Record<string, unknown> {
  const src = G || getG();
  return (src?.monsters || {}) as Record<string, unknown>;
}

function guideUrlFor(modal: string, fallback: string): string {
  const getUrl = (window as Window & { get_guide_url?: (id: string) => string })
    .get_guide_url;
  if (typeof getUrl === "function") {
    try {
      const url = getUrl(modal);
      if (typeof url === "string" && url) return url;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

export function openGuideDoc(modal: string, docsUrl: string): void {
  const openGuide = (
    window as Window & { open_guide?: (modal: string, url: string) => void }
  ).open_guide;
  const url = guideUrlFor(modal, docsUrl);
  if (typeof openGuide === "function") {
    openGuide(modal, url);
    return;
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* ignore */
  }
}

/**
 * Pick a stock-compatible action for a chip id (`halloween`, `mrpumpkin`,
 * `blessing`, …) from live `G` — new seasons/bosses work without ECU edits.
 */
export function resolveServerChipOpen(
  id: string,
  G?: GLike | null,
): ServerChipOpen {
  if (id === "blessing" || id === "blessed") {
    // Shells + realm blessings live under the Events & Home guide (stock directory).
    return {
      kind: "guide",
      modal: "events-and-home",
      docsUrl: "/docs/guide/events-and-home",
    };
  }
  if (id === "clock" || id === "schedule") {
    return { kind: "events_window" };
  }

  const events = eventsTable(G);
  const monsters = monstersTable(G);
  const def = events[id];

  if (def && typeof def.modal === "string" && def.modal) {
    return {
      kind: "announcement",
      id,
      modal: def.modal,
      docsUrl: "/docs/ref/" + def.modal,
    };
  }

  // Live world bosses / holiday monsters — stock uses emonster_click (engage / GO).
  if (monsters[id]) {
    return { kind: "emonster", id };
  }

  // Joinables / named G.events without modal (goobrawl, franky, …).
  if (def) {
    return {
      kind: "guide",
      modal: "event-" + id,
      docsUrl: "/docs/ref/event-" + id,
    };
  }

  // Unknown S key — still try the conventional event guide path.
  return {
    kind: "guide",
    modal: "event-" + id,
    docsUrl: "/docs/ref/event-" + id,
  };
}

/** Run the resolved open action against stock /hub globals. */
export function openServerChip(id: string, G?: GLike | null): void {
  const action = resolveServerChipOpen(id, G);
  const w = window as Window & {
    render_events_window?: () => void;
    open_event_announcement?: (key: string) => void;
    emonster_click?: (id: string) => void;
    add_log?: (message: string, color?: string) => void;
  };

  if (action.kind === "events_window") {
    if (typeof w.render_events_window === "function") {
      try {
        w.render_events_window();
      } catch (err) {
        console.error("[ecu] render_events_window", err);
      }
    }
    return;
  }

  if (action.kind === "emonster") {
    if (typeof w.emonster_click === "function") {
      w.emonster_click(action.id);
      return;
    }
    if (typeof w.add_log === "function") {
      w.add_log("Engage: " + action.id, "gray");
    }
    return;
  }

  if (action.kind === "announcement") {
    if (typeof w.open_event_announcement === "function") {
      try {
        w.open_event_announcement(action.id);
        return;
      } catch (err) {
        console.error("[ecu] open_event_announcement", err);
      }
    }
    openGuideDoc(action.modal, action.docsUrl);
    return;
  }

  openGuideDoc(action.modal, action.docsUrl);
}
