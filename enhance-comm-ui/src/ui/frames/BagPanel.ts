import { getReact, e } from "../../host/react";
import {
  attachInventoryToMount,
  isInventoryOpen,
  subscribeInventory,
} from "../../host/inventory";
import {
  BAG_FRAME_HEIGHT,
  BAG_FRAME_WIDTH,
} from "../../lib/frameSizes";

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
};

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
          fontSize: "15px",
          color: "gold",
          flexShrink: 0,
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
  const layoutEdit = !!props.layoutEdit;
  const showDummy = layoutEdit && !open;

  React.useEffect(() => {
    attachInventoryToMount(mountRef.current);
    const unsub = subscribeInventory((next) => setOpen(next));
    return () => {
      unsub();
      // Keep #bottomleftcorner alive across panel unmount (Bag close).
      const host = document.getElementById(HOST_ID);
      if (host) document.body.appendChild(host);
    };
  }, []);

  React.useLayoutEffect(() => {
    attachInventoryToMount(mountRef.current);
  });

  return e(
    "div",
    {
      className: "comm-bag-panel",
      style: {
        pointerEvents: "auto",
        width: showDummy ? BAG_FRAME_WIDTH : undefined,
        minWidth: showDummy
          ? BAG_FRAME_WIDTH
          : open
            ? BAG_FRAME_WIDTH
            : "120px",
        minHeight: showDummy
          ? BAG_FRAME_HEIGHT
          : open
            ? undefined
            : "8px",
        height: showDummy ? BAG_FRAME_HEIGHT : undefined,
        boxSizing: "border-box",
      },
    },
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
