/**
 * Stock AL item/condition info for /comm.
 *
 * Owned write path: `render_item("html")` → `#ecu-*-dialog` innerHTML.
 * Dismiss: capture-phase pointerdown, ignoring `[data-ecu-info-source]`.
 *
 * Prefer `info.openItem` / `info.openCondition` / `info.close`.
 */
export {
  info,
  openItem,
  openItemSlotInfo,
  openBuff,
  openCondition,
  closeInfo,
  closeBuffDialog,
  closeItemDialog,
  closeTopLeftDialog,
  closeAllInfoDialogs,
  isBuffDialogOpen,
  isItemDialogOpen,
  isTopLeftDialogOpen,
  adoptInfoDialog,
  adoptTopLeftDialog,
  ensureDialogHost,
  setInfoDialogLayoutEditing,
  subscribeInfoDialogChange,
  INFO_SOURCE_ATTR,
  BUFF_DIALOG_ID,
  ITEM_DIALOG_ID,
  type InfoDialogKind,
} from "./infoDialog/api";
