/**
 * Bag context menu — deposit selected stack into the account vault.
 */

import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { canEditObservedBag } from "./gearObserved";
import { bankStoreCommand } from "./bank/bankCommands";

function buildBankBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];
  if (!ctx.fp || !ctx.fp.name) return [];

  return [
    {
      id: "bank-store",
      label: "Deposit to bank…",
      title:
        "bank_store on the observed character — smart_moves to bank if needed",
      separatorBefore: true,
      run: () => {
        bankStoreCommand(ctx.fp);
      },
    },
  ];
}

registerBagMenuProvider(buildBankBagMenuActions);
