import { getEntitiesList } from "./al";
import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import {
  confirmTradeFulfill,
  formatTradeGold,
  scanBuyOrdersForBagItem,
} from "../lib/tradeHelpers";
import { tradeFulfillCommand } from "./tradeCommands";
import { showTradeQuantityDialog } from "../ui/trade/tradePromptDialog";

function buildFulfillBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  const obs = window.observing;
  const matches = scanBuyOrdersForBagItem(
    ctx.fp,
    getEntitiesList(),
    obs,
  );
  if (!matches.length) return [];

  const children: BagMenuAction[] = matches.map((m, i) => {
    const priceLabel = formatTradeGold(m.listing.price);
    return {
      id: `fulfill-${m.entityId}-${m.tradeSlot}-${i}`,
      label: `${m.entityName} — ${priceLabel}g`,
      title: `Sell to ${m.entityName}'s buy order on ${m.tradeSlot}`,
      run: () => {
        const maxQ = ctx.fp.q != null && ctx.fp.q > 0 ? ctx.fp.q : undefined;
        const cap =
          m.listing.q != null && m.listing.q > 0
            ? maxQ != null
              ? Math.min(maxQ, m.listing.q)
              : m.listing.q
            : maxQ ?? 9999;
        void (async () => {
          const q = await showTradeQuantityDialog({
            itemName: m.listing.name,
            maxQ: cap,
          });
          if (q == null) return;
          if (!confirmTradeFulfill(m.listing.name, m.listing.price, q)) return;
          tradeFulfillCommand(m.entityId, m.tradeSlot, m.listing.rid, q);
        })();
      },
    };
  });

  if (children.length === 1) {
    const only = children[0];
    return [
      {
        id: only.id,
        label: `Sell to buy order (${only.label})…`,
        title: only.title,
        separatorBefore: true,
        run: only.run,
      },
    ];
  }

  return [
    {
      id: "fulfill-buy-orders-submenu",
      label: "Sell to buy order…",
      title: "Fulfill a nearby player's buy order with this bag item",
      separatorBefore: true,
      children,
    },
  ];
}

registerBagMenuProvider(buildFulfillBagMenuActions);
