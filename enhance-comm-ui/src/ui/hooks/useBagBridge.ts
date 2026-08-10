import { getReact } from "../../host/react";
import {
  isInventoryOpen,
  subscribeInventory,
} from "../../host/inventory";
import { saveSettings, savePanelVisible } from "../../lib/settings";
import type { PanelVisibleMap } from "../../lib/settings";

export type BagBridgeState = {
  bagOpen: boolean;
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

  React.useEffect(() => {
    return subscribeInventory((open) => {
      setBagOpen(open);
      saveSettings({ bagOpenPreferred: open });
      if (open) {
        // Bag chrome button re-opens even if × hid the panel earlier.
        setPanelVisible((prev: PanelVisibleMap) => {
          if (prev.bag !== false) return prev;
          savePanelVisible("bag", true);
          return { ...prev, bag: true };
        });
      }
    });
  }, [setPanelVisible]);

  return { bagOpen };
}
