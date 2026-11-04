/**
 * Bank panel slot context menu — Withdraw / Inspect (shared action menu).
 */

import { canEditObservedBag } from "../../host/gearObserved";
import { bankRetrieveCommand } from "../../host/bank/bankCommands";
import type { ActionMenuAction } from "../chrome/actionMenuTypes";
import { showActionsMenu } from "../chrome/showActionsMenu";

export type BankSlotMenuItem = {
  name: string;
  level?: number;
  q?: number;
  p?: string | null;
};

export type ShowBankItemFn = (item: BankSlotMenuItem) => void;

/** Right-click / long-press menu on a vault stack. */
export function showBankSlotContextMenu(opts: {
  clientX: number;
  clientY: number;
  pack: string;
  index: number;
  item: BankSlotMenuItem;
  showItem: ShowBankItemFn;
}): void {
  const editable = canEditObservedBag();
  const actions: ActionMenuAction[] = [];

  if (editable) {
    actions.push({
      id: "bank-withdraw",
      label: "Withdraw to bag",
      title: "bank_retrieve — smart_moves to the vault floor if needed",
      run: () => {
        bankRetrieveCommand(opts.pack, opts.index, {
          expectName: opts.item.name,
        });
      },
    });
  } else {
    actions.push({
      id: "bank-observe-hint",
      label: "Observe a character to withdraw",
      disabled: true,
    });
  }

  actions.push({
    id: "bank-inspect",
    label: "Inspect",
    separatorBefore: true,
    run: () => {
      opts.showItem(opts.item);
    },
  });

  showActionsMenu({
    clientX: opts.clientX,
    clientY: opts.clientY,
    actions,
    title: opts.item.name || "Bank",
  });
}
