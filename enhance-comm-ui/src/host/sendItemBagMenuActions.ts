import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { listNearbySendTargets, sendItemCommand } from "./sendItem";
import { formatFreeInventorySpace } from "../lib/inventorySpace";
import { findEntityById } from "./al";
import type { EntityLike } from "./globals";

function receiverSpaceLabel(target: {
  name: string;
  id: string;
  freeInv?: number;
  isize?: number;
}): string {
  const ent = findEntityById(target.id);
  const label = formatFreeInventorySpace(
    ent ??
      ({
        id: target.id,
        esize: target.freeInv,
        isize: target.isize,
      } as EntityLike),
  );
  return label ? ` · bag ${label}` : "";
}

function buildSendItemBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  const actions: BagMenuAction[] = [];
  const nearby = listNearbySendTargets();

  if (nearby.length === 0) {
    actions.push({
      id: "send-nearby-none",
      label: "Send item to nearby (none in range)",
      title: "Trade send via send_item — requires a player within range",
      separatorBefore: true,
      disabled: true,
      run: () => {},
    });
    return actions;
  }

  for (let i = 0; i < nearby.length; i++) {
    const t = nearby[i];
    const distLabel = t.dist != null ? ` (${Math.round(t.dist)}px)` : "";
    const spaceLabel = receiverSpaceLabel(t);
    const noSpace = t.freeInv != null && t.freeInv <= 0;
    actions.push({
      id: `send-nearby-${t.id}`,
      label: `Send to ${t.name}${distLabel}${spaceLabel}`,
      title: noSpace
        ? "Receiver inventory appears full — send may fail"
        : "Trade send via send_item on the observed character (not mail)",
      separatorBefore: i === 0,
      disabled: noSpace,
      run: () => {
        sendItemCommand(ctx.fp, t.name);
      },
    });
  }
  return actions;
}

registerBagMenuProvider(buildSendItemBagMenuActions);
