import { getReact, e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";
import { info, INFO_SOURCE_ATTR } from "../../host/dialogHost";
import { itemContainer, setXTarget } from "../../host/icons";
import {
  itemInstanceHtml,
  itemIconHtml,
  itemInstanceLabel,
  itemSkin,
  stampNativeItemTitle,
} from "../../lib/gameIcon";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { showGearSlotContextMenu } from "../gear/gearSlotContextMenu";
import {
  handleBagDragOverGearSlot,
  handleBagDropOnGearSlot,
} from "../gear/gearSlotDragDrop";

/** Host shade skins from `render_slots` in adventureland `js/html.js`. */
const SLOT_SHADE: Record<string, { shade: string; s_op: number }> = {
  earring1: { shade: "shade_earring", s_op: 0.4 },
  helmet: { shade: "shade_helmet", s_op: 0.5 },
  earring2: { shade: "shade_earring", s_op: 0.4 },
  amulet: { shade: "shade_amulet", s_op: 0.4 },
  mainhand: { shade: "shade_mainhand", s_op: 0.36 },
  chest: { shade: "shade_chest", s_op: 0.4 },
  offhand: { shade: "shade_offhand", s_op: 0.4 },
  cape: { shade: "shade20_cape", s_op: 0.4 },
  ring1: { shade: "shade_ring", s_op: 0.4 },
  pants: { shade: "shade_pants", s_op: 0.5 },
  ring2: { shade: "shade_ring", s_op: 0.4 },
  orb: { shade: "shade20_orb", s_op: 0.4 },
  belt: { shade: "shade_belt", s_op: 0.4 },
  shoes: { shade: "shade_shoes", s_op: 0.5 },
  gloves: { shade: "shade_gloves", s_op: 0.4 },
  elixir: { shade: "shade20_elixir", s_op: 0.4 },
};

export const GEAR_SLOT_SIZE = 40;
/** AL empty-slot border when `mode.empty_borders_darker`. */
const EMPTY_BCOLOR = "#292929";

function shadeFor(slotName: string): { shade: string; s_op: number } {
  return SLOT_SHADE[slotName] || { shade: "placeholder", s_op: 0.4 };
}

function wrapContainerHtml(html: string, title?: string): any {
  return e("div", {
    style: {
      display: "inline-block",
      lineHeight: 0,
      fontSize: 0,
      pointerEvents: "auto",
    },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
      const tip = title || root.getAttribute("title") || "";
      if (tip) stampNativeItemTitle(node, tip);
    },
  });
}

export function slotKey(slot: SlotLike | null | undefined): string {
  if (!slot || !slot.name) return "";
  return `${slot.name}|${slot.level ?? ""}|${slot.q ?? ""}|${slot.price ?? ""}|${slot.skin ?? ""}`;
}

export function slotsFingerprint(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): string {
  if (!slots) return "";
  const keys = Object.keys(slots);
  keys.sort();
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    parts.push(`${k}:${slotKey(slots[k])}`);
  }
  return parts.join(";");
}

export type GearSlotCellProps = {
  entity: EntityLike;
  slotName: string;
  slot: SlotLike | null | undefined;
  showPrice?: boolean;
  diff?: boolean;
  gearEditable?: boolean;
  allSlots?: Record<string, SlotLike | null | undefined>;
};

