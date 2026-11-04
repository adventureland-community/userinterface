import { getReact } from "../../host/react";
import {
  isBagRefreshing,
  isInventoryOpen,
  subscribeBagSync,
  subscribeInventory,
} from "../../host/inventory";
import { saveSettings } from "../../lib/settings";

export type BagBridgeState = {
  bagOpen: boolean;
  /** True while Refresh is reconnecting the observer (keep Bag panel mounted). */
  bagRefreshing: boolean;
};

/**
 * Bag open state from the inventory bridge.
 * Preferred open restore is owned by inventory.ts (not snap.now polling).
 *
 * `setBagVisible` should be the layout `setVisible("bag", …)` path so lite
 * phoneHudVisible stays in lockstep with stock inventory (dock "on" state).
 */
export function useBagBridge(
  setBagVisible: (visible: boolean) => void,
): BagBridgeState {
  const React = getReact();
  const [bagOpen, setBagOpen] = React.useState(() => isInventoryOpen());
  const [bagRefreshing, setBagRefreshing] = React.useState(() =>
    isBagRefreshing(),
  );
  const setBagVisibleRef = React.useRef(setBagVisible);
  setBagVisibleRef.current = setBagVisible;

  React.useEffect(() => {
    const unsubInv = subscribeInventory((open) => {
      setBagOpen(open);
      // Don't clobber preferred-open / panel while Refresh closes for reconnect.
      if (isBagRefreshing()) return;
      saveSettings({ bagOpenPreferred: open });
      setBagVisibleRef.current(open);
    });
    const unsubSync = subscribeBagSync(() => {
      setBagRefreshing(isBagRefreshing());
    });
    return () => {
      unsubInv();
      unsubSync();
    };
  }, []);

  return { bagOpen, bagRefreshing };
}
