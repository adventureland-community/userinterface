/**
 * Bag context menu — sell selected stack to an NPC vendor for gold.
 * Desktop RMB + phone long-press share showActionsMenu.
 */

import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { canEditObservedBag } from "./gearObserved";
import {
  canVendorSellItem,
  itemIsCash,
  itemIsLocked,
  vendorSellCommand,
} from "./vendorSellCommands";
import { vendorGoldPrice } from "../lib/tradeItemPricing";
import { formatTradeGold } from "../lib/tradeHelpers";
import { observingHasComputer } from "../lib/stationAccess";
import { showTradeQuantityDialog } from "../ui/trade/tradePromptDialog";

function confirmVendorSell(
  itemName: string,
  unitPrice: number,
  quantity: number,
): boolean {
  const total = unitPrice * quantity;
  return window.confirm(
    `Sell ${quantity}× ${itemName} to NPC vendor for ${formatTradeGold(total)} gold (${formatTradeGold(unitPrice)} each)?`,
  );
}

function buildVendorSellBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];
  if (!ctx.fp || !ctx.fp.name) return [];

  const unit = vendorGoldPrice(ctx.fp.name, ctx.fp.level);
  const locked = itemIsLocked(ctx.item);
  const cash = itemIsCash(ctx.fp.name);
  const sellable = canVendorSellItem(ctx.fp, ctx.item);

  let title = observingHasComputer()
    ? "sell() via computer — no travel"
    : "sell() on the observed character — smart_moves to the nearest G gold merchant if needed";
  if (locked) title = "Item is locked";
  else if (cash) title = "Shells / cash items cannot be sold for gold";
  else if (unit == null || !(unit > 0)) title = "No NPC vendor gold value";

  const goldHint =
    unit != null && unit > 0 ? ` (${formatTradeGold(unit)}g)` : "";

  return [
    {
      id: "vendor-sell",
      label: sellable
        ? `Sell to vendor${goldHint}…`
        : locked
          ? "Sell to vendor (locked)"
          : "Sell to vendor…",
      title,
      separatorBefore: true,
      disabled: !sellable,
      run: () => {
        if (!sellable || unit == null) return;
        const maxQ =
          ctx.fp.q != null && Number(ctx.fp.q) > 0
            ? Number(ctx.fp.q) | 0
            : 1;
        void (async () => {
          let q = 1;
          if (maxQ > 1) {
            const picked = await showTradeQuantityDialog({
              itemName: ctx.fp.name,
              maxQ,
              defaultQ: maxQ,
            });
            if (picked == null) return;
            q = picked;
          }
          if (!confirmVendorSell(ctx.fp.name, unit, q)) return;
          vendorSellCommand(ctx.fp, q);
        })();
      },
    },
  ];
}

registerBagMenuProvider(buildVendorSellBagMenuActions);
