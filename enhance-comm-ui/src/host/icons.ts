import "./globals";
import type { EntityLike, SlotLike } from "./globals";

export type SetXTargetOpts = {
  /**
   * Set xtarget for stock dialogs (`condition_click` / `render_condition`)
   * without syncing CommUI paperdoll selection via `useSelectionFromXTarget`.
   */
  dialogOnly?: boolean;
};

export function itemContainer(item: any, actual?: any): string {
  if (typeof window.item_container !== "function") {
    return "";
  }
  return window.item_container(item, actual);
}

export function addTint(selector: string, args?: any): void {
  if (typeof window.add_tint === "function") {
    window.add_tint(selector, args);
  }
}

export function getTint(selector: string): { added?: boolean; [key: string]: any } | null {
  if (typeof window.get_tint === "function") {
    return window.get_tint(selector) || null;
  }
  return null;
}

/** Force skill/progress tints to re-bind after DOM remount (stale tint.added leaves height:0). */
export function rebindTint(selector: string): void {
  const tint = getTint(selector);
  if (tint) tint.added = false;
}

export function setXTarget(
  entity: EntityLike | null | undefined,
  opts?: SetXTargetOpts,
): void {
  window.xtarget = entity || null;
  (window as any).__ecuDialogOnlyXTarget = !!(opts && opts.dialogOnly && entity);
}

/** Open the host condition dialog (same as game UI `condition_click`). */
export function conditionClick(name: string): void {
  if (typeof window.condition_click === "function") {
    window.condition_click(name);
  }
}

/** Open the host gear-slot dialog (same as game UI `slot_click`). */
export function slotClick(name: string): void {
  if (typeof window.slot_click === "function") {
    window.slot_click(name);
  }
}

export function slotSkin(slot: SlotLike | null | undefined): string | undefined {
  if (!slot || !slot.name) return undefined;
  const def = window.G?.items?.[slot.name];
  return slot.skin || def?.skin;
}

/**
 * Monster portrait HTML via stock `sprite()` (entity/IID packs).
 * Do not use `item_container` — monster skins are not in `G.positions`.
 */
export function monsterSprite(
  mtype: string | undefined,
  opts?: { size?: number },
): string {
  if (!mtype || typeof window.sprite !== "function") return "";
  const size = opts?.size ?? 22;
  // `sprite` resolves `G.monsters[mtype].skin` (defaults to mtype at G build).
  return (
    window.sprite(mtype, {
      scale: size / 40,
      width: size,
      height: size,
      overflow: true,
    }) || ""
  );
}
