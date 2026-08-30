/**
 * Gear slot candidates for equip UI (mirrors stock can_equip_item roughly).
 */

import { getG } from "../host/al";
import { CHARACTER_SLOTS, type EquippedSlotName } from "./equippedProps";

const RING_SLOTS: EquippedSlotName[] = ["ring1", "ring2"];
const EARRING_SLOTS: EquippedSlotName[] = ["earring1", "earring2"];
const WEAPON_SLOTS: EquippedSlotName[] = ["mainhand", "offhand"];

const TYPE_SLOTS: Record<string, EquippedSlotName[]> = {
  helmet: ["helmet"],
  chest: ["chest"],
  pants: ["pants"],
  shoes: ["shoes"],
  gloves: ["gloves"],
  belt: ["belt"],
  amulet: ["amulet"],
  orb: ["orb"],
  cape: ["cape"],
  elixir: ["elixir"],
  ring: RING_SLOTS,
  earring: EARRING_SLOTS,
  weapon: WEAPON_SLOTS,
  shield: ["offhand"],
  source: ["offhand"],
  quiver: ["offhand"],
  misc_offhand: ["offhand"],
  tool: ["mainhand"],
};

/** Slots a bag item may be equipped into (UI hints — server validates). */
export function equipSlotsForItemName(itemName: string): EquippedSlotName[] {
  const G = getG();
  const def = G && G.items && G.items[itemName];
  if (!def || !def.type) return [];
  const type = String(def.type);
  const mapped = TYPE_SLOTS[type];
  if (mapped) return mapped.slice();
  if (CHARACTER_SLOTS.indexOf(type as EquippedSlotName) >= 0) {
    return [type as EquippedSlotName];
  }
  return [];
}

/** Whether `itemName` may be equipped into a specific gear slot (UI hint). */
export function canEquipItemToSlot(
  itemName: string,
  gearSlot: string,
): boolean {
  const slots = equipSlotsForItemName(itemName);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === gearSlot) return true;
  }
  return false;
}

export function formatGearSlotLabel(slot: string): string {
  switch (slot) {
    case "mainhand":
      return "Main hand";
    case "offhand":
      return "Off hand";
    case "ring1":
      return "Ring 1";
    case "ring2":
      return "Ring 2";
    case "earring1":
      return "Earring 1";
    case "earring2":
      return "Earring 2";
    default:
      return slot.charAt(0).toUpperCase() + slot.slice(1);
  }
}
