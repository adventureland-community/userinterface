import { getReact, e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { itemContainer } from "../../host/icons";
import {
  itemInstanceHtml,
  itemIconHtml,
  itemInstanceLabel,
  itemSkin,
  stampNativeItemTitle,
} from "../../lib/gameIcon";
import { GEAR_SLOT_SIZE } from "../chrome/gearSlotCell";
import { TRADE_SLOT_CELL } from "../../lib/frameSizes";
import { showGearSlotContextMenu } from "../gear/gearSlotContextMenu";
import { handleBagDragOverGearSlot, handleBagDropOnTradeSlot } from "../gear/gearSlotDragDrop";
import {
  canAffordListing,
  findBagMatchForBuyOrder,
  formatTradeGold,
  isGiveawayListing,
  isInTradeRange,
  isJoinedGiveaway,
} from "../../lib/tradeHelpers";
import { writeTradeDragPayload } from "../bag/tradeDragPayload";
import { handleTradeSlotClick } from "./tradeSlotActions";

const TRADE_SHADE = { shade: "shade_gold", s_op: 0.2 };
const EMPTY_BCOLOR = "#292929";

/** Suppress click after HTML5 drag from a trade listing cell. */
let tradeListingDragActive = false;

function wrapContainerHtml(
  html: string,
  title?: string,
  options?: { stripNativeDrag?: boolean },
): any {
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
      if (options?.stripNativeDrag) {
        root.removeAttribute("draggable");
        root.removeAttribute("ondragstart");
        root.removeAttribute("ondrop");
        root.removeAttribute("ondragover");
      }
      const tip = title || root.getAttribute("title") || "";
      if (tip) stampNativeItemTitle(node, tip);
    },
  });
}

export type TradeSlotCellProps = {
  entity: EntityLike;
  observing?: EntityLike | null;
  slotName: string;
  slot: SlotLike | null | undefined;
  gearEditable?: boolean;
  allSlots?: Record<string, SlotLike | null | undefined>;
};

