import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { equipCommand } from "./gearCommands";
import { canEditObservedBag } from "./gearObserved";
import {
  equipSlotsForItemName,
  formatGearSlotLabel,
} from "../lib/gearSlots";

function buildGearBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];

  const actions: BagMenuAction[] = [];
  const slots = equipSlotsForItemName(ctx.fp.name);
  if (!slots.length) return actions;

  if (slots.length === 1) {
    const gearSlot = slots[0];
    actions.push({
      id: "equip-auto",
      label: `Equip → ${formatGearSlotLabel(gearSlot)}`,
      title: "Runs equip() on the observed character via o:command",
      separatorBefore: true,
      run: () => {
        equipCommand(ctx.fp, gearSlot);
      },
    });
  } else {
    for (let i = 0; i < slots.length; i++) {
      const gearSlot = slots[i];
      actions.push({
        id: `equip-${gearSlot}`,
        label: `Equip → ${formatGearSlotLabel(gearSlot)}`,
        title: "Runs equip(num, slot) on the observed character",
        separatorBefore: i === 0,
        run: () => {
          equipCommand(ctx.fp, gearSlot);
        },
      });
    }
  }

  return actions;
}

registerBagMenuProvider(buildGearBagMenuActions);
