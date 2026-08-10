import { getReact } from "../../host/react";
import {
  isBagRefreshing,
  isInventoryOpen,
  subscribeBagSync,
  subscribeInventory,
} from "../../host/inventory";
import { saveSettings, savePanelVisible } from "../../lib/settings";
import type { PanelVisibleMap } from "../../lib/settings";

export type BagBridgeState = {
  bagOpen: boolean;
  /** True while Refresh is reconnecting the observer (keep Bag panel mounted). */
  bagRefreshing: boolean;
};

/**
 * Bag open state from the inventory bridge.
 * Preferred open restore is owned by inventory.ts (not snap.now polling).
 */
export function useBagBridge(
  setPanelVisible: (
    updater: (prev: PanelVisibleMap) => PanelVisibleMap,
  ) => void,
): BagBridgeState {
  const React = getReact();
  const [bagOpen, setBagOpen] = React.useState(() => isInventoryOpen());
  const [bagRefreshing, setBagRefreshing] = React.useState(() =>
    isBagRefreshing(),
  );

  React.useEffect(() => {
    const unsubInv = subscribeInventory((open) => {
      setBagOpen(open);
      // Don't clobber preferred-open while Refresh closes the bag for reconnect.
      if (!isBagRefreshing()) {
        saveSettings({ bagOpenPreferred: open });
      }
      if (open) {
        // Bag chrome button re-opens even if × hid the panel earlier.
        setPanelVisible((prev: PanelVisibleMap) => {
          if (prev.bag !== false) return prev;
          savePanelVisible("bag", true);
          return { ...prev, bag: true };
        });
      }
    });
    const unsubSync = subscribeBagSync(() => {
      setBagRefreshing(isBagRefreshing());
    });
    return () => {
      unsubInv();
      unsubSync();
    };
  }, [setPanelVisible]);

  return { bagOpen, bagRefreshing };
}
