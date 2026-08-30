import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { canEditObservedBag } from "./gearObserved";
import {
  giveawayCommand,
  promptGiveawayMinutes,
  promptTradePrice,
  promptTradeQuantity,
  tradeListCommand,
} from "./tradeCommands";
import {
  formatTradeSlotLabel,
  observingTradeSlotNames,
  tradeSlotIsEmpty,
} from "../lib/tradeSlots";

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
        const price = promptTradePrice(ctx.fp.name);
        if (price == null) return;
        const maxQ = ctx.fp.q != null && ctx.fp.q > 0 ? ctx.fp.q : undefined;
        const q =
          maxQ != null && maxQ > 1
            ? promptTradeQuantity(maxQ, ctx.fp.name)
            : ctx.fp.q ?? 1;
        if (q == null) return;
        tradeListCommand(ctx.fp, tradeSlot, price, q);
      },
    });
    giveawayChildren.push({
      id: `giveaway-${tradeSlot}`,
      label,
      title: "Giveaway on this trade slot",
      run: () => {
        const mins = promptGiveawayMinutes();
        if (mins == null) return;
        const maxQ = ctx.fp.q != null && ctx.fp.q > 0 ? ctx.fp.q : undefined;
        const q =
          maxQ != null && maxQ > 1
            ? promptTradeQuantity(maxQ, ctx.fp.name)
            : ctx.fp.q ?? 1;
        if (q == null) return;
        giveawayCommand(tradeSlot, ctx.fp, mins, q);
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
