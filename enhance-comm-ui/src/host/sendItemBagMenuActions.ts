import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { listNearbySendTargets, sendItemCommand } from "./sendItem";

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
    actions.push({
      id: `send-nearby-${t.id}`,
      label: `Send to ${t.name}${distLabel}`,
      title: "Trade send via send_item on the observed character (not mail)",
      separatorBefore: i === 0,
      run: () => {
        sendItemCommand(ctx.fp, t.name);
      },
    });
  }
  return actions;
}

registerBagMenuProvider(buildSendItemBagMenuActions);
