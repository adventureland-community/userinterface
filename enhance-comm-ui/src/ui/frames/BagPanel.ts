import { getReact, e } from "../../host/react";
import {
  attachInventoryToMount,
  ensureInventoryHost,
  getBagRefreshKind,
  getBagSyncedAt,
  getBagSyncedName,
  hasObservingInventorySnapshot,
  isBagGridStale,
  isBagRefreshing,
  isInventoryOpen,
  refreshInventoryItemTitles,
  refreshObservedInventory,
  subscribeBagSync,
  subscribeInventory,
} from "../../host/inventory";
import {
  isObserverCommandPending,
  subscribeObserverCommandPending,
} from "../../host/observerCommandPending";
import {
  BAG_FRAME_HEIGHT,
  BAG_FRAME_WIDTH,
  BAG_SYNC_CHROME_HEIGHT,
} from "../../lib/frameSizes";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { installBagDragDrop } from "../bag/bagDragDrop";
import { installBagItemContextMenu } from "../bag/bagItemContextMenu";
import "../bag/registerBagMenuProviders";

const HOST_ID = "bottomleftcorner";

/**
 * AL item_container outer footprint: content (40+2*3) + 2px border → 50
 * with box-sizing border-box, plus margin 2px each side → 54.
 */
const BAG_SLOT_BOX = 50;
const BAG_SLOT_MARGIN = 2;
const BAG_COLS = 7;
const BAG_ROWS = 6;

export type BagPanelProps = {
  /** When true and inventory is closed, reserve open-bag footprint. */
  layoutEdit?: boolean;
  /** Bumps when nearby buy orders change — re-stamps bag badges. */
  tradeRevision?: number;
};

/** Live relative age from bagSyncedAt (ticked while bag chrome is open). */
export function formatBagSyncedLabel(syncedAt: number, now: number): string {
  const ageSec = Math.floor(Math.max(0, now - syncedAt) / 1000);
  if (ageSec < 15) return "Synced just now";
  if (ageSec < 60) return `Synced ${ageSec}s ago`;
  if (ageSec < 3600) {
    const m = Math.max(1, Math.floor(ageSec / 60));
    return `Synced ${m}m ago`;
  }
  const h = Math.floor(ageSec / 3600);
  return `Synced ${h}h ago`;
}

function BagDummy(): any {
  const rows: any[] = [];
  for (let r = 0; r < BAG_ROWS; r++) {
    const cells: any[] = [];
    for (let c = 0; c < BAG_COLS; c++) {
      cells.push(
        e("div", {
          key: `b${r}-${c}`,
          style: {
            width: BAG_SLOT_BOX,
            height: BAG_SLOT_BOX,
            background: "#000",
            border: "2px solid #444",
            boxSizing: "border-box",
            margin: BAG_SLOT_MARGIN,
          },
        }),
      );
    }
    rows.push(
      e(
        "div",
        {
          key: `br${r}`,
          style: {
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            lineHeight: 0,
          },
        },
        ...cells,
      ),
    );
  }

  return e(
    "div",
    {
      className: "comm-bag-dummy",
      style: {
        width: BAG_FRAME_WIDTH,
        height: BAG_FRAME_HEIGHT,
        minWidth: BAG_FRAME_WIDTH,
        minHeight: BAG_FRAME_HEIGHT,
        boxSizing: "border-box",
        background: "black",
        border: "5px solid gray",
        padding: "2px",
        opacity: 0.78,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    },
    e(
      "div",
      {
        style: {
          padding: "4px",
          fontSize: TYPE.body,
          color: "gold",
          flexShrink: 0,
          ...PIXEL_TEXT,
        },
      },
      "GOLD: —",
    ),
    e("div", {
      style: {
        borderBottom: "5px solid gray",
        marginBottom: "2px",
        marginLeft: "-5px",
        marginRight: "-5px",
        flexShrink: 0,
      },
    }),
    e(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        },
      },
      ...rows,
    ),
  );
}

function BagSyncChrome(props: {
  syncedAt: number | null;
  syncedName: string | null;
  gridStale: boolean;
  refreshing: boolean;
  refreshKind: "server" | "local" | null;
  hasSnapshot: boolean;
  commandPending: boolean;
}): any {
  const React = getReact();
  const {
    syncedAt,
    syncedName,
    gridStale,
    refreshing,
    refreshKind,
    hasSnapshot,
    commandPending,
  } = props;
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (refreshing) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [refreshing]);

  let label = "No snapshot yet";
  let title =
    "Observer inventory arrives on observe welcome; none is loaded yet.";
  if (refreshing) {
    label = "Refreshing…";
    title =
      "Reconnecting observer for a fresh inventory snapshot from the server.";
  } else if (gridStale) {
    label = "Character changed";
    title =
      "Observed character changed; bag grid may still show the previous inventory until it redraws. Use Refresh if it stays stale.";
  } else if (syncedAt != null) {
    label = formatBagSyncedLabel(syncedAt, now);
    const who = syncedName ? ` for ${syncedName}` : "";
    title = `Observe welcome snapshot${who} (${new Date(syncedAt).toLocaleTimeString()}). Opening Bag does not refresh stock. Refresh reconnects the observer.`;
  } else if (hasSnapshot) {
    label = "Synced (age unknown)";
    title =
      "Inventory snapshot is loaded, but welcome time was not recorded (CommUI loaded after connect). Refresh for a fresh timestamp.";
  }
  if (!refreshing && !gridStale && refreshKind === "local") {
    title =
      "Last Refresh re-drew the local observing snapshot (no server round-trip).";
  } else if (!refreshing && !gridStale && refreshKind === "server") {
    title =
      "Last Refresh reconnected the observer and loaded a fresh welcome snapshot.";
  }

  return e(
    "div",
    {
      className: "comm-bag-sync-chrome",
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        height: `${BAG_SYNC_CHROME_HEIGHT}px`,
        boxSizing: "border-box",
        padding: "2px 4px",
        marginBottom: "2px",
        background: "rgba(12,12,12,0.92)",
        border: "1px solid #444",
        // Stretch with the inventory host — do not lock to BAG_FRAME_WIDTH
        // (fixed width + #bottomleftcorner borders wraps floats into 6+1 rows).
        width: "100%",
        minWidth: BAG_FRAME_WIDTH,
      },
    },
    e(
      "span",
      {
        title,
        style: {
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: TYPE.secondary,
          color: refreshing || gridStale || commandPending ? "#c9a227" : "#aaa",
          ...PIXEL_TEXT,
        },
      },
      label,
    ),
    e(
      "button",
      {
        type: "button",
        disabled: refreshing,
        title:
          "Reconnect observer for a fresh inventory snapshot. Stock /comm has no lighter inventory refresh — falls back to re-drawing the local snapshot if reconnect is unavailable.",
        onClick: (ev: any) => {
          ev.preventDefault();
          ev.stopPropagation();
          refreshObservedInventory();
        },
        style: {
          flexShrink: 0,
          cursor: refreshing ? "wait" : "pointer",
          fontSize: TYPE.secondary,
          lineHeight: "1.2",
          padding: "3px 8px",
          minHeight: "26px",
          margin: 0,
          border: "1px solid #666",
          background: refreshing ? "#1a1a1a" : "#222",
          color: refreshing ? "#777" : "#ddd",
          ...PIXEL_TEXT,
        },
      },
      "Refresh",
    ),
  );
}

