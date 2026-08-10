export type InfoDialogKind = "buff" | "item";

export const BUFF_DIALOG_ID = "ecu-buff-dialog";
export const ITEM_DIALOG_ID = "ecu-item-dialog";
export const STOCK_DIALOG_ID = "topleftcornerdialog";

/** Mark gear/buff clickables so capture-phase dismiss ignores the opening press. */
export const INFO_SOURCE_ATTR = "data-ecu-info-source";

export const CLOSE_CLASS = "ecu-dialog-close";
export const ADOPTED_CLASS = "ecu-info-dialog-adopted";

export const BUFF_SEL = "#" + BUFF_DIALOG_ID;
export const ITEM_SEL = "#" + ITEM_DIALOG_ID;
export const STOCK_SEL = "#" + STOCK_DIALOG_ID;

export function dialogIdFor(kind: InfoDialogKind): string {
  return kind === "buff" ? BUFF_DIALOG_ID : ITEM_DIALOG_ID;
}

export function panelAttrFor(kind: InfoDialogKind): string {
  return kind === "buff" ? "buffInfo" : "itemInfo";
}
