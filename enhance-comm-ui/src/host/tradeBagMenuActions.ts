import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { canEditObservedBag } from "./gearObserved";
import {
  giveawayCommand,
  tradeListCommand,
} from "./tradeCommands";
import {
  formatTradeSlotLabel,
  observingTradeSlotNames,
  tradeSlotIsEmpty,
} from "../lib/tradeSlots";
import {
  showGiveawayMinutesDialog,
  showTradePriceDialog,
  showTradeQuantityDialog,
} from "../ui/trade/tradePromptDialog";

async function runListOnTrade(
  ctx: BagMenuContext,
  tradeSlot: string,
): Promise<void> {
  const maxQ = ctx.fp.q != null && ctx.fp.q > 0 ? ctx.fp.q | 0 : 1;
  let q = maxQ;
  if (maxQ > 1) {
    const picked = await showTradeQuantityDialog({
      itemName: ctx.fp.name,
      maxQ,
    });
    if (picked == null) return;
    q = picked;
  }
  const obs = window.observing;
  const price = await showTradePriceDialog({
    mode: "list",
    itemName: ctx.fp.name,
    level: ctx.fp.level,
    p: ctx.fp.p,
    slots: obs?.slots,
  });
  if (price == null) return;
  tradeListCommand(ctx.fp, tradeSlot, price, q);
}

async function runGiveawayOnTrade(
  ctx: BagMenuContext,
  tradeSlot: string,
): Promise<void> {
  const maxQ = ctx.fp.q != null && ctx.fp.q > 0 ? ctx.fp.q | 0 : 1;
  let q = maxQ;
  if (maxQ > 1) {
    const picked = await showTradeQuantityDialog({
      itemName: ctx.fp.name,
      maxQ,
    });
    if (picked == null) return;
    q = picked;
  }
  const mins = await showGiveawayMinutesDialog();
  if (mins == null) return;
  giveawayCommand(tradeSlot, ctx.fp, mins, q);
}

function buildTradeBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];

  const obs = window.observing;
  const slots = obs && obs.slots ? obs.slots : null;
  const tradeNames = observingTradeSlotNames();
  if (!tradeNames.length) return [];

  const listChildren: BagMenuAction[] = [];
  const giveawayChildren: BagMenuAction[] = [];

  for (let i = 0; i < tradeNames.length; i++) {
    const tradeSlot = tradeNames[i];
    if (!tradeSlotIsEmpty(slots, tradeSlot)) continue;
    const label = formatTradeSlotLabel(tradeSlot);
    listChildren.push({
      id: `list-${tradeSlot}`,
      label,
      title: "Sell listing on this trade slot",
      run: () => {
        void runListOnTrade(ctx, tradeSlot);
      },
    });
    giveawayChildren.push({
      id: `giveaway-${tradeSlot}`,
      label,
      title: "Giveaway on this trade slot",
      run: () => {
        void runGiveawayOnTrade(ctx, tradeSlot);
      },
    });
  }

  if (!listChildren.length) return [];

  if (listChildren.length === 1) {
    const slotLabel = listChildren[0].label;
    return [
      {
        id: listChildren[0].id,
        label: `List on ${slotLabel}…`,
        title: listChildren[0].title,
        separatorBefore: true,
        run: listChildren[0].run,
      },
      {
        id: giveawayChildren[0].id,
        label: `Giveaway on ${slotLabel}…`,
        title: giveawayChildren[0].title,
        run: giveawayChildren[0].run,
      },
    ];
  }

  return [
    {
      id: "list-trade-submenu",
      label: "List on trade…",
      title: "Sell listing on an empty trade slot",
      separatorBefore: true,
      children: listChildren,
    },
    {
      id: "giveaway-trade-submenu",
      label: "Giveaway on trade…",
      title: "Free giveaway on an empty trade slot",
      children: giveawayChildren,
    },
  ];
}

registerBagMenuProvider(buildTradeBagMenuActions);