export function GearSlotCell(props: GearSlotCellProps): any {
  const React = getReact();
  const [bagDropHover, setBagDropHover] = React.useState(false);
  const { entity, slotName, slot, diff, gearEditable, allSlots } = props;
  const skin =
    (slot && slot.skin) || (slot && slot.name ? itemSkin(slot.name) : undefined);
  const { shade, s_op } = shadeFor(slotName);
  let content: any = null;
  const clickable = !!(slot && slot.name);
  const itemTitle =
    clickable && slot?.name
      ? itemInstanceLabel(slot.name, { p: slot.p, level: slot.level })
      : undefined;

  if (slot && skin) {
    let html = "";
    try {
      html =
        itemInstanceHtml(slot.name, {
          skin,
          size: GEAR_SLOT_SIZE,
          level: slot.level,
          q: slot.q,
          p: slot.p,
        }) || "";
    } catch {
      html = "";
    }
    if (html) {
      content = wrapContainerHtml(html, itemTitle);
    } else if (slot.name) {
      content = wrapContainerHtml(
        itemIconHtml(slot.name, {
          skin,
          size: GEAR_SLOT_SIZE,
          level: slot.level,
          p: slot.p,
        }),
        itemTitle,
      );
    } else {
      content = e(
        "div",
        {
          style: {
            width: `${GEAR_SLOT_SIZE}px`,
            height: `${GEAR_SLOT_SIZE}px`,
            background: "#333",
            border: "1px solid #666",
            fontSize: TYPE.microMin,
            padding: "2px",
            ...PIXEL_TEXT,
          },
          title: slot.name,
        },
        slot.name,
        slot.level != null ? ` +${slot.level}` : "",
      );
    }
  } else {
    let html = "";
    try {
      html =
        itemContainer({
          size: GEAR_SLOT_SIZE,
          shade,
          s_op,
          slot: slotName,
          bcolor: EMPTY_BCOLOR,
          draggable: false,
        }) || "";
    } catch {
      html = "";
    }
    if (html) {
      content = wrapContainerHtml(html);
    } else {
      content = e("div", {
        style: {
          width: `${GEAR_SLOT_SIZE + 6}px`,
          height: `${GEAR_SLOT_SIZE + 6}px`,
          background: "#000",
          border: `2px solid ${EMPTY_BCOLOR}`,
          boxSizing: "border-box",
        },
        title: slotName,
      });
    }
  }

  const onSlotPress = clickable
    ? (ev: any) => {
        if (ev && typeof ev.stopPropagation === "function")
          ev.stopPropagation();
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        setXTarget(entity);
        info.openItem(entity, slotName, slot);
      }
    : undefined;

  return e(
    "div",
    {
      key: slotName,
      className:
        "comm-gear-slot" +
        (clickable ? " is-clickable" : "") +
        (bagDropHover ? " is-bag-drop-target" : ""),
      "data-slot": slotName,
      [INFO_SOURCE_ATTR]: clickable ? "" : undefined,
      title: clickable
        ? itemInstanceLabel(slot!.name!, {
            p: slot!.p,
            level: slot!.level,
          })
        : slotName,
      onPointerDown: onSlotPress,
      onMouseDown: clickable
        ? (ev: any) => {
            if (ev && typeof ev.stopPropagation === "function")
              ev.stopPropagation();
          }
        : undefined,
      onDragOver: gearEditable
        ? (ev: any) => {
            setBagDropHover(
              handleBagDragOverGearSlot(ev, slotName, allSlots || null),
            );
          }
        : undefined,
      onDragLeave: gearEditable ? () => setBagDropHover(false) : undefined,
      onDrop: gearEditable
        ? (ev: any) => {
            setBagDropHover(false);
            handleBagDropOnGearSlot(ev, slotName);
          }
        : undefined,
      onContextMenu: gearEditable
        ? (ev: any) => {
            if (ev && ev.shiftKey) return;
            if (ev && typeof ev.preventDefault === "function")
              ev.preventDefault();
            if (ev && typeof ev.stopPropagation === "function")
              ev.stopPropagation();
            const cx = ev && ev.clientX != null ? ev.clientX : 0;
            const cy = ev && ev.clientY != null ? ev.clientY : 0;
            showGearSlotContextMenu(cx, cy, slotName, clickable, slot, {
              entity,
              gearEditable,
            });
          }
        : undefined,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        position: "relative",
        cursor: clickable ? "pointer" : "default",
        pointerEvents: "auto",
        outline: bagDropHover ? "2px solid #6ab04c" : undefined,
        outlineOffset: bagDropHover ? "1px" : undefined,
      },
    },
    content,
    diff
      ? e(
          "div",
          {
            title: "Equip differs from watched",
            style: {
              position: "absolute",
              top: "-2px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              boxSizing: "border-box",
              background: "#3a2a10",
              border: "1px solid #c9a227",
              color: "#ffe08a",
              fontSize: TYPE.microMin,
              lineHeight: "16px",
              textAlign: "center",
              ...PIXEL_TEXT,
              pointerEvents: "none",
            },
          },
          "Δ",
        )
      : null,
  );
}