export function TradeSlotCell(props: TradeSlotCellProps): any {
  const React = getReact();
  const [bagDropHover, setBagDropHover] = React.useState(false);
  const { entity, observing, slotName, slot, gearEditable, allSlots } = props;
  const obs = observing || window.observing;
  const filled = !!(slot && slot.name);
  const foreign = !gearEditable;
  const editable = !!gearEditable;
  const inRange = !foreign || isInTradeRange(entity, obs);
  const bagMatch =
    foreign && filled && slot?.b
      ? findBagMatchForBuyOrder(slot, obs?.items)
      : null;
  const canBuy =
    foreign && filled && slot && !slot.b && !isGiveawayListing(slot) && inRange;
  const canFulfill = foreign && filled && !!slot?.b && !!bagMatch && inRange;
  const canJoinGiveaway =
    foreign &&
    filled &&
    isGiveawayListing(slot) &&
    !isJoinedGiveaway(slot, obs) &&
    inRange;
  const canAfford =
    canBuy &&
    slot &&
    (obs?.gold == null ||
      canAffordListing(slot, slot.q && slot.q > 0 ? slot.q : 1, obs.gold));
  const disabled =
    foreign && filled && !canBuy && !canFulfill && !canJoinGiveaway;

  const skin =
    (slot && slot.skin) || (slot && slot.name ? itemSkin(slot.name) : undefined);
  let content: any = null;

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
    content = html
      ? wrapContainerHtml(
          html,
          itemInstanceLabel(slot.name, { p: slot.p, level: slot.level }),
          { stripNativeDrag: editable && filled },
        )
      : wrapContainerHtml(
          itemIconHtml(slot.name, {
            skin,
            size: GEAR_SLOT_SIZE,
            level: slot.level,
            p: slot.p,
          }),
        );
  } else {
    let html = "";
    try {
      html =
        itemContainer({
          size: GEAR_SLOT_SIZE,
          shade: TRADE_SHADE.shade,
          s_op: TRADE_SHADE.s_op,
          slot: slotName,
          bcolor: EMPTY_BCOLOR,
          draggable: false,
        }) || "";
    } catch {
      html = "";
    }
    content = html
      ? wrapContainerHtml(html)
      : e("div", {
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

  const badge = filled
    ? slot!.b
      ? "B"
      : isGiveawayListing(slot)
        ? "G"
        : "S"
    : null;
  const priceLabel = slot?.price != null ? formatTradeGold(slot.price) : null;

  const tipParts: string[] = [];
  if (filled && slot?.name) {
    tipParts.push(itemInstanceLabel(slot.name, { p: slot.p, level: slot.level }));
    if (priceLabel) tipParts.push(`${slot.b ? "Buy" : "Sell"}: ${priceLabel}g`);
    if (foreign && !inRange) tipParts.push("(too far)");
    if (canFulfill) tipParts.push("Click to sell");
    else if (slot.b && bagMatch) tipParts.push("Buy order — matching item in bag");
    else if (slot.b) tipParts.push("Buy order — no match in bag");
    else if (canBuy && canAfford) tipParts.push("Click to buy");
    else if (canJoinGiveaway) tipParts.push("Click to join giveaway");
    else if (disabled) tipParts.push("(unavailable)");
    if (editable) tipParts.push("Drag to bag to delist");
    tipParts.push("Shift+click: item info");
  } else if (editable) {
    tipParts.push("Click: wishlist · drag bag item to list · Shift+drag: giveaway");
  }

  return e(
    "div",
    {
      key: slotName,
      className:
        "comm-trade-slot" +
        (filled ? " is-filled" : "") +
        (bagDropHover ? " is-bag-drop-target" : "") +
        (disabled ? " is-disabled" : ""),
      "data-slot": slotName,
      title: tipParts.join(" · "),
      draggable: editable && filled ? true : undefined,
      onDragStart:
        editable && filled
          ? (ev: DragEvent) => {
              if (!ev.dataTransfer) return;
              tradeListingDragActive = true;
              writeTradeDragPayload(ev.dataTransfer, slotName);
              ev.stopPropagation();
            }
          : undefined,
      onDragEnd:
        editable && filled
          ? () => {
              window.setTimeout(() => {
                tradeListingDragActive = false;
              }, 0);
            }
          : undefined,
      onPointerDown:
        editable && filled
          ? (ev: any) => {
              if (ev && typeof ev.stopPropagation === "function") {
                ev.stopPropagation();
              }
            }
          : editable
            ? (ev: any) => {
                if (ev && typeof ev.stopPropagation === "function") {
                  ev.stopPropagation();
                }
              }
            : undefined,
      onClick:
        editable
          ? (ev: any) => {
              if (editable && filled && tradeListingDragActive) return;
              handleTradeSlotClick(
                ev,
                entity,
                slotName,
                slot,
                !!gearEditable,
                obs,
              );
            }
          : undefined,
      onDragOver: editable
        ? (ev: any) => {
            setBagDropHover(
              handleBagDragOverGearSlot(ev, slotName, allSlots || null),
            );
          }
        : undefined,
      onDragLeave: editable ? () => setBagDropHover(false) : undefined,
      onDrop: editable
        ? (ev: any) => {
            setBagDropHover(false);
            handleBagDropOnTradeSlot(ev, slotName, allSlots || null);
          }
        : undefined,
      onContextMenu: (ev: any) => {
        if (ev && ev.shiftKey) return;
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        if (ev && typeof ev.stopPropagation === "function")
          ev.stopPropagation();
        showGearSlotContextMenu(
          ev.clientX ?? 0,
          ev.clientY ?? 0,
          slotName,
          filled,
          slot,
          { entity, gearEditable },
        );
      },
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1px",
        position: "relative",
        width: `${TRADE_SLOT_CELL}px`,
        maxWidth: `${TRADE_SLOT_CELL}px`,
        flex: `0 0 ${TRADE_SLOT_CELL}px`,
        boxSizing: "border-box",
        opacity: disabled ? 0.45 : 1,
        cursor: editable || filled ? "pointer" : "default",
        pointerEvents: "auto",
      },
    },
    e(
      "div",
      {
        style: {
          position: "relative",
          lineHeight: 0,
          boxShadow: bagDropHover ? "0 0 0 2px #6ab04c" : undefined,
        },
      },
      content,
      badge
        ? e(
            "div",
            {
              style: {
                position: "absolute",
                top: "-2px",
                left: "-2px",
                minWidth: "14px",
                height: "14px",
                padding: "0 3px",
                boxSizing: "border-box",
                background:
                  badge === "B"
                    ? "#1a3a4a"
                    : badge === "G"
                      ? "#3a1a4a"
                      : "#3a2a10",
                border:
                  badge === "B"
                    ? "1px solid #8fd4ff"
                    : badge === "G"
                      ? "1px solid #c98fff"
                      : "1px solid #ffd700",
                color: "#fff",
                fontSize: TYPE.microMin,
                lineHeight: "12px",
                textAlign: "center",
                ...PIXEL_TEXT,
                pointerEvents: "none",
              },
            },
            badge,
          )
        : null,
    ),
    priceLabel
      ? e(
          "div",
          {
            style: {
              fontSize: TYPE.microMin,
              color: slot!.b ? "#8fd4ff" : "#ffd700",
              width: "100%",
              maxWidth: `${TRADE_SLOT_CELL}px`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
              ...PIXEL_TEXT,
            },
            title: priceLabel,
          },
          priceLabel,
        )
      : null,
  );
}
