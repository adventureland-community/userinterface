import { getReact, e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";
import {
  GearSlotCell,
  slotKey,
  slotsFingerprint,
} from "./gearSlotCell";

/** Classic AL `render_slots` body layout (4 cols × 4 rows). */
const GEAR_ROWS: string[][] = [
  ["earring1", "helmet", "earring2", "amulet"],
  ["mainhand", "chest", "offhand", "cape"],
  ["ring1", "pants", "ring2", "orb"],
  ["belt", "shoes", "gloves", "elixir"],
];

export type GearGridProps = {
  entity: EntityLike;
  /** When set, slots that differ from this entity show a Δ badge. */
  compareTo?: EntityLike | null;
  /** Right-click unequip / equip hints for the watched character. */
  gearEditable?: boolean;
};

export function GearGrid(props: GearGridProps): any {
  const React = getReact();
  const slots = props.entity.slots;
  if (!slots) return null;

  const entityId = props.entity.id != null ? String(props.entity.id) : "";
  const compareId =
    props.compareTo && props.compareTo.id != null
      ? String(props.compareTo.id)
      : "";
  const fp =
    entityId +
    "|" +
    compareId +
    "|" +
    slotsFingerprint(slots) +
    "|" +
    slotsFingerprint(props.compareTo && props.compareTo.slots);

  return React.useMemo(() => {
    const compareSlots = props.compareTo && props.compareTo.slots;

    const isDiff = (name: string): boolean => {
      if (!compareSlots) return false;
      return slotKey(slots[name]) !== slotKey(compareSlots[name]);
    };

    return e(
      "div",
      {
        className: "comm-gear-grid",
        "data-ecu-tour": "paperdoll-gear",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          pointerEvents: "auto",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            width: "fit-content",
          },
        },
        ...GEAR_ROWS.map((row, ri) =>
          e(
            "div",
            {
              key: `row${ri}`,
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: "2px",
              },
            },
            ...row.map((name) =>
              e(GearSlotCell, {
                key: name,
                entity: props.entity,
                slotName: name,
                slot: slots[name],
                diff: isDiff(name),
                gearEditable: props.gearEditable,
                allSlots: slots,
              }),
            ),
          ),
        ),
      ),
    );
  }, [fp]);
}