/**
 * Layout host for the game inventory (#bottomleftcorner).
 * Content is filled by the patched render_inventory; this panel only
 * owns placement via PositionedPanel and reparents the DOM host.
 *
 * Dummy is a sibling of the mount so React never clears #bottomleftcorner.
 */
export function BagPanel(props: BagPanelProps): any {
  const React = getReact();
  const mountRef = React.useRef(null as HTMLDivElement | null);
  const [open, setOpen] = React.useState(() => isInventoryOpen());
  const [syncedAt, setSyncedAt] = React.useState(() => getBagSyncedAt());
  const [syncedName, setSyncedName] = React.useState(() => getBagSyncedName());
  const [gridStale, setGridStale] = React.useState(() => isBagGridStale());
  const [refreshing, setRefreshing] = React.useState(() => isBagRefreshing());
  const [refreshKind, setRefreshKind] = React.useState(() =>
    getBagRefreshKind(),
  );
  const [hasSnapshot, setHasSnapshot] = React.useState(() =>
    hasObservingInventorySnapshot(),
  );
  const layoutEdit = !!props.layoutEdit;
  const showDummy = layoutEdit && !open && !refreshing;
  const showChrome = open || refreshing;
  const [commandPending, setCommandPending] = React.useState(() =>
    isObserverCommandPending(),
  );

  React.useEffect(() => {
    attachInventoryToMount(mountRef.current);
    const unsubInv = subscribeInventory((next) => setOpen(next));
    const unsubSync = subscribeBagSync(() => {
      setSyncedAt(getBagSyncedAt());
      setSyncedName(getBagSyncedName());
      setGridStale(isBagGridStale());
      setRefreshing(isBagRefreshing());
      setRefreshKind(getBagRefreshKind());
      setHasSnapshot(hasObservingInventorySnapshot());
    });
    const unsubPending = subscribeObserverCommandPending(() => {
      setCommandPending(isObserverCommandPending());
    });
    const host = ensureInventoryHost();
    const unsubMenu = installBagItemContextMenu(host);
    const unsubDrag = installBagDragDrop(host);
    return () => {
      unsubInv();
      unsubSync();
      unsubPending();
      unsubMenu();
      unsubDrag();
      // Keep #bottomleftcorner alive across panel unmount (Bag close).
      const h = document.getElementById(HOST_ID);
      if (h) document.body.appendChild(h);
    };
  }, []);

  React.useLayoutEffect(() => {
    attachInventoryToMount(mountRef.current);
    if (open) refreshInventoryItemTitles();
  }, [open, refreshing, showDummy, props.tradeRevision]);

  return e(
    "div",
    {
      className: "comm-bag-panel",
      style: {
        // Dummy silhouette is click-through in layout edit (header drags).
        pointerEvents: showDummy ? "none" : "auto",
        // Open bag: minWidth only — explicit width shrinks #bottomleftcorner
        // under its gray border/padding and breaks the 7-col float grid.
        width: showDummy ? BAG_FRAME_WIDTH : undefined,
        minWidth: showDummy
          ? BAG_FRAME_WIDTH
          : showChrome
            ? BAG_FRAME_WIDTH
            : "120px",
        minHeight: showDummy
          ? BAG_FRAME_HEIGHT
          : showChrome
            ? undefined
            : "8px",
        height: showDummy ? BAG_FRAME_HEIGHT : undefined,
        boxSizing: "border-box",
      },
    },
    showChrome
      ? e(BagSyncChrome, {
          syncedAt,
          syncedName,
          gridStale,
          refreshing,
          refreshKind,
          hasSnapshot,
          commandPending,
        })
      : null,
    showDummy ? e(BagDummy) : null,
    e("div", {
      ref: mountRef,
      className: "comm-bag-mount",
      id: "comm-bag-mount",
      style: {
        // Keep mount in DOM for reparenting; hide while silhouette shows.
        display: showDummy ? "none" : "block",
        pointerEvents: "auto",
      },
    }),
  );
}
