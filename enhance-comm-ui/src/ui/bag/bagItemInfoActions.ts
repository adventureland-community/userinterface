import { openItem } from "../../host/infoDialog/api";
import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "./bagItemContextMenu";

/** Item info dialog for observers (stock on_rclick needs character and is N/A on /comm). */
function openObservingItemInfo(ctx: BagMenuContext): void {
  const obs = window.observing;
  if (!obs || !ctx.item) return;
  openItem(obs, `inv${ctx.fp.slot}`, ctx.item, { dialogOnly: true });
}

function buildBagItemInfoActions(ctx: BagMenuContext): BagMenuAction[] {
  return [
    {
      id: "item-info",
      label: "Item info…",
      title: "Open the Comm item info dialog for this slot (same as left-click).",
      separatorBefore: true,
      run: () => {
        openObservingItemInfo(ctx);
      },
    },
  ];
}

registerBagMenuProvider(buildBagItemInfoActions);
