import "./globals";
import type { EntityLike, SlotLike } from "./globals";

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

export function setXTarget(entity: EntityLike | null | undefined): void {
  window.xtarget = entity || null;
}

export function slotSkin(slot: SlotLike | null | undefined): string | undefined {
  if (!slot || !slot.name) return undefined;
  const def = window.G?.items?.[slot.name];
  return slot.skin || def?.skin;
}
