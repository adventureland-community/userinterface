import { itemContainer, slotSkin } from "../../host/icons";
import { e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";

const GEAR_SLOTS = [
  "helmet",
  "earring1",
  "earring2",
  "amulet",
  "chest",
  "cape",
  "pants",
  "shoes",
  "gloves",
  "belt",
  "ring1",
  "ring2",
  "orb",
  "mainhand",
  "offhand",
  "elixir",
];

function tradeSlotNames(slots: Record<string, SlotLike | null | undefined>): string[] {
  const names: string[] = [];
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("trade") === 0 && slots[keys[i]]) {
      names.push(keys[i]);
    }
  }
  names.sort((a, b) => {
    const na = parseInt(a.replace("trade", ""), 10) || 0;
    const nb = parseInt(b.replace("trade", ""), 10) || 0;
    return na - nb;
  });
  return names;
}

function SlotCell(props: {
  slotName: string;
  slot: SlotLike | null | undefined;
  showPrice?: boolean;
}): any {
  const { slotName, slot, showPrice } = props;
  const skin = slotSkin(slot);
  let content: any = e(
    "div",
    {
      style: {
        width: "40px",
        height: "40px",
        background: "#222",
        border: "1px solid #444",
        fontSize: "9px",
        color: "#666",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    slotName.replace("trade", "t"),
  );

  if (slot && skin) {
    const html = itemContainer({ skin, size: 40, slot: slotName }, slot);
    if (html) {
      content = e("div", {
        style: { display: "inline-block" },
        dangerouslySetInnerHTML: { __html: html },
      });
    } else {
      content = e(
        "div",
        {
          style: {
            width: "40px",
            height: "40px",
            background: "#333",
            border: "1px solid #666",
            fontSize: "9px",
            padding: "2px",
          },
          title: slot.name,
        },
        slot.name,
        slot.level != null ? ` +${slot.level}` : "",
      );
    }
  }

  return e(
    "div",
    {
      key: slotName,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
      },
    },
    content,
    showPrice && slot?.price != null
      ? e(
          "div",
          { style: { fontSize: "10px", color: "#ffd700" } },
          String(slot.price),
        )
      : null,
  );
}

export type GearGridProps = {
  entity: EntityLike;
};

export function GearGrid(props: GearGridProps): any {
  const slots = props.entity.slots;
  if (!slots) return null;

  const tradeNames = tradeSlotNames(slots);

  return e(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
    e(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
        },
      },
      ...GEAR_SLOTS.map((name) =>
        e(SlotCell, { key: name, slotName: name, slot: slots[name] }),
      ),
    ),
    tradeNames.length
      ? e(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              borderTop: "1px solid #444",
              paddingTop: "4px",
            },
          },
          ...tradeNames.map((name) =>
            e(SlotCell, {
              key: name,
              slotName: name,
              slot: slots[name],
              showPrice: true,
            }),
          ),
        )
      : null,
  );
}
