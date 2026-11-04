/**
 * Long-press → bank slot action sheet (event delegation on panel root).
 */

import { isCommTouchUi } from "../../lib/commTouchUi";
import {
  showBankSlotContextMenu,
  type ShowBankItemFn,
} from "../frames/bankSlotContextMenu";
import { installLongPress } from "./pointerLongPress";

export const BANK_SLOT_ATTR = "data-ecu-bank-slot";

export function readBankSlotFromEl(el: HTMLElement): {
  pack: string;
  index: number;
  item: {
    name: string;
    level?: number;
    q?: number;
    p?: string | null;
    data?: string;
  };
} | null {
  const pack = el.getAttribute("data-pack");
  const indexRaw = el.getAttribute("data-index");
  const name = el.getAttribute("data-name");
  if (!pack || indexRaw == null || !name) return null;
  const index = parseInt(indexRaw, 10);
  if (!Number.isFinite(index)) return null;
  const levelRaw = el.getAttribute("data-level");
  const qRaw = el.getAttribute("data-q");
  const p = el.getAttribute("data-p");
  const data = el.getAttribute("data-data");
  return {
    pack,
    index,
    item: {
      name,
      level:
        levelRaw != null && levelRaw !== ""
          ? Number(levelRaw)
          : undefined,
      q: qRaw != null && qRaw !== "" ? Number(qRaw) : undefined,
      p: p != null && p !== "" ? p : null,
      data: data != null && data !== "" ? data : undefined,
    },
  };
}

/** Install long-press menus for `[data-ecu-bank-slot]` descendants. */
export function installBankTouchMenus(
  root: HTMLElement,
  showItem: ShowBankItemFn,
): () => void {
  if (!isCommTouchUi()) return () => {};
  return installLongPress(root, {
    onLongPress: (ev) => {
      const t = ev.target as HTMLElement | null;
      if (!t || typeof t.closest !== "function") return;
      const cell = t.closest("[" + BANK_SLOT_ATTR + "]") as HTMLElement | null;
      if (!cell || !root.contains(cell)) return;
      const parsed = readBankSlotFromEl(cell);
      if (!parsed) return;
      ev.preventDefault();
      ev.stopPropagation();
      showBankSlotContextMenu({
        clientX: ev.clientX,
        clientY: ev.clientY,
        pack: parsed.pack,
        index: parsed.index,
        item: parsed.item,
        showItem,
      });
    },
  });
}
